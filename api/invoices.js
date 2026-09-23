const { getAuthUser, verifyBusinessAccess } = require('./_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('./_lib/db');
const { sendJson, sendError, getQueryParams } = require('./_lib/response');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendError(res, 401, 'Unauthorized — Please log in');

  const queryParams = getQueryParams(req);
  const businessId = queryParams.businessId || authUser.activeBusinessId;
  if (!businessId) return sendError(res, 400, 'Business ID is required');

  const hasAccess = await verifyBusinessAccess(authUser.userId, businessId, authUser);
  if (!hasAccess) return sendError(res, 403, 'Forbidden — Access denied');

  const pool = getPool();
  if (pool) await initSchema();
  const id = queryParams.id;

  // GET Single Invoice Detail
  if (req.method === 'GET' && id) {
    try {
      if (pool) {
        const invRes = await query('SELECT * FROM invoices WHERE id = $1 AND business_id = $2', [id, businessId]);
        if (!invRes || invRes.rows.length === 0) return sendError(res, 404, 'Invoice not found');
        const invoice = invRes.rows[0];
        const itemsRes = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoice.id]);
        invoice.items = itemsRes.rows || [];
        return sendJson(res, 200, { invoice });
      } else {
        const invoice = memoryStore.invoices.find(i => i.id === id && i.business_id === businessId);
        if (!invoice) return sendError(res, 404, 'Invoice not found');
        return sendJson(res, 200, { invoice });
      }
    } catch (err) {
      return sendError(res, 500, 'Error retrieving invoice');
    }
  }

  // GET Invoices List
  if (req.method === 'GET') {
    try {
      const search = (req.query?.search || '').trim().toLowerCase();
      const status = (req.query?.status || '').trim();

      if (pool) {
        let sql = `
          SELECT i.*, 
                 COALESCE(json_agg(json_build_object(
                   'id', it.id, 'productId', it.product_id, 'name', it.name,
                   'sku', it.sku, 'qty', it.qty, 'price', it.price, 'total', it.total
                 )) FILTER (WHERE it.id IS NOT NULL), '[]') as items
          FROM invoices i
          LEFT JOIN invoice_items it ON i.id = it.invoice_id
          WHERE i.business_id = $1
        `;
        const params = [businessId];
        if (status && status !== 'all') { params.push(status); sql += ` AND i.payment_status = $${params.length}`; }
        if (search) { params.push(`%${search}%`); sql += ` AND (LOWER(i.invoice_number) LIKE $${params.length} OR LOWER(i.customer_name) LIKE $${params.length})`; }
        sql += ' GROUP BY i.id ORDER BY i.invoice_date DESC, i.created_at DESC';
        const result = await query(sql, params);
        return sendJson(res, 200, { invoices: result.rows || [] });
      } else {
        let invoices = memoryStore.invoices.filter(i => i.business_id === businessId);
        if (status && status !== 'all') invoices = invoices.filter(i => i.payment_status === status);
        if (search) invoices = invoices.filter(i => (i.invoice_number && i.invoice_number.toLowerCase().includes(search)) || (i.customer_name && i.customer_name.toLowerCase().includes(search)));
        return sendJson(res, 200, { invoices });
      }
    } catch (err) {
      return sendError(res, 500, 'Error listing invoices');
    }
  }

  // Parse Body
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
  if (!body && req.readable) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
  }

  // POST Create Invoice + Stock Deduction
  if (req.method === 'POST') {
    try {
      const {
        invoiceNumber, customerId, customerName, customerPhone, customerEmail, customerAddress,
        customerGstin, customer_gstin,
        date, dueDate, items, discountType, discountValue, taxRate, paymentMethod, paymentStatus, paidAmount, notes
      } = body || {};

      if (!customerName || !customerName.trim()) return sendError(res, 400, 'Something is not good: Customer name is required (कस्टमर का नाम आवश्यक है)');
      if (!items || !Array.isArray(items) || items.length === 0) return sendError(res, 400, 'Something is not good: At least one line item is required (कम से कम 1 आइटम जरूरी है)');

      const cleanCustGstin = (customerGstin || customer_gstin || '').trim().toUpperCase();
      let subtotal = 0;
      const validatedItems = [];
      for (const item of items) {
        const qty = parseInt(item.qty, 10);
        const price = parseFloat(item.price);
        if (isNaN(qty) || qty < 1) return sendError(res, 400, `Something is not good: Item "${item.name || 'Item'}" must have a quantity of at least 1 (मात्रा कम से कम 1 होनी चाहिए)`);
        if (isNaN(price) || price < 0) return sendError(res, 400, `Something is not good: Item "${item.name || 'Item'}" has an invalid price`);
        if (price === 0) return sendError(res, 400, `Something is not good: Item "${item.name || 'Item'}" has price Rs. 0.00. Please set a valid selling price.`);
        const itemTotal = Math.round(qty * price * 100) / 100;
        subtotal += itemTotal;
        validatedItems.push({
          id: item.id || ('it_' + crypto.randomBytes(4).toString('hex')),
          productId: item.productId || null,
          name: item.name || 'Item',
          sku: item.sku || '',
          qty,
          price,
          total: itemTotal
        });
      }

      const cleanDiscType = discountType === 'fixed' ? 'fixed' : 'percent';
      const cleanDiscVal = Math.max(0, parseFloat(discountValue) || 0);
      const discountAmount = cleanDiscType === 'percent'
        ? Math.round((subtotal * Math.min(100, cleanDiscVal) / 100) * 100) / 100
        : Math.min(subtotal, cleanDiscVal);

      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const cleanTaxRate = Math.max(0, Math.min(100, parseFloat(taxRate) || 0));
      const taxAmount = Math.round((taxableAmount * cleanTaxRate / 100) * 100) / 100;
      const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

      let cleanStatus = paymentStatus || 'Pending';
      let cleanPaid = cleanStatus === 'Paid' ? grandTotal : (cleanStatus === 'Partial' ? Math.max(0, Math.min(grandTotal, parseFloat(paidAmount) || 0)) : 0);
      const balanceDue = Math.round(Math.max(0, grandTotal - cleanPaid) * 100) / 100;

      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const dupRes = await client.query('SELECT id FROM invoices WHERE business_id = $1 AND invoice_number = $2', [businessId, invoiceNumber]);
          if (dupRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return sendError(res, 409, `Invoice number "${invoiceNumber}" already exists.`);
          }

          const invRes = await client.query(
            `INSERT INTO invoices (
               business_id, customer_id, invoice_number, customer_name, customer_phone, customer_email, customer_address, customer_gstin,
               invoice_date, due_date, subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount,
               grand_total, payment_method, payment_status, paid_amount, balance_due, notes
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *`,
            [
              businessId, customerId || null, invoiceNumber, customerName, customerPhone || '', customerEmail || '', customerAddress || '', cleanCustGstin,
              date || new Date().toISOString().split('T')[0], dueDate || null, subtotal, cleanDiscType, cleanDiscVal, discountAmount,
              cleanTaxRate, taxAmount, grandTotal, paymentMethod || 'Cash', cleanStatus, cleanPaid, balanceDue, notes || ''
            ]
          );
          const invoice = invRes.rows[0];

          for (const it of validatedItems) {
            await client.query(
              'INSERT INTO invoice_items (invoice_id, product_id, name, sku, qty, price, total) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [invoice.id, it.productId, it.name, it.sku, it.qty, it.price, it.total]
            );
            if (it.productId && cleanStatus !== 'Draft') {
              await client.query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2 AND business_id = $3 AND type = $4', [it.qty, it.productId, businessId, 'product']);
            }
          }

          await client.query('UPDATE businesses SET next_number = next_number + 1 WHERE id = $1', [businessId]);
          await client.query('COMMIT');
          invoice.items = validatedItems;
          return sendJson(res, 201, { message: 'Invoice created', invoice });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else {
        const existingDup = memoryStore.invoices.find(i => i.business_id === businessId && i.invoice_number === invoiceNumber);
        if (existingDup) return sendError(res, 409, `Invoice number "${invoiceNumber}" already exists.`);

        const invoice = {
          id: 'inv_' + crypto.randomBytes(6).toString('hex'),
          business_id: businessId,
          customer_id: customerId || null,
          invoice_number: invoiceNumber,
          customer_name: customerName,
          customer_phone: customerPhone || '',
          customer_email: customerEmail || '',
          customer_address: customerAddress || '',
          customer_gstin: cleanCustGstin,
          customerGstin: cleanCustGstin,
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

        if (cleanStatus !== 'Draft') {
          validatedItems.forEach(it => {
            if (it.productId) {
              const p = memoryStore.products.find(prod => prod.id === it.productId && prod.business_id === businessId);
              if (p && p.type === 'product') p.stock = Math.max(0, (p.stock || 0) - it.qty);
            }
          });
        }
        memoryStore.invoices.push(invoice);
        return sendJson(res, 201, { message: 'Invoice created', invoice });
      }
    } catch (err) {
      return sendError(res, 500, 'Error creating invoice');
    }
  }

  // PUT Update Invoice
  if (req.method === 'PUT' && id) {
    try {
      const {
        customerId, customerName, customerPhone, customerEmail, customerAddress,
        customerGstin, customer_gstin,
        date, dueDate, items, discountType, discountValue, taxRate, paymentMethod, paymentStatus, paidAmount, notes
      } = body || {};

      if (!items || !Array.isArray(items) || items.length === 0) return sendError(res, 400, 'At least one line item is required');

      const cleanCustGstin = customerGstin !== undefined ? (customerGstin || '').trim().toUpperCase() : (customer_gstin !== undefined ? (customer_gstin || '').trim().toUpperCase() : undefined);
      let subtotal = 0;
      const validatedItems = [];
      for (const item of items) {
        const qty = parseInt(item.qty, 10);
        const price = parseFloat(item.price);
        if (isNaN(qty) || qty < 1) return sendError(res, 400, 'Quantities must be positive numbers');
        if (isNaN(price) || price < 0) return sendError(res, 400, 'Price cannot be negative');
        const itemTotal = Math.round(qty * price * 100) / 100;
        subtotal += itemTotal;
        validatedItems.push({
          id: item.id || ('it_' + crypto.randomBytes(4).toString('hex')),
          productId: item.productId || null,
          name: item.name || 'Item',
          sku: item.sku || '',
          qty,
          price,
          total: itemTotal
        });
      }

      const cleanDiscType = discountType === 'fixed' ? 'fixed' : 'percent';
      const cleanDiscVal = Math.max(0, parseFloat(discountValue) || 0);
      const discountAmount = cleanDiscType === 'percent'
        ? Math.round((subtotal * Math.min(100, cleanDiscVal) / 100) * 100) / 100
        : Math.min(subtotal, cleanDiscVal);

      const taxable = Math.max(0, subtotal - discountAmount);
      const cleanTaxRate = Math.max(0, Math.min(100, parseFloat(taxRate) || 0));
      const taxAmount = Math.round(((taxable * cleanTaxRate) / 100) * 100) / 100;
      const grandTotal = Math.round((taxable + taxAmount) * 100) / 100;

      const validStatuses = ['Paid', 'Pending', 'Partial', 'Draft'];
      const cleanStatus = validStatuses.includes(paymentStatus) ? paymentStatus : 'Pending';
      let cleanPaid = 0;
      if (cleanStatus === 'Paid') cleanPaid = grandTotal;
      else if (cleanStatus === 'Partial') cleanPaid = Math.max(0, Math.min(grandTotal, parseFloat(paidAmount) || 0));
      else cleanPaid = 0;
      const balanceDue = Math.max(0, Math.round((grandTotal - cleanPaid) * 100) / 100);

      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          // Check invoice exists
          const existRes = await client.query('SELECT * FROM invoices WHERE id = $1 AND business_id = $2', [id, businessId]);
          if (!existRes || existRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 404, 'Invoice not found');
          }

          // Restore old stock
          const oldItemsRes = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
          for (const oldIt of oldItemsRes.rows || []) {
            if (oldIt.product_id) {
              await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2 AND business_id = $3', [oldIt.qty, oldIt.product_id, businessId]);
            }
          }

          // Update invoice details
          const invRes = await client.query(
            `UPDATE invoices
             SET customer_id = $1, customer_name = COALESCE($2, customer_name), customer_phone = $3,
                 customer_email = $4, customer_address = $5, customer_gstin = COALESCE($6, customer_gstin), invoice_date = COALESCE($7, invoice_date),
                 due_date = $8, subtotal = $9, discount_type = $10, discount_value = $11,
                 discount_amount = $12, tax_rate = $13, tax_amount = $14, grand_total = $15,
                 payment_method = $16, payment_status = $17, paid_amount = $18, balance_due = $19,
                 notes = $20, updated_at = CURRENT_TIMESTAMP
             WHERE id = $21 AND business_id = $22 RETURNING *`,
            [
              customerId || null, customerName, customerPhone || '', customerEmail || '', customerAddress || '', cleanCustGstin,
              date, dueDate || null, subtotal, cleanDiscType, cleanDiscVal, discountAmount,
              cleanTaxRate, taxAmount, grandTotal, paymentMethod || 'Cash', cleanStatus, cleanPaid, balanceDue,
              notes || '', id, businessId
            ]
          );

          // Replace line items and deduct new stock
          await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
          for (const it of validatedItems) {
            await client.query(
              'INSERT INTO invoice_items (invoice_id, product_id, name, sku, qty, price, total) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [id, it.productId, it.name, it.sku, it.qty, it.price, it.total]
            );
            if (it.productId && cleanStatus !== 'Draft') {
              await client.query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2 AND business_id = $3 AND type = $4', [it.qty, it.productId, businessId, 'product']);
            }
          }

          await client.query('COMMIT');
          const updatedInv = invRes.rows[0];
          updatedInv.items = validatedItems;
          return sendJson(res, 200, { message: 'Invoice updated', invoice: updatedInv });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else {
        const idx = memoryStore.invoices.findIndex(i => i.id === id && i.business_id === businessId);
        if (idx === -1) return sendError(res, 404, 'Invoice not found');
        const oldInv = memoryStore.invoices[idx];

        // Restore old stock
        (oldInv.items || []).forEach(oldIt => {
          if (oldIt.productId) {
            const p = memoryStore.products.find(prod => prod.id === oldIt.productId && prod.business_id === businessId);
            if (p && p.type === 'product') p.stock = (p.stock || 0) + oldIt.qty;
          }
        });

        // Deduct new stock
        if (cleanStatus !== 'Draft') {
          validatedItems.forEach(it => {
            if (it.productId) {
              const p = memoryStore.products.find(prod => prod.id === it.productId && prod.business_id === businessId);
              if (p && p.type === 'product') p.stock = Math.max(0, (p.stock || 0) - it.qty);
            }
          });
        }

        const updatedInvoice = {
          ...oldInv,
          customer_id: customerId || null,
          customer_name: customerName || oldInv.customer_name,
          customer_phone: customerPhone || '',
          customer_email: customerEmail || '',
          customer_address: customerAddress || '',
          customer_gstin: cleanCustGstin !== undefined ? cleanCustGstin : oldInv.customer_gstin,
          customerGstin: cleanCustGstin !== undefined ? cleanCustGstin : (oldInv.customerGstin || oldInv.customer_gstin),
          invoice_date: date || oldInv.invoice_date,
          due_date: dueDate || null,
          subtotal,
          discount_type: cleanDiscType,
          discount_value: cleanDiscVal,
          discount_amount: discountAmount,
          tax_rate: cleanTaxRate,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          payment_method: paymentMethod || oldInv.payment_method,
          payment_status: cleanStatus,
          paid_amount: cleanPaid,
          balance_due: balanceDue,
          notes: notes !== undefined ? notes : oldInv.notes,
          items: validatedItems,
          updated_at: new Date().toISOString()
        };
        memoryStore.invoices[idx] = updatedInvoice;
        return sendJson(res, 200, { message: 'Invoice updated', invoice: updatedInvoice });
      }
    } catch (err) {
      return sendError(res, 500, 'Error updating invoice');
    }
  }

  // DELETE Invoice + Stock Restoration
  if (req.method === 'DELETE' && id) {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const itemsRes = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
          for (const it of itemsRes.rows || []) {
            if (it.product_id) {
              await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2 AND business_id = $3', [it.qty, it.product_id, businessId]);
            }
          }
          await client.query('DELETE FROM invoices WHERE id = $1 AND business_id = $2', [id, businessId]);
          await client.query('COMMIT');
          return sendJson(res, 200, { message: 'Invoice deleted and stock restored', id });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else {
        const idx = memoryStore.invoices.findIndex(i => i.id === id && i.business_id === businessId);
        if (idx === -1) return sendError(res, 404, 'Invoice not found');
        const inv = memoryStore.invoices[idx];
        (inv.items || []).forEach(it => {
          if (it.productId) {
            const p = memoryStore.products.find(prod => prod.id === it.productId && prod.business_id === businessId);
            if (p && p.type === 'product') p.stock = (p.stock || 0) + it.qty;
          }
        });
        memoryStore.invoices.splice(idx, 1);
        return sendJson(res, 200, { message: 'Invoice deleted and stock restored', id });
      }
    } catch (err) {
      return sendError(res, 500, 'Error deleting invoice');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
