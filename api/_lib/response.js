/**
 * Standard API Response Helpers
 */

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: true, ...data }));
}

function sendError(res, statusCode, message, details = null) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  const payload = { success: false, error: message };
  if (details) payload.details = details;
  res.end(JSON.stringify(payload));
}

module.exports = {
  sendJson,
  sendError
};
