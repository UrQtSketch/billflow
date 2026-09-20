const { getAuthUser, verifyBusinessAccess } = require('./_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('./_lib/db');
const { sendJson, sendError } = require('./_lib/response');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return sendError(res, 401, 'Unauthorized — Please log in');

  const businessId = req.query?.businessId || authUser.activeBusinessId;
  if (!businessId) return sendError(res, 400, 'Business ID is required');

  const hasAccess = await verifyBusinessAccess(authUser.userId, businessId);
  if (!hasAccess) return sendError(res, 403, 'Forbidden — Access denied');

  const pool = getPool();
  if (pool) await initSchema();
  const id = req.query?.id;
  const action = req.query?.action;

  // GET Customer History
  if (req.method === 'GET' && id && action === 'history') {
    try {
      if (pool) {
        const custRes = await query('SELECT * FROM customers WHERE id = $1 AND business_id = $2', [id, businessId]);
        if (!custRes || custRes.rows.length === 0) return sendError(res, 404, 'Customer not found');
        const customer = custRes.rows[0];

        const invsRes = await query('SELECT * FROM invoices WHERE business_id = $1 AND (customer_id = $2 OR LOWER(customer_name) = LOWER($3)) ORDER BY invoice_date DESC', [businessId, customer.id, customer.name]);
        const invoices = invsRes.rows || [];

        return sendJson(res, 200, {
          customer,
          invoices,
          stats: {
            invoiceCount: invoices.length,
            totalBilled: invoices.reduce((s, i) => s + parseFloat(i.grand_total || 0), 0),
            totalPaid: invoices.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0),
            totalOutstanding: invoices.reduce((s, i) => s + parseFloat(i.balance_due || 0), 0)
          }
        });
      } else {
        const customer = memoryStore.customers.find(c => c.id === id && c.business_id === businessId);
        if (!customer) return sendError(res, 404, 'Customer not found');
        const invoices = memoryStore.invoices.filter(i => i.business_id === businessId && (i.customer_id === customer.id || (i.customer_name && i.customer_name.toLowerCase() === customer.name.toLowerCase())));
        return sendJson(res, 200, {
          customer,
          invoices,
          stats: {
            invoiceCount: invoices.length,
            totalBilled: invoices.reduce((s, i) => s + (parseFloat(i.grand_total) || 0), 0),
            totalPaid: invoices.reduce((s, i) => s + (parseFloat(i.paid_amount) || 0), 0),
            totalOutstanding: invoices.reduce((s, i) => s + (parseFloat(i.balance_due) || 0), 0)
          }
        });
      }
    } catch (err) {
      return sendError(res, 500, 'Error retrieving customer history');
    }
  }

  // GET Customers list
  if (req.method === 'GET') {
    try {
      const search = (req.query?.search || '').trim().toLowerCase();
      if (pool) {
        let sql = 'SELECT * FROM customers WHERE business_id = $1';
        const params = [businessId];
        if (search) { params.push(`%${search}%`); sql += ` AND (LOWER(name) LIKE $2 OR LOWER(phone) LIKE $2 OR LOWER(email) LIKE $2)`; }
        sql += ' ORDER BY created_at DESC';
        const result = await query(sql, params);
        return sendJson(res, 200, { customers: result.rows || [] });
      } else {
        let customers = memoryStore.customers.filter(c => c.business_id === businessId);
        if (search) customers = customers.filter(c => (c.name && c.name.toLowerCase().includes(search)) || (c.phone && c.phone.toLowerCase().includes(search)) || (c.email && c.email.toLowerCase().includes(search)));
        return sendJson(res, 200, { customers });
      }
    } catch (err) {
      return sendError(res, 500, 'Error listing customers');
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

  // POST Create Customer
  if (req.method === 'POST') {
    try {
      const { name, phone, email, address } = body || {};
      if (!name || !name.trim()) return sendError(res, 400, 'Customer name is required');
      const cleanName = name.trim(), cleanPhone = phone || 'N/A', cleanEmail = email || '', cleanAddress = address || '';

      if (pool) {
        const ins = await query(
          'INSERT INTO customers (business_id, name, phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [businessId, cleanName, cleanPhone, cleanEmail, cleanAddress]
        );
        return sendJson(res, 201, { message: 'Customer created', customer: ins.rows[0] });
      } else {
        const cust = {
          id: 'cust_' + crypto.randomBytes(6).toString('hex'),
          business_id: businessId,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          address: cleanAddress,
          created_at: new Date().toISOString()
        };
        memoryStore.customers.push(cust);
        return sendJson(res, 201, { message: 'Customer created', customer: cust });
      }
    } catch (err) {
      return sendError(res, 500, 'Error creating customer');
    }
  }

  // PUT Update Customer
  if (req.method === 'PUT' && id) {
    try {
      const { name, phone, email, address } = body || {};
      if (pool) {
        const upd = await query(
          `UPDATE customers
           SET name = COALESCE($1, name), phone = COALESCE($2, phone), email = COALESCE($3, email),
               address = COALESCE($4, address), updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 AND business_id = $6 RETURNING *`,
          [name, phone, email, address, id, businessId]
        );
        if (!upd || upd.rows.length === 0) return sendError(res, 404, 'Customer not found');
        return sendJson(res, 200, { message: 'Customer updated', customer: upd.rows[0] });
      } else {
        const c = memoryStore.customers.find(cust => cust.id === id && cust.business_id === businessId);
        if (!c) return sendError(res, 404, 'Customer not found');
        if (name !== undefined) c.name = name;
        if (phone !== undefined) c.phone = phone;
        if (email !== undefined) c.email = email;
        if (address !== undefined) c.address = address;
        return sendJson(res, 200, { message: 'Customer updated', customer: c });
      }
    } catch (err) {
      return sendError(res, 500, 'Error updating customer');
    }
  }

  // DELETE Customer
  if (req.method === 'DELETE' && id) {
    try {
      if (pool) {
        const del = await query('DELETE FROM customers WHERE id = $1 AND business_id = $2 RETURNING id', [id, businessId]);
        if (!del || del.rows.length === 0) return sendError(res, 404, 'Customer not found');
        return sendJson(res, 200, { message: 'Customer deleted', id });
      } else {
        const idx = memoryStore.customers.findIndex(cust => cust.id === id && cust.business_id === businessId);
        if (idx === -1) return sendError(res, 404, 'Customer not found');
        memoryStore.customers.splice(idx, 1);
        return sendJson(res, 200, { message: 'Customer deleted', id });
      }
    } catch (err) {
      return sendError(res, 500, 'Error deleting customer');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
