const { getAuthUser } = require('../_lib/auth');
const { getPool, query, memoryStore } = require('../_lib/db');
const { sendJson, sendError } = require('../_lib/response');

module.exports = async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return sendError(res, 401, 'Unauthorized — No valid session token');
  }

  try {
    const pool = getPool();
    if (pool) {
      const userRes = await query('SELECT id, email, full_name, created_at FROM users WHERE id = $1', [authUser.userId]);
      if (!userRes || userRes.rows.length === 0) {
        return sendError(res, 404, 'User account not found');
      }
      const user = userRes.rows[0];

      const bizRes = await query(
        'SELECT id, name, owner_name, phone, address, gstin, invoice_prefix, next_number, currency FROM businesses WHERE owner_id = $1 ORDER BY created_at ASC',
        [user.id]
      );
      const businesses = bizRes.rows || [];
      const activeBusiness = businesses.find(b => b.id === authUser.activeBusinessId) || businesses[0] || null;

      return sendJson(res, 200, {
        user: { id: user.id, email: user.email, fullName: user.full_name },
        business: activeBusiness,
        businesses
      });
    } else {
      const user = memoryStore.users.find(u => u.id === authUser.userId);
      if (!user) {
        return sendError(res, 404, 'User account not found');
      }

      const businesses = memoryStore.businesses.filter(b => b.owner_id === user.id);
      const activeBusiness = businesses.find(b => b.id === authUser.activeBusinessId) || businesses[0] || null;

      return sendJson(res, 200, {
        user: { id: user.id, email: user.email, fullName: user.full_name },
        business: activeBusiness,
        businesses
      });
    }
  } catch (err) {
    console.error('Session Me Error:', err);
    return sendError(res, 500, 'Internal Server Error fetching session profile');
  }
};
