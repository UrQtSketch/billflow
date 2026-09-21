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

  // GET Products
  if (req.method === 'GET') {
    try {
      const search = (req.query?.search || '').trim().toLowerCase();
      const category = (req.query?.category || '').trim();

      if (pool) {
        let sql = 'SELECT * FROM products WHERE business_id = $1';
        const params = [businessId];
        if (category && category !== 'all') { params.push(category); sql += ` AND category = $${params.length}`; }
        if (search) { params.push(`%${search}%`); sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(sku) LIKE $${params.length})`; }
        sql += ' ORDER BY created_at DESC';
        const result = await query(sql, params);
        return sendJson(res, 200, { products: result.rows || [] });
      } else {
        let products = memoryStore.products.filter(p => p.business_id === businessId);
        if (category && category !== 'all') products = products.filter(p => p.category === category);
        if (search) products = products.filter(p => (p.name && p.name.toLowerCase().includes(search)) || (p.sku && p.sku.toLowerCase().includes(search)));
        return sendJson(res, 200, { products });
      }
    } catch (err) {
      return sendError(res, 500, 'Error listing products');
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

  // POST Create Product
  if (req.method === 'POST') {
    try {
      const { name, type, sku, price, costPrice, cost_price, stock, category } = body || {};
      if (!name || !name.trim()) return sendError(res, 400, 'Product name is required');

      const cleanName = name.trim();
      const cleanType = type === 'service' ? 'service' : 'product';
      const cleanSku = (sku && sku.trim()) || '';
      const cleanPrice = Math.max(0, parseFloat(price) || 0);
      const cleanCostPrice = Math.max(0, parseFloat(costPrice !== undefined ? costPrice : cost_price) || 0);
      const cleanStock = cleanType === 'service' ? 0 : Math.max(0, parseInt(stock, 10) || 0);
      const cleanCategory = (category && category.trim()) || 'General';

      if (pool) {
        const ins = await query(
          'INSERT INTO products (business_id, name, type, sku, price, cost_price, stock, category) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
          [businessId, cleanName, cleanType, cleanSku, cleanPrice, cleanCostPrice, cleanStock, cleanCategory]
        );
        return sendJson(res, 201, { message: 'Product created', product: ins.rows[0] });
      } else {
        const prod = {
          id: 'prod_' + crypto.randomBytes(6).toString('hex'),
          business_id: businessId,
          name: cleanName,
          type: cleanType,
          sku: cleanSku,
          price: cleanPrice,
          cost_price: cleanCostPrice,
          costPrice: cleanCostPrice,
          stock: cleanStock,
          category: cleanCategory,
          created_at: new Date().toISOString()
        };
        memoryStore.products.push(prod);
        return sendJson(res, 201, { message: 'Product created', product: prod });
      }
    } catch (err) {
      return sendError(res, 500, 'Error creating product');
    }
  }

  // PUT Update Product
  if (req.method === 'PUT' && id) {
    try {
      const { name, type, sku, price, costPrice, cost_price, stock, category } = body || {};
      const finalCostPrice = costPrice !== undefined ? parseFloat(costPrice) : (cost_price !== undefined ? parseFloat(cost_price) : null);
      if (pool) {
        const upd = await query(
          `UPDATE products
           SET name = COALESCE($1, name), type = COALESCE($2, type), sku = COALESCE($3, sku),
               price = COALESCE($4, price), cost_price = COALESCE($5, cost_price), stock = COALESCE($6, stock), category = COALESCE($7, category), updated_at = CURRENT_TIMESTAMP
           WHERE id = $8 AND business_id = $9 RETURNING *`,
          [name, type, sku, price !== undefined ? parseFloat(price) : null, finalCostPrice, stock !== undefined ? parseInt(stock, 10) : null, category, id, businessId]
        );
        if (!upd || upd.rows.length === 0) return sendError(res, 404, 'Product not found');
        return sendJson(res, 200, { message: 'Product updated', product: upd.rows[0] });
      } else {
        const p = memoryStore.products.find(prod => prod.id === id && prod.business_id === businessId);
        if (!p) return sendError(res, 404, 'Product not found');
        if (name !== undefined) p.name = name;
        if (type !== undefined) p.type = type;
        if (sku !== undefined) p.sku = sku;
        if (price !== undefined) p.price = parseFloat(price) || 0;
        if (finalCostPrice !== null) { p.cost_price = finalCostPrice; p.costPrice = finalCostPrice; }
        if (stock !== undefined) p.stock = parseInt(stock, 10) || 0;
        if (category !== undefined) p.category = category;
        return sendJson(res, 200, { message: 'Product updated', product: p });
      }
    } catch (err) {
      return sendError(res, 500, 'Error updating product');
    }
  }

  // DELETE Product
  if (req.method === 'DELETE' && id) {
    try {
      if (pool) {
        const del = await query('DELETE FROM products WHERE id = $1 AND business_id = $2 RETURNING id', [id, businessId]);
        if (!del || del.rows.length === 0) return sendError(res, 404, 'Product not found');
        return sendJson(res, 200, { message: 'Product deleted', id });
      } else {
        const idx = memoryStore.products.findIndex(prod => prod.id === id && prod.business_id === businessId);
        if (idx === -1) return sendError(res, 404, 'Product not found');
        memoryStore.products.splice(idx, 1);
        return sendJson(res, 200, { message: 'Product deleted', id });
      }
    } catch (err) {
      return sendError(res, 500, 'Error deleting product');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
