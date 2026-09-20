const { getAuthUser, verifyBusinessAccess } = require('../_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('../_lib/db');
const { sendJson, sendError } = require('../_lib/response');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return sendError(res, 401, 'Unauthorized — Please log in');
  }

  const businessId = req.query?.businessId || authUser.activeBusinessId;
  if (!businessId) {
    return sendError(res, 400, 'Business ID is required');
  }

  const hasAccess = await verifyBusinessAccess(authUser.userId, businessId);
  if (!hasAccess) {
    return sendError(res, 403, 'Forbidden — Access denied to this business');
  }

  const pool = getPool();
  if (pool) await initSchema();

  if (req.method === 'GET') {
    try {
      const search = (req.query?.search || '').trim().toLowerCase();
      const status = (req.query?.status || '').trim();

      if (pool) {
        let sql = `
          SELECT i.*, 
                 COALESCE(json_agg(json_build_object(
                   'id', it.id,
                   'productId', it.product_id,
                   'name', it.name,
                   'sku', it.sku,
                   'qty', it.qty,
                   'price', it.price,
                   'total', it.total
                 )) FILTER (WHERE it.id IS NOT NULL), '[]') as items
          FROM invoices i
          LEFT JOIN invoice_items it ON i.id = it.invoice_id
          WHERE i.business_id = $1
        `;
        const params = [businessId];

        if (status && status !== 'all') {
          params.push(status);
          sql += ` AND i.payment_status = $${params.length}`;
        }
        if (search) {
          params.push(`%${search}%`);
          sql += ` AND (LOWER(i.invoice_number) LIKE $${params.length} OR LOWER(i.customer_name) LIKE $${params.length})`;
        }

        sql += ' GROUP BY i.id ORDER BY i.invoice_date DESC, i.created_at DESC';
        const result = await query(sql, params);
        return sendJson(res, 200, { invoices: result.rows || [] });
      } else {
        let invoices = memoryStore.invoices.filter(i => i.business_id === businessId);
        if (status && status !== 'all') {
          invoices = invoices.filter(i => i.payment_status === status);
        }
        if (search) {
          invoices = invoices.filter(i =>
            (i.invoice_number && i.invoice_number.toLowerCase().includes(search)) ||
            (i.customer_name && i.customer_name.toLowerCase().includes(search))
          );
        }
        return sendJson(res, 200, { invoices });
      }
    } catch (err) {
      console.error('List Invoices Error:', err);
      return sendError(res, 500, 'Error retrieving invoices');
    }
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      if (!body && req.readable) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
      }

      const {
        invoiceNumber, customerId, customerName, customerPhone, customerEmail, customerAddress,
        date, dueDate, items, discountType, discountValue, taxRate, paymentMethod, paymentStatus, paidAmount, notes
      } = body || {};

      if (!customerName || !customerName.trim()) {
        return sendError(res, 400, 'Customer name is required');
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendError(res, 400, 'At least one line item is required');
      }

      // Authoritative financial calculations
      let subtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        const qty = parseInt(item.qty, 10);
        const price = parseFloat(item.price);
        if (isNaN(qty) || qty < 1) {
          return sendError(res, 400, 'All item quantities must be positive whole numbers (minimum 1)');
        }
        if (isNaN(price) || price < 0) {
          return sendError(res, 400, 'Item price cannot be negative');
        }
        const itemTotal = Math.round(qty * price * 100) / 100;
        subtotal += itemTotal;
        validatedItems.push({
          id: item.id || ('it_' + crypto.randomBytes(4).toString('hex')),
          productId: item.productId || null,
          name: item.name || 'Unnamed Item',
          sku: item.sku || '',
          qty,
          price,
          total: itemTotal
        });
      }

      const cleanDiscType = discountType === 'fixed' ? 'fixed' : 'percent';
      const cleanDiscVal = Math.max(0, parseFloat(discountValue) || 0);
      let discountAmount = 0;
      if (cleanDiscType === 'percent') {
        discountAmount = Math.round((subtotal * Math.min(100, cleanDiscVal) / 100) * 100) / 100;
      } else {
        discountAmount = Math.min(subtotal, cleanDiscVal);
      }

      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const cleanTaxRate = Math.max(0, Math.min(100, parseFloat(taxRate) || 0));
      const taxAmount = Math.round((taxableAmount * cleanTaxRate / 100) * 100) / 100;
      const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

      let cleanStatus = paymentStatus || 'Pending';
      let cleanPaid = 0;
      if (cleanStatus === 'Paid') {
        cleanPaid = grandTotal;
      } else if (cleanStatus === 'Partial') {
        cleanPaid = Math.max(0, Math.min(grandTotal, parseFloat(paidAmount) || 0));
      } else if (cleanStatus === 'Draft') {
        cleanPaid = 0;
      } else {
        cleanStatus = 'Pending';
        cleanPaid = 0;
      }
      const balanceDue = Math.round(Math.max(0, grandTotal - cleanPaid) * 100) / 100;

      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Check duplicate invoice number in this business
          const dupRes = await client.query(
            'SELECT id FROM invoices WHERE business_id = $1 AND invoice_number = $2',
            [businessId, invoiceNumber]
          );
          if (dupRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return sendError(res, 409, `Invoice number "${invoiceNumber}" already exists in this business.`);
          }

          // Insert invoice
          const invRes = await client.query(
            `INSERT INTO invoices (
               business_id, customer_id, invoice_number, customer_name, customer_phone, customer_email, customer_address,
               invoice_date, due_date, subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount,
               grand_total, payment_method, payment_status, paid_amount, balance_due, notes
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
             ) RETURNING *`,
            [
              businessId, customerId || null, invoiceNumber, customerName, customerPhone || '', customerEmail || '', customerAddress || '',
              date || new Date().toISOString().split('T')[0], dueDate || null, subtotal, cleanDiscType, cleanDiscVal, discountAmount,
              cleanTaxRate, taxAmount, grandTotal, paymentMethod || 'Cash', cleanStatus, cleanPaid, balanceDue, notes || ''
            ]
          );
          const invoice = invRes.rows[0];

          // Insert line items & deduct stock atomically
          for (const it of validatedItems) {
            await client.query(
              'INSERT INTO invoice_items (invoice_id, product_id, name, sku, qty, price, total) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [invoice.id, it.productId, it.name, it.sku, it.qty, it.price, it.total]
            );

            if (it.productId && cleanStatus !== 'Draft') {
              await client.query(
                'UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2 AND business_id = $3 AND type = $4',
                [it.qty, it.productId, businessId, 'product']
              );
            }
          }

          // Advance next invoice number sequence
          await client.query(
            'UPDATE businesses SET next_number = next_number + 1 WHERE id = $1',
            [businessId]
          );

          await client.query('COMMIT');
          invoice.items = validatedItems;

          return sendJson(res, 201, { message: 'Invoice created successfully', invoice });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else {
        // Memory fallback
        const existingDup = memoryStore.invoices.find(i => i.business_id === businessId && i.invoice_number === invoiceNumber);
        if (existingDup) {
          return sendError(res, 409, `Invoice number "${invoiceNumber}" already exists in this business.`);
        }

        const invId = 'inv_' + crypto.randomBytes(6).toString('hex');
        const invoice = {
          id: invId,
          business_id: businessId,
          customer_id: customerId || null,
          invoice_number: invoiceNumber,
          customer_name: customerName,
          customer_phone: customerPhone || '',
          customer_email: customerEmail || '',
          customer_address: customerAddress || '',
          invoice_date: date || new Date().toISOString().split('T')[0],
          due_date: dueDate || null,
          subtotal,
          discount_type: cleanDiscType,
          discount_value: cleanDiscVal,
          discount_amount: discountAmount,
          tax_rate: cleanTaxRate,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          payment_method: paymentMethod || 'Cash',
          payment_status: cleanStatus,
          paid_amount: cleanPaid,
          balance_due: balanceDue,
          notes: notes || '',
          items: validatedItems,
          created_at: new Date().toISOString()
        };

        // Deduct product stock in memory
        if (cleanStatus !== 'Draft') {
          validatedItems.forEach(it => {
            if (it.productId) {
              const p = memoryStore.products.find(prod => prod.id === it.productId && prod.business_id === businessId);
              if (p && p.type === 'product') {
                p.stock = Math.max(0, (p.stock || 0) - it.qty);
              }
            }
          });
        }

        memoryStore.invoices.push(invoice);
        return sendJson(res, 201, { message: 'Invoice created successfully', invoice });
      }
    } catch (err) {
      console.error('Create Invoice Error:', err);
      return sendError(res, 500, 'Error creating invoice');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
