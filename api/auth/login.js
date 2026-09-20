const { verifyPassword, generateToken, serializeAuthCookie } = require('../_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('../_lib/db');
const { sendJson, sendError } = require('../_lib/response');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method Not Allowed');
  }

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

    const { email, password } = body || {};

    if (!email || !password) {
      return sendError(res, 400, 'Please provide both email and password.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pool = getPool();

    if (pool) {
      await initSchema();

      const userRes = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
      if (!userRes || userRes.rows.length === 0) {
        return sendError(res, 401, 'Invalid email or password.');
      }

      const user = userRes.rows[0];
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return sendError(res, 401, 'Invalid email or password.');
      }

      // Fetch user's businesses
      const bizRes = await query(
        'SELECT id, name, owner_name, phone, address, gstin, invoice_prefix, next_number, currency FROM businesses WHERE owner_id = $1 ORDER BY created_at ASC',
        [user.id]
      );
      const businesses = bizRes.rows || [];
      const activeBusiness = businesses[0] || null;

      const token = generateToken({
        userId: user.id,
        email: user.email,
        activeBusinessId: activeBusiness ? activeBusiness.id : null
      });

      res.setHeader('Set-Cookie', serializeAuthCookie(token));
      return sendJson(res, 200, {
        message: 'Logged in successfully!',
        token,
        user: { id: user.id, email: user.email, fullName: user.full_name },
        business: activeBusiness,
        businesses
      });
    } else {
      // Memory fallback for development
      const user = memoryStore.users.find(u => u.email === normalizedEmail);
      if (!user) {
        return sendError(res, 401, 'Invalid email or password.');
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return sendError(res, 401, 'Invalid email or password.');
      }

      const businesses = memoryStore.businesses.filter(b => b.owner_id === user.id);
      const activeBusiness = businesses[0] || null;

      const token = generateToken({
        userId: user.id,
        email: user.email,
        activeBusinessId: activeBusiness ? activeBusiness.id : null
      });

      res.setHeader('Set-Cookie', serializeAuthCookie(token));
      return sendJson(res, 200, {
        message: 'Logged in successfully!',
        token,
        user: { id: user.id, email: user.email, fullName: user.full_name },
        business: activeBusiness,
        businesses
      });
    }
  } catch (err) {
    console.error('Login Error:', err);
    return sendError(res, 500, 'Internal Server Error during login');
  }
};
