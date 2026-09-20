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
    return sendError(res, 400, 'Product ID and Business ID are required');
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

      const { name, type, sku, price, stock, category } = body || {};

      if (pool) {
        const updateRes = await query(
          `UPDATE products
           SET name = COALESCE($1, name),
               type = COALESCE($2, type),
               sku = COALESCE($3, sku),
               price = COALESCE($4, price),
               stock = COALESCE($5, stock),
               category = COALESCE($6, category),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $7 AND business_id = $8
           RETURNING *`,
          [name, type, sku, price !== undefined ? parseFloat(price) : null, stock !== undefined ? parseInt(stock, 10) : null, category, id, businessId]
        );

        if (!updateRes || updateRes.rows.length === 0) {
          return sendError(res, 404, 'Product not found or access denied');
        }

        return sendJson(res, 200, { message: 'Product updated', product: updateRes.rows[0] });
      } else {
        const idx = memoryStore.products.findIndex(p => p.id === id && p.business_id === businessId);
        if (idx === -1) {
          return sendError(res, 404, 'Product not found or access denied');
        }

        const p = memoryStore.products[idx];
        if (name !== undefined) p.name = name;
        if (type !== undefined) p.type = type;
        if (sku !== undefined) p.sku = sku;
        if (price !== undefined) p.price = parseFloat(price) || 0;
        if (stock !== undefined) p.stock = parseInt(stock, 10) || 0;
        if (category !== undefined) p.category = category;
        p.updated_at = new Date().toISOString();

        return sendJson(res, 200, { message: 'Product updated', product: p });
      }
    } catch (err) {
      console.error('Update Product Error:', err);
      return sendError(res, 500, 'Error updating product');
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (pool) {
        const delRes = await query('DELETE FROM products WHERE id = $1 AND business_id = $2 RETURNING id', [id, businessId]);
        if (!delRes || delRes.rows.length === 0) {
          return sendError(res, 404, 'Product not found or access denied');
        }
        return sendJson(res, 200, { message: 'Product deleted successfully', id });
      } else {
        const idx = memoryStore.products.findIndex(p => p.id === id && p.business_id === businessId);
        if (idx === -1) {
          return sendError(res, 404, 'Product not found or access denied');
        }
        memoryStore.products.splice(idx, 1);
        return sendJson(res, 200, { message: 'Product deleted successfully', id });
      }
    } catch (err) {
      console.error('Delete Product Error:', err);
      return sendError(res, 500, 'Error deleting product');
    }
  }

  return sendError(res, 405, 'Method Not Allowed');
};
