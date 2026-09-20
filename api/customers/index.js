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

      if (pool) {
        let sql = 'SELECT * FROM customers WHERE business_id = $1';
        const params = [businessId];

        if (search) {
          params.push(`%${search}%`);
          sql += ` AND (LOWER(name) LIKE $2 OR LOWER(phone) LIKE $2 OR LOWER(email) LIKE $2)`;
        }

        sql += ' ORDER BY created_at DESC';
        const result = await query(sql, params);
        return sendJson(res, 200, { customers: result.rows || [] });
      } else {
        let customers = memoryStore.customers.filter(c => c.business_id === businessId);
        if (search) {
          customers = customers.filter(c =>
            (c.name && c.name.toLowerCase().includes(search)) ||
            (c.phone && c.phone.toLowerCase().includes(search)) ||
            (c.email && c.email.toLowerCase().includes(search))
          );
        }
        return sendJson(res, 200, { customers });
      }
    } catch (err) {
      console.error('List Customers Error:', err);
      return sendError(res, 500, 'Error retrieving customers');
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

      const { name, phone, email, address } = body || {};

      if (!name || !name.trim()) {
        return sendError(res, 400, 'Customer name is required');
      }

      const cleanName = name.trim();
      const cleanPhone = (phone && phone.trim()) || 'N/A';
      const cleanEmail = (email && email.trim()) || '';
      const cleanAddress = (address && address.trim()) || '';

      if (pool) {
        const insertRes = await query(
          'INSERT INTO customers (business_id, name, phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [businessId, cleanName, cleanPhone, cleanEmail, cleanAddress]
        );
        return sendJson(res, 201, { message: 'Customer created', customer: insertRes.rows[0] });
      } else {
        const custId = 'cust_' + crypto.randomBytes(6).toString('hex');
        const customer = {
          id: custId,
          business_id: businessId,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          address: cleanAddress,
          created_at: new Date().toISOString()
        };
        memoryStore.customers.push(customer);
        return sendJson(res, 201, { message: 'Customer created', customer });
      }
    } catch (err) {
      console.error('Create Customer Error:', err);
      return sendError(res, 500, 'Error creating customer');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
