const { getAuthUser } = require('../_lib/auth');
const { getPool, query, memoryStore } = require('../_lib/db');
const { sendJson, sendError } = require('../_lib/response');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return sendError(res, 401, 'Unauthorized — Please log in');
  }

  const { id } = req.query || {};
  if (!id) {
    return sendError(res, 400, 'Business ID is required');
  }

  const pool = getPool();

  if (req.method === 'GET') {
    try {
      if (pool) {
        const result = await query(
          'SELECT * FROM businesses WHERE id = $1 AND owner_id = $2',
          [id, authUser.userId]
        );
        if (!result || result.rows.length === 0) {
          return sendError(res, 404, 'Business not found or access denied');
        }
        return sendJson(res, 200, { business: result.rows[0] });
      } else {
        const business = memoryStore.businesses.find(b => b.id === id && b.owner_id === authUser.userId);
        if (!business) {
          return sendError(res, 404, 'Business not found or access denied');
        }
        return sendJson(res, 200, { business });
      }
    } catch (err) {
      return sendError(res, 500, 'Error retrieving business');
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

      const { name, ownerName, phone, address, gstin, invoicePrefix, nextNumber, currency } = body || {};

      if (pool) {
        const updateRes = await query(
          `UPDATE businesses
           SET name = COALESCE($1, name),
               owner_name = COALESCE($2, owner_name),
               phone = COALESCE($3, phone),
               address = COALESCE($4, address),
               gstin = COALESCE($5, gstin),
               invoice_prefix = COALESCE($6, invoice_prefix),
               next_number = COALESCE($7, next_number),
               currency = COALESCE($8, currency),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $9 AND owner_id = $10
           RETURNING *`,
          [name, ownerName, phone, address, gstin, invoicePrefix, nextNumber, currency, id, authUser.userId]
        );

        if (!updateRes || updateRes.rows.length === 0) {
          return sendError(res, 404, 'Business not found or access denied');
        }

        return sendJson(res, 200, { message: 'Business settings updated', business: updateRes.rows[0] });
      } else {
        const idx = memoryStore.businesses.findIndex(b => b.id === id && b.owner_id === authUser.userId);
        if (idx === -1) {
          return sendError(res, 404, 'Business not found or access denied');
        }

        const b = memoryStore.businesses[idx];
        if (name !== undefined) b.name = name;
        if (ownerName !== undefined) b.owner_name = ownerName;
        if (phone !== undefined) b.phone = phone;
        if (address !== undefined) b.address = address;
        if (gstin !== undefined) b.gstin = gstin;
        if (invoicePrefix !== undefined) b.invoice_prefix = invoicePrefix;
        if (nextNumber !== undefined) b.next_number = nextNumber;
        if (currency !== undefined) b.currency = currency;
        b.updated_at = new Date().toISOString();

        return sendJson(res, 200, { message: 'Business settings updated', business: b });
      }
    } catch (err) {
      return sendError(res, 500, 'Error updating business settings');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
