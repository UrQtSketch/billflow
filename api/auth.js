const { hashPassword, verifyPassword, generateToken, getAuthUser, serializeAuthCookie, clearAuthCookie } = require('./_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('./_lib/db');
const { sendJson, sendError, getQueryParams } = require('./_lib/response');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const queryParams = getQueryParams(req);
  const action = (queryParams.action || '').toLowerCase();
  const pool = getPool();
  if (pool) await initSchema();

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

  // 1. SIGNUP
  if (action === 'signup' && req.method === 'POST') {
    try {
      const { email, password, fullName, businessName } = body || {};

      if (!email || !email.includes('@')) {
        return sendError(res, 400, 'Please provide a valid email address.');
      }
      if (!password || password.length < 6) {
        return sendError(res, 400, 'Password must be at least 6 characters long.');
      }
      if (!fullName || !fullName.trim()) {
        return sendError(res, 400, 'Please provide your full name.');
      }

      const normalizedEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanBizName = (businessName && businessName.trim()) || `${cleanName}'s Business`;
      const passwordHash = await hashPassword(password);

      if (pool) {
        const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
        if (existing && existing.rows.length > 0) {
          return sendError(res, 409, 'An account with this email already exists.');
        }

        const userRes = await query(
          'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
          [normalizedEmail, passwordHash, cleanName]
        );
        const user = userRes.rows[0];

        const bizRes = await query(
          'INSERT INTO businesses (owner_id, name, owner_name, invoice_prefix, next_number, currency) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, owner_name, invoice_prefix, next_number, currency',
          [user.id, cleanBizName, cleanName, 'INV-', 1001, '₹']
        );
        const business = bizRes.rows[0];

        const token = generateToken({
          userId: user.id,
          email: user.email,
          activeBusinessId: business.id
        });

        res.setHeader('Set-Cookie', serializeAuthCookie(token));
        return sendJson(res, 201, {
          message: 'Account created successfully!',
          token,
          user: { id: user.id, email: user.email, fullName: user.full_name },
          business: { id: business.id, name: business.name },
          businesses: [business]
        });
      } else {
        const existing = memoryStore.users.find(u => u.email === normalizedEmail);
        if (existing) {
          return sendError(res, 409, 'An account with this email already exists.');
        }

        const userId = 'usr_' + crypto.randomBytes(6).toString('hex');
        const bizId = 'biz_' + crypto.randomBytes(6).toString('hex');

        const user = { id: userId, email: normalizedEmail, password_hash: passwordHash, full_name: cleanName };
        memoryStore.users.push(user);

        const business = { id: bizId, owner_id: userId, name: cleanBizName, owner_name: cleanName, invoice_prefix: 'INV-', next_number: 1001, currency: '₹' };
        memoryStore.businesses.push(business);

        const token = generateToken({
          userId: user.id,
          email: user.email,
          activeBusinessId: business.id
        });

        res.setHeader('Set-Cookie', serializeAuthCookie(token));
        return sendJson(res, 201, {
          message: 'Account created successfully!',
          token,
          user: { id: user.id, email: user.email, fullName: user.full_name },
          business: { id: business.id, name: business.name },
          businesses: [business]
        });
      }
    } catch (err) {
      console.error('Signup Error:', err);
      return sendError(res, 500, 'Error during signup');
    }
  }

  // 2. LOGIN
  if (action === 'login' && req.method === 'POST') {
    try {
      const { email, password } = body || {};
      if (!email || !password) {
        return sendError(res, 400, 'Please provide both email and password.');
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (pool) {
        const userRes = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
        if (!userRes || userRes.rows.length === 0) {
          return sendError(res, 401, 'Invalid email or password.');
        }

        const user = userRes.rows[0];
        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
          return sendError(res, 401, 'Invalid email or password.');
        }

        const bizRes = await query('SELECT * FROM businesses WHERE owner_id = $1 ORDER BY created_at ASC', [user.id]);
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
      return sendError(res, 500, 'Error during login');
    }
  }

  // 3. ME (SESSION CHECK)
  if (action === 'me' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return sendError(res, 401, 'Unauthorized — No valid session token');
    }

    try {
      if (pool) {
        const userRes = await query('SELECT id, email, full_name, created_at FROM users WHERE id = $1', [authUser.userId]);
        if (!userRes || userRes.rows.length === 0) {
          return sendError(res, 404, 'User account not found');
        }
        const user = userRes.rows[0];

        const bizRes = await query('SELECT * FROM businesses WHERE owner_id = $1 ORDER BY created_at ASC', [user.id]);
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
      return sendError(res, 500, 'Error retrieving profile');
    }
  }

  // 4. LOGOUT
  if (action === 'logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', clearAuthCookie());
    return sendJson(res, 200, { message: 'Logged out successfully' });
  }

  return sendError(res, 404, 'Auth action not found');
};
