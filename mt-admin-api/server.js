require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const geoip = require('geoip-lite');
const WebSocket = require('ws');
const db = require('./src/db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4003;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-key-change-me';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

// Initialize DB tables on startup (idempotent)
db.initDB();

// WebSocket for live updates (globe dots, events as they happen)
let wss;
const broadcast = (data) => {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
};

app.use(express.json({ limit: '1mb' }));

// Serve static assets (admin_messages.html, dashboard.html, etc.)
// This must come early.
app.use('/static', express.static(path.join(__dirname, 'static')));

// CORS for playground sites + future SDKs
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Simple API key middleware for admin / internal sources
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key === ADMIN_API_KEY) return next();
  res.status(401).json({ error: 'Unauthorized - invalid admin key' });
}

// Public tracking endpoint (used by web trackers in playgrounds + future SDKs)
app.post('/api/track', (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.body.ip || '';
    let geo = null;
    if (ip) {
      const lookup = geoip.lookup(ip);
      if (lookup) {
        geo = {
          lat: lookup.ll[0],
          lon: lookup.ll[1],
          country: lookup.country,
          city: lookup.city || null,
          region: lookup.region || null
        };
      }
    }
    // Allow demo geo from payload (for testing the globe immediately)
    if (req.body.data && req.body.data.geo) {
      geo = req.body.data.geo;
    }

    // Simple bot scoring (expandable, no third parties)
    let botScore = 0;
    const uaLower = (req.body.ua || req.get('user-agent') || '').toLowerCase();
    if (/bot|crawler|spider|headless|phantom|selenium|puppeteer|playwright|curl|wget|python-requests|go-http/.test(uaLower)) botScore += 60;
    if (req.body.data && (req.body.data.rate > 5 || req.body.data.requestsPerMin > 10)) botScore += 30;

    const event = {
      id: uuidv4(),
      ts: Date.now(),
      source: req.body.source || 'web-unknown',
      type: req.body.type || 'pageview',
      path: req.body.path || req.body.url || '/',
      referrer: req.body.referrer || '',
      ua: req.body.ua || req.get('user-agent') || '',
      ip: ip,
      session_id: req.body.session_id || null,
      user_id: req.body.user_id || null,
      data: { ...(req.body.data || {}), geo, botScore }
    };

    db.insertEvent(event);

    // Live broadcast for globe + real-time dashboard (red dots as events happen)
    broadcast({ type: 'new_event', event });

    res.json({ ok: true, id: event.id });
  } catch (e) {
    console.error('Track error', e);
    res.status(500).json({ error: 'track failed' });
  }
});

// Admin-only endpoints (protected by key)
app.get('/api/admin/overview', requireAdminKey, (req, res) => {
  const range = req.query.range || '7d';
  res.json(db.getOverview(range));
});

app.get('/api/admin/events', requireAdminKey, (req, res) => {
  const { source, type, limit = 100, offset = 0 } = req.query;
  res.json(db.getEvents({ source, type, limit: parseInt(limit), offset: parseInt(offset) }));
});

app.get('/api/admin/vitals', requireAdminKey, (req, res) => {
  res.json(db.getVitalsSummary(req.query));
});

app.get('/api/admin/traffic', requireAdminKey, (req, res) => {
  res.json(db.getTrafficSummary(req.query));
});

app.post('/api/admin/rule', requireAdminKey, (req, res) => {
  const rule = db.addRule(req.body);
  res.json({ ok: true, rule });
});

app.get('/api/admin/rules', requireAdminKey, (req, res) => {
  res.json(db.getRules());
});

// Geo for live globe (protected + public test alias)
app.get('/api/admin/geo', requireAdminKey, (req, res) => {
  res.json(db.getRecentGeoEvents(parseInt(req.query.limit) || 300));
});

app.get('/api/geo', (req, res) => {
  res.json(db.getRecentGeoEvents(parseInt(req.query.limit) || 100));
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'mt-admin-api', time: Date.now() }));

// Serve the ambitious live dashboard (globe with red bot dots, traffic, firewall, API playground with runnable examples, WS live updates)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'dashboard.html'));
});

// Create HTTP server so we can attach WebSocket for live globe dots + real-time events
const server = require('http').createServer(app);
wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to live admin feed — red dots will appear on the globe as events happen' }));
});

server.listen(PORT, () => {
  console.log(`MT Admin API running on port ${PORT}`);
  console.log('Dashboard: /dashboard (use ?key= or X-Admin-Key header for full data)');
  console.log('Protected endpoints require X-Admin-Key header (or ?key=)');
  console.log('WebSocket live updates (globe + events) available on same port');
});
