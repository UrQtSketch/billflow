const { getAuthUser } = require('./_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('./_lib/db');
const { sendJson, sendError, getQueryParams } = require('./_lib/response');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return sendError(res, 401, 'Unauthorized — Please log in');
  }

  const pool = getPool();
  if (pool) await initSchema();

  const queryParams = getQueryParams(req);
  const id = queryParams.id;

  // GET: List all or single detail
  if (req.method === 'GET') {
    try {
      const formatBiz = (b) => {
        if (!b) return b;
        return { ...b, upiId: b.upi_id || b.upiId || 'deepaksharma@okaxis' };
      };
      if (id) {
        if (pool) {
          const resDetail = await query('SELECT * FROM businesses WHERE id = $1 AND owner_id = $2', [id, authUser.userId]);
          if (!resDetail || resDetail.rows.length === 0) {
            return sendError(res, 404, 'Business not found');
          }
          return sendJson(res, 200, { business: formatBiz(resDetail.rows[0]) });
        } else {
          const b = memoryStore.businesses.find(biz => biz.id === id && biz.owner_id === authUser.userId);
          if (!b) return sendError(res, 404, 'Business not found');
          return sendJson(res, 200, { business: formatBiz(b) });
        }
      } else {
        if (pool) {
          const resList = await query('SELECT * FROM businesses WHERE owner_id = $1 ORDER BY created_at ASC', [authUser.userId]);
          return sendJson(res, 200, { businesses: (resList.rows || []).map(formatBiz) });
        } else {
          const businesses = memoryStore.businesses.filter(biz => biz.owner_id === authUser.userId);
          return sendJson(res, 200, { businesses: businesses.map(formatBiz) });
        }
      }
    } catch (err) {
      return sendError(res, 500, 'Error listing businesses');
    }
  }

  // Parse Body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  if (!body && req.readable) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
  }

  // POST: Create Business
  if (req.method === 'POST') {
    try {
      const { name, ownerName, phone, address, gstin, upiId, upi_id, invoicePrefix, nextNumber, currency } = body || {};
      if (!name || !name.trim()) return sendError(res, 400, 'Business name is required');

      const cleanName = name.trim();
      const cleanOwner = ownerName || '';
      const cleanUpi = (upiId || upi_id || 'deepaksharma@okaxis').trim();
      const cleanPrefix = invoicePrefix || 'INV-', cleanNextNum = parseInt(nextNumber, 10) || 1001, cleanCurrency = currency || '₹';

      if (pool) {
        const ins = await query(
          'INSERT INTO businesses (owner_id, name, owner_name, phone, address, gstin, upi_id, invoice_prefix, next_number, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
          [authUser.userId, cleanName, cleanOwner, phone || '', address || '', gstin || '', cleanUpi, cleanPrefix, cleanNextNum, cleanCurrency]
        );
        const savedBiz = { ...ins.rows[0], upiId: cleanUpi };
        return sendJson(res, 201, { message: 'Business created', business: savedBiz });
      } else {
        const biz = {
          id: 'biz_' + crypto.randomBytes(6).toString('hex'),
          owner_id: authUser.userId,
          name: cleanName,
          owner_name: cleanOwner,
          phone: phone || '',
          address: address || '',
          gstin: gstin || '',
          upi_id: cleanUpi,
          upiId: cleanUpi,
          invoice_prefix: cleanPrefix,
          next_number: cleanNextNum,
          currency: cleanCurrency,
          created_at: new Date().toISOString()
        };
        memoryStore.businesses.push(biz);
        return sendJson(res, 201, { message: 'Business created', business: biz });
      }
    } catch (err) {
      return sendError(res, 500, 'Error creating business');
    }
  }

  // PUT: Update Business Settings
  if (req.method === 'PUT' && id) {
    try {
      const { name, ownerName, phone, address, gstin, upiId, upi_id, invoicePrefix, nextNumber, currency } = body || {};
      const cleanUpi = upiId !== undefined ? (upiId || '').trim() : (upi_id !== undefined ? (upi_id || '').trim() : undefined);

      if (pool) {
        const upd = await query(
          `UPDATE businesses
           SET name = COALESCE($1, name), owner_name = COALESCE($2, owner_name), phone = COALESCE($3, phone),
               address = COALESCE($4, address), gstin = COALESCE($5, gstin), upi_id = COALESCE($6, upi_id),
               invoice_prefix = COALESCE($7, invoice_prefix), next_number = COALESCE($8, next_number),
               currency = COALESCE($9, currency), updated_at = CURRENT_TIMESTAMP
           WHERE id = $10 AND owner_id = $11 RETURNING *`,
          [name, ownerName, phone, address, gstin, cleanUpi, invoicePrefix, nextNumber, currency, id, authUser.userId]
        );
        if (!upd || upd.rows.length === 0) return sendError(res, 404, 'Business not found');
        const updatedBiz = { ...upd.rows[0], upiId: upd.rows[0].upi_id || cleanUpi };
        return sendJson(res, 200, { message: 'Settings updated', business: updatedBiz });
      } else {
        const b = memoryStore.businesses.find(biz => biz.id === id && biz.owner_id === authUser.userId);
        if (!b) return sendError(res, 404, 'Business not found');
        if (name !== undefined) b.name = name;
        if (ownerName !== undefined) b.owner_name = ownerName;
        if (phone !== undefined) b.phone = phone;
        if (address !== undefined) b.address = address;
        if (gstin !== undefined) b.gstin = gstin;
        if (cleanUpi !== undefined) { b.upi_id = cleanUpi; b.upiId = cleanUpi; }
        if (invoicePrefix !== undefined) b.invoice_prefix = invoicePrefix;
        if (nextNumber !== undefined) b.next_number = nextNumber;
        if (currency !== undefined) b.currency = currency;
        return sendJson(res, 200, { message: 'Settings updated', business: { ...b, upiId: b.upi_id || b.upiId } });
      }
    } catch (err) {
      return sendError(res, 500, 'Error updating business settings');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
