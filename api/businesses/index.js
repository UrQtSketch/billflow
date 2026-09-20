const { getAuthUser } = require('../_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('../_lib/db');
const { sendJson, sendError } = require('../_lib/response');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return sendError(res, 401, 'Unauthorized — Please log in');
  }

  const pool = getPool();
  if (pool) await initSchema();

  if (req.method === 'GET') {
    try {
      if (pool) {
        const result = await query(
          'SELECT id, name, owner_name, phone, address, gstin, invoice_prefix, next_number, currency, created_at FROM businesses WHERE owner_id = $1 ORDER BY created_at ASC',
          [authUser.userId]
        );
        return sendJson(res, 200, { businesses: result.rows || [] });
      } else {
        const businesses = memoryStore.businesses.filter(b => b.owner_id === authUser.userId);
        return sendJson(res, 200, { businesses });
      }
    } catch (err) {
      console.error('List Businesses Error:', err);
      return sendError(res, 500, 'Error listing businesses');
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

      const { name, ownerName, phone, address, gstin, invoicePrefix, nextNumber, currency } = body || {};

      if (!name || !name.trim()) {
        return sendError(res, 400, 'Business name is required');
      }

      const cleanName = name.trim();
      const cleanOwner = (ownerName && ownerName.trim()) || '';
      const cleanPrefix = invoicePrefix || 'INV-';
      const cleanNextNum = parseInt(nextNumber, 10) || 1001;
      const cleanCurrency = currency || '₹';

      if (pool) {
        const insertRes = await query(
          'INSERT INTO businesses (owner_id, name, owner_name, phone, address, gstin, invoice_prefix, next_number, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
          [authUser.userId, cleanName, cleanOwner, phone || '', address || '', gstin || '', cleanPrefix, cleanNextNum, cleanCurrency]
        );
        const business = insertRes.rows[0];
        return sendJson(res, 201, { message: 'Business created', business });
      } else {
        const bizId = 'biz_' + crypto.randomBytes(6).toString('hex');
        const business = {
          id: bizId,
          owner_id: authUser.userId,
          name: cleanName,
          owner_name: cleanOwner,
          phone: phone || '',
          address: address || '',
          gstin: gstin || '',
          invoice_prefix: cleanPrefix,
          next_number: cleanNextNum,
          currency: cleanCurrency,
          created_at: new Date().toISOString()
        };
        memoryStore.businesses.push(business);
        return sendJson(res, 201, { message: 'Business created', business });
      }
    } catch (err) {
      console.error('Create Business Error:', err);
      return sendError(res, 500, 'Error creating business');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
