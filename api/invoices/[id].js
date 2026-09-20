const { getAuthUser, verifyBusinessAccess } = require('../_lib/auth');
const { getPool, query, memoryStore } = require('../_lib/db');
const { sendJson, sendError } = require('../_lib/response');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return sendError(res, 401, 'Unauthorized — Please log in');
  }

  const { id } = req.query || {};
  const businessId = req.query?.businessId || authUser.activeBusinessId;

  if (!id || !businessId) {
    return sendError(res, 400, 'Invoice ID and Business ID are required');
  }

  const hasAccess = await verifyBusinessAccess(authUser.userId, businessId);
  if (!hasAccess) {
    return sendError(res, 403, 'Forbidden — Access denied to this business');
  }

  const pool = getPool();

  if (req.method === 'GET') {
    try {
      if (pool) {
        const invRes = await query('SELECT * FROM invoices WHERE id = $1 AND business_id = $2', [id, businessId]);
        if (!invRes || invRes.rows.length === 0) {
          return sendError(res, 404, 'Invoice not found or access denied');
        }
        const invoice = invRes.rows[0];
        const itemsRes = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoice.id]);
        invoice.items = itemsRes.rows || [];
        return sendJson(res, 200, { invoice });
      } else {
        const invoice = memoryStore.invoices.find(i => i.id === id && i.business_id === businessId);
        if (!invoice) {
          return sendError(res, 404, 'Invoice not found or access denied');
        }
        return sendJson(res, 200, { invoice });
      }
    } catch (err) {
      return sendError(res, 500, 'Error retrieving invoice');
    }
  }

  if (req.method === 'PUT') {
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
        customerId, customerName, customerPhone, customerEmail, customerAddress,
        date, dueDate, items, discountType, discountValue, taxRate, paymentMethod, paymentStatus, paidAmount, notes
      } = body || {};

      if (!customerName || !customerName.trim()) {
        return sendError(res, 400, 'Customer name is required');
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendError(res, 400, 'At least one line item is required');
      }

      // Calculations
      let subtotal = 0;
      const validatedItems = [];
      for (const item of items) {
        const qty = parseInt(item.qty, 10);
        const price = parseFloat(item.price);
        if (isNaN(qty) || qty < 1) {
          return sendError(res, 400, 'All item quantities must be positive whole numbers');
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

          // Fetch original invoice & items for stock delta adjustment
          const origRes = await client.query('SELECT * FROM invoices WHERE id = $1 AND business_id = $2', [id, businessId]);
          if (origRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 404, 'Invoice not found');
          }
          const origItemsRes = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
          const origItems = origItemsRes.rows || [];

          // Restore original stock
          for (const oldIt of origItems) {
            if (oldIt.product_id) {
              await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2 AND business_id = $3', [oldIt.qty, oldIt.product_id, businessId]);
            }
          }

          // Update invoice table
          const updRes = await client.query(
            `UPDATE invoices SET
               customer_id = $1, customer_name = $2, customer_phone = $3, customer_email = $4, customer_address = $5,
               invoice_date = $6, due_date = $7, subtotal = $8, discount_type = $9, discount_value = $10, discount_amount = $11,
               tax_rate = $12, tax_amount = $13, grand_total = $14, payment_method = $15, payment_status = $16, paid_amount = $17,
               balance_due = $18, notes = $19, updated_at = CURRENT_TIMESTAMP
             WHERE id = $20 AND business_id = $21 RETURNING *`,
            [
              customerId || null, customerName, customerPhone || '', customerEmail || '', customerAddress || '',
              date, dueDate || null, subtotal, cleanDiscType, cleanDiscVal, discountAmount,
              cleanTaxRate, taxAmount, grandTotal, paymentMethod || 'Cash', cleanStatus, cleanPaid,
              balanceDue, notes || '', id, businessId
            ]
          );
          const updatedInvoice = updRes.rows[0];

          // Delete old items and insert new items
          await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
          for (const newIt of validatedItems) {
            await client.query(
              'INSERT INTO invoice_items (invoice_id, product_id, name, sku, qty, price, total) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [id, newIt.productId, newIt.name, newIt.sku, newIt.qty, newIt.price, newIt.total]
            );

            // Deduct new stock
            if (newIt.productId && cleanStatus !== 'Draft') {
              await client.query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2 AND business_id = $3', [newIt.qty, newIt.productId, businessId]);
            }
          }

          await client.query('COMMIT');
          updatedInvoice.items = validatedItems;

          return sendJson(res, 200, { message: 'Invoice updated successfully', invoice: updatedInvoice });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else {
        const idx = memoryStore.invoices.findIndex(i => i.id === id && i.business_id === businessId);
        if (idx === -1) {
          return sendError(res, 404, 'Invoice not found');
        }

        const oldInv = memoryStore.invoices[idx];

        // Restore old stock
        (oldInv.items || []).forEach(oldIt => {
          if (oldIt.productId) {
            const p = memoryStore.products.find(prod => prod.id === oldIt.productId && prod.business_id === businessId);
            if (p && p.type === 'product') {
              p.stock = (p.stock || 0) + oldIt.qty;
            }
          }
        });

        // Deduct new stock
        if (cleanStatus !== 'Draft') {
          validatedItems.forEach(newIt => {
            if (newIt.productId) {
              const p = memoryStore.products.find(prod => prod.id === newIt.productId && prod.business_id === businessId);
              if (p && p.type === 'product') {
                p.stock = Math.max(0, (p.stock || 0) - newIt.qty);
              }
            }
          });
        }

        const updated = {
          ...oldInv,
          customer_id: customerId || null,
          customer_name: customerName,
          customer_phone: customerPhone || '',
          customer_email: customerEmail || '',
          customer_address: customerAddress || '',
          invoice_date: date,
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
          updated_at: new Date().toISOString()
        };

        memoryStore.invoices[idx] = updated;
        return sendJson(res, 200, { message: 'Invoice updated successfully', invoice: updated });
      }
    } catch (err) {
      console.error('Update Invoice Error:', err);
      return sendError(res, 500, 'Error updating invoice');
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const invRes = await client.query('SELECT * FROM invoices WHERE id = $1 AND business_id = $2', [id, businessId]);
          if (invRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 404, 'Invoice not found');
          }

          // Restore stock
          const itemsRes = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
          for (const it of itemsRes.rows || []) {
            if (it.product_id) {
              await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2 AND business_id = $3', [it.qty, it.product_id, businessId]);
            }
          }

          await client.query('DELETE FROM invoices WHERE id = $1', [id]);
          await client.query('COMMIT');

          return sendJson(res, 200, { message: 'Invoice deleted and stock restored successfully', id });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else {
        const idx = memoryStore.invoices.findIndex(i => i.id === id && i.business_id === businessId);
        if (idx === -1) {
          return sendError(res, 404, 'Invoice not found');
        }
        const inv = memoryStore.invoices[idx];

        // Restore stock in memory
        (inv.items || []).forEach(it => {
          if (it.productId) {
            const p = memoryStore.products.find(prod => prod.id === it.productId && prod.business_id === businessId);
            if (p && p.type === 'product') {
              p.stock = (p.stock || 0) + it.qty;
            }
          }
        });

        memoryStore.invoices.splice(idx, 1);
        return sendJson(res, 200, { message: 'Invoice deleted and stock restored successfully', id });
      }
    } catch (err) {
      console.error('Delete Invoice Error:', err);
      return sendError(res, 500, 'Error deleting invoice');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
