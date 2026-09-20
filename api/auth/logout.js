const { clearAuthCookie } = require('../_lib/auth');
const { sendJson } = require('../_lib/response');

module.exports = async function handler(req, res) {
  res.setHeader('Set-Cookie', clearAuthCookie());
  return sendJson(res, 200, { message: 'Logged out successfully' });
};
