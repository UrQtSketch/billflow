const { hashPassword, generateToken, serializeAuthCookie } = require('../_lib/auth');
const { getPool, query, initSchema, memoryStore } = require('../_lib/db');
const { sendJson, sendError } = require('../_lib/response');
const crypto = require('crypto');

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

    const pool = getPool();

    if (pool) {
      await initSchema();

      // Check if user exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
      if (existing && existing.rows.length > 0) {
        return sendError(res, 409, 'An account with this email already exists.');
      }

      // Create user
      const userRes = await query(
        'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
        [normalizedEmail, passwordHash, cleanName]
      );
      const user = userRes.rows[0];

      // Create initial business
      const bizRes = await query(
        'INSERT INTO businesses (owner_id, name, owner_name, invoice_prefix, next_number, currency) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, owner_name, invoice_prefix, next_number, currency',
        [user.id, cleanBizName, cleanName, 'INV-', 1001, '₹']
      );
      const business = bizRes.rows[0];

      // Seed starter products & customers for great first-run experience
      const seedProducts = [
        ['General Product A', 'product', 'SKU-001', 500, 50, 'General'],
        ['Consultation Service', 'service', 'SRV-001', 1500, 0, 'Services']
      ];
      for (const p of seedProducts) {
        await query(
          'INSERT INTO products (business_id, name, type, sku, price, stock, category) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [business.id, p[0], p[1], p[2], p[3], p[4], p[5]]
        );
      }

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
      // Memory fallback for local mock / development
      const existing = memoryStore.users.find(u => u.email === normalizedEmail);
      if (existing) {
        return sendError(res, 409, 'An account with this email already exists.');
      }

      const userId = 'usr_' + crypto.randomBytes(6).toString('hex');
      const bizId = 'biz_' + crypto.randomBytes(6).toString('hex');

      const user = {
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: cleanName,
        created_at: new Date().toISOString()
      };
      memoryStore.users.push(user);

      const business = {
        id: bizId,
        owner_id: userId,
        name: cleanBizName,
        owner_name: cleanName,
        invoice_prefix: 'INV-',
        next_number: 1001,
        currency: '₹',
        created_at: new Date().toISOString()
      };
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
    return sendError(res, 500, 'Internal Server Error during registration');
  }
};
