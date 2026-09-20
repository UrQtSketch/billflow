/**
 * Standard API Response & Request Helpers
 */

function getQueryParams(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const params = {};
    for (const [key, value] of url.searchParams.entries()) {
      params[key] = value;
    }
    return { ...params, ...(req.query || {}) };
  } catch (e) {
    return req.query || {};
  }
}

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
  getQueryParams,
  sendJson,
  sendError
};
