const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parse, serialize } = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET || 'billflow-dev-secret-change-in-production-12345';
const COOKIE_NAME = 'billflow_session';
const TOKEN_EXPIRY = '7d';

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function getAuthUser(req) {
  // 1. Try from Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const decoded = verifyToken(token);
    if (decoded) return decoded;
  }

  // 2. Try from Cookie
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const cookies = parse(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) return decoded;
    }
  }

  return null;
}

function serializeAuthCookie(token) {
  const isProd = process.env.NODE_ENV === 'production';
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
  });
}

function clearAuthCookie() {
  const isProd = process.env.NODE_ENV === 'production';
  return serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

async function verifyBusinessAccess(userId, businessId) {
  if (!userId || !businessId) return false;
  const { getPool, query, memoryStore } = require('./db');
  const pool = getPool();
  if (pool) {
    const res = await query('SELECT id FROM businesses WHERE id = $1 AND owner_id = $2', [businessId, userId]);
    return res && res.rows.length > 0;
  } else {
    return memoryStore.businesses.some(b => b.id === businessId && b.owner_id === userId);
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getAuthUser,
  verifyBusinessAccess,
  serializeAuthCookie,
  clearAuthCookie,
  COOKIE_NAME
};
