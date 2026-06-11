const express = require('express');
const db = require('../db');

const router = express.Router();

// Public tracking (used by client trackers in playground sites + future SDKs)
router.post('/track', (req, res) => {
  // Already handled in server.js for simplicity, but can move here
  res.status(200).json({ ok: true });
});

// Protected admin queries
function requireKey(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key && key === process.env.ADMIN_API_KEY) return next();
  res.status(401).json({ error: 'Invalid admin key' });
}

router.get('/overview', requireKey, (req, res) => {
  const data = db.getOverview(req.query.range);
  res.json(data);
});

router.get('/events', requireKey, (req, res) => {
  const data = db.getEvents({
    source: req.query.source,
    type: req.query.type,
    limit: parseInt(req.query.limit) || 100,
    offset: parseInt(req.query.offset) || 0
  });
  res.json(data);
});

router.get('/vitals', requireKey, (req, res) => {
  const data = db.getVitalsSummary(req.query);
  res.json(data);
});

router.get('/traffic', requireKey, (req, res) => {
  const data = db.getTrafficSummary(req.query);
  res.json(data);
});

router.get('/rules', requireKey, (req, res) => {
  res.json(db.getRules());
});

router.post('/rules', requireKey, (req, res) => {
  const rule = db.addRule(req.body);
  res.json(rule);
});

module.exports = router;
