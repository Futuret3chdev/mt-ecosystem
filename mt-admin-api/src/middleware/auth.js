// Simple key-based auth for admin endpoints and sources
// For web trackers we can allow public /track
// For games, bots, SDKs use X-Admin-Key or per-source keys later

function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key === process.env.ADMIN_API_KEY) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

function optionalSourceAuth(req, res, next) {
  // Future: validate source tokens
  next();
}

module.exports = { requireAdminKey, optionalSourceAuth };
