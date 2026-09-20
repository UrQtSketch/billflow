const { getAuthUser, verifyBusinessAccess } = require('../_lib/auth');
const { getPool, query, memoryStore } = require('../_lib/db');
const { sendJson, sendError } = require('../_lib/response');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return sendError(res, 401, 'Unauthorized — Please log in');
  }

  const { id } = req.query || {};
  const businessId = req.query?.businessId || authUser.activeBusinessId;

  if (!id || !businessId) {
    return sendError(res, 400, 'Customer ID and Business ID are required');
  }

  const hasAccess = await verifyBusinessAccess(authUser.userId, businessId);
  if (!hasAccess) {
    return sendError(res, 403, 'Forbidden — Access denied to this business');
  }

  const pool = getPool();

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

      const { name, phone, email, address } = body || {};

      if (pool) {
        const updateRes = await query(
          `UPDATE customers
           SET name = COALESCE($1, name),
               phone = COALESCE($2, phone),
               email = COALESCE($3, email),
               address = COALESCE($4, address),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 AND business_id = $6
           RETURNING *`,
          [name, phone, email, address, id, businessId]
        );

        if (!updateRes || updateRes.rows.length === 0) {
          return sendError(res, 404, 'Customer not found or access denied');
        }

        return sendJson(res, 200, { message: 'Customer updated', customer: updateRes.rows[0] });
      } else {
        const idx = memoryStore.customers.findIndex(c => c.id === id && c.business_id === businessId);
        if (idx === -1) {
          return sendError(res, 404, 'Customer not found or access denied');
        }

        const c = memoryStore.customers[idx];
        if (name !== undefined) c.name = name;
        if (phone !== undefined) c.phone = phone;
        if (email !== undefined) c.email = email;
        if (address !== undefined) c.address = address;
        c.updated_at = new Date().toISOString();

        return sendJson(res, 200, { message: 'Customer updated', customer: c });
      }
    } catch (err) {
      console.error('Update Customer Error:', err);
      return sendError(res, 500, 'Error updating customer');
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (pool) {
        const delRes = await query('DELETE FROM customers WHERE id = $1 AND business_id = $2 RETURNING id', [id, businessId]);
        if (!delRes || delRes.rows.length === 0) {
          return sendError(res, 404, 'Customer not found or access denied');
        }
        return sendJson(res, 200, { message: 'Customer deleted successfully', id });
      } else {
        const idx = memoryStore.customers.findIndex(c => c.id === id && c.business_id === businessId);
        if (idx === -1) {
          return sendError(res, 404, 'Customer not found or access denied');
        }
        memoryStore.customers.splice(idx, 1);
        return sendJson(res, 200, { message: 'Customer deleted successfully', id });
      }
    } catch (err) {
      console.error('Delete Customer Error:', err);
      return sendError(res, 500, 'Error deleting customer');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
