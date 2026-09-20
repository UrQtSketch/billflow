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
      const category = (req.query?.category || '').trim();

      if (pool) {
        let sql = 'SELECT * FROM products WHERE business_id = $1';
        const params = [businessId];

        if (category && category !== 'all') {
          params.push(category);
          sql += ` AND category = $${params.length}`;
        }
        if (search) {
          params.push(`%${search}%`);
          sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(sku) LIKE $${params.length})`;
        }

        sql += ' ORDER BY created_at DESC';
        const result = await query(sql, params);
        return sendJson(res, 200, { products: result.rows || [] });
      } else {
        let products = memoryStore.products.filter(p => p.business_id === businessId);
        if (category && category !== 'all') {
          products = products.filter(p => p.category === category);
        }
        if (search) {
          products = products.filter(p =>
            (p.name && p.name.toLowerCase().includes(search)) ||
            (p.sku && p.sku.toLowerCase().includes(search))
          );
        }
        return sendJson(res, 200, { products });
      }
    } catch (err) {
      console.error('List Products Error:', err);
      return sendError(res, 500, 'Error retrieving products');
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

      const { name, type, sku, price, stock, category } = body || {};

      if (!name || !name.trim()) {
        return sendError(res, 400, 'Product/Service name is required');
      }

      const cleanName = name.trim();
      const cleanType = type === 'service' ? 'service' : 'product';
      const cleanSku = (sku && sku.trim()) || '';
      const cleanPrice = Math.max(0, parseFloat(price) || 0);
      const cleanStock = cleanType === 'service' ? 0 : Math.max(0, parseInt(stock, 10) || 0);
      const cleanCategory = (category && category.trim()) || 'General';

      if (pool) {
        const insertRes = await query(
          'INSERT INTO products (business_id, name, type, sku, price, stock, category) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [businessId, cleanName, cleanType, cleanSku, cleanPrice, cleanStock, cleanCategory]
        );
        return sendJson(res, 201, { message: 'Product created', product: insertRes.rows[0] });
      } else {
        const prodId = 'prod_' + crypto.randomBytes(6).toString('hex');
        const product = {
          id: prodId,
          business_id: businessId,
          name: cleanName,
          type: cleanType,
          sku: cleanSku,
          price: cleanPrice,
          stock: cleanStock,
          category: cleanCategory,
          created_at: new Date().toISOString()
        };
        memoryStore.products.push(product);
        return sendJson(res, 201, { message: 'Product created', product });
      }
    } catch (err) {
      console.error('Create Product Error:', err);
      return sendError(res, 500, 'Error creating product');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
