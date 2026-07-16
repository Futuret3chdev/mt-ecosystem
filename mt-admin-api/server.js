require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const geoip = require('geoip-lite');
const WebSocket = require('ws');
const db = require('./src/db');
const path = require('path');
const { isAdmin2faEnabled, admin2faConfigured, verifyAdminTotp } = require('./src/admin-totp');

// Staff system (additive only — does not touch existing key auth or admin APIs)
const {
  seedDefaultStaffUsers,
  verifyStaffCredentials,
  issueStaffToken,
  validateStaffToken,
  getStaffMessagesFor,
  sendStaffMessage,
  markStaffMessageRead,
  getStaffResourcesFor,
  getAllStaffUsers,
  quickStaffLogin
} = db;

const app = express();
const PORT = process.env.PORT || 4003;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-key-change-me';
const TEST_API_KEY = process.env.TEST_API_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://admin.futuret3ch.com.au,http://admin.futuret3ch.com.au,https://admin.futuret3ch.com.au:*,http://localhost:*,https://*.vercel.app').split(',').map(s => s.trim()).filter(Boolean);
const ADMIN_DOMAIN = 'admin.futuret3ch.com.au';

// Initialize DB tables on startup (idempotent)
db.initDB();

// Seed default staff accounts (only if none exist). Change passwords on first use!
seedDefaultStaffUsers();

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
app.use(express.urlencoded({ extended: false }));

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx < 1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function signDashboardSession(keyHint) {
  const exp = Date.now() + 2 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp, h: keyHint })).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_API_KEY).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyDashboardSession(token) {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', ADMIN_API_KEY).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

function isValidAdminKey(key) {
  return key === ADMIN_API_KEY || (TEST_API_KEY && key === TEST_API_KEY);
}

// Protected tester admin page (must be before generic /static)
app.get('/static/admin_messages.html', requireAustralianAdmin, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.sendFile(path.join(__dirname, 'static', 'admin_messages.html'));
});

// Serve static assets (dashboard.html, staff.html, etc.)
app.use('/static', express.static(path.join(__dirname, 'static')));

// CORS for playground sites + future SDKs
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true); // server-to-server, curl, etc.
    }
    // Always allow requests from our own admin domain (covers http/https + any port)
    if (origin.includes(ADMIN_DOMAIN)) {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.length === 0) {
      return callback(null, true);
    }
    // Exact match or simple wildcard support (e.g. https://*.vercel.app or :* for ports)
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (allowed === origin) return true;
      if (allowed.includes('*')) {
        const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return false;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`CORS blocked origin: ${origin}. Allowed: ${ALLOWED_ORIGINS.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

/** Admin surfaces: Australian connections only (geoip-lite). Set ALLOW_NON_AU_ADMIN=true to bypass. */
function requireAustralianAdmin(req, res, next) {
  if (process.env.ALLOW_NON_AU_ADMIN === 'true') return next();
  const ip = clientIp(req);
  const lookup = ip ? geoip.lookup(ip) : null;
  if (!lookup || lookup.country !== 'AU') {
    return res.status(403).json({
      error: 'geo_restricted',
      message: 'Admin access is restricted to Australian connections only.'
    });
  }
  next();
}

// Simple API key middleware for admin / internal sources
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key === ADMIN_API_KEY || (TEST_API_KEY && key === TEST_API_KEY)) return next();
  res.status(401).json({ error: 'Unauthorized - invalid admin key' });
}

function requireAdminKeyAu(req, res, next) {
  requireAustralianAdmin(req, res, () => requireAdminKey(req, res, next));
}

/* ====================== STAFF AUTH (new, completely additive) ====================== */
function requireStaffAuth(req, res, next) {
  const token = req.headers['x-staff-token'] || req.query.staff_token;
  const staff = validateStaffToken(token);
  if (!staff) {
    return res.status(401).json({ error: 'Staff login required' });
  }
  req.staff = staff; // { username, role }
  next();
}

function requireStaffAuthAu(req, res, next) {
  requireAustralianAdmin(req, res, () => requireStaffAuth(req, res, next));
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
app.get('/api/admin/overview', requireAdminKeyAu, (req, res) => {
  const range = req.query.range || '7d';
  res.json(db.getOverview(range));
});

app.get('/api/admin/events', requireAdminKeyAu, (req, res) => {
  const { source, type, limit = 100, offset = 0 } = req.query;
  res.json(db.getEvents({ source, type, limit: parseInt(limit), offset: parseInt(offset) }));
});

app.get('/api/admin/vitals', requireAdminKeyAu, (req, res) => {
  res.json(db.getVitalsSummary(req.query));
});

app.get('/api/admin/traffic', requireAdminKeyAu, (req, res) => {
  res.json(db.getTrafficSummary(req.query));
});

app.post('/api/admin/rule', requireAdminKeyAu, (req, res) => {
  const rule = db.addRule(req.body);
  res.json({ ok: true, rule });
});

app.get('/api/admin/rules', requireAdminKeyAu, (req, res) => {
  res.json(db.getRules());
});

// Geo for live globe (protected + public test alias)
app.get('/api/admin/geo', requireAdminKeyAu, (req, res) => {
  res.json(db.getRecentGeoEvents(parseInt(req.query.limit) || 300));
});

app.get('/api/geo', (req, res) => {
  res.json(db.getRecentGeoEvents(parseInt(req.query.limit) || 100));
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'mt-admin-api', time: Date.now() }));

/* ====================== STAFF SYSTEM ROUTES (new — no changes to any existing routes) ====================== */

// Staff login (username + password + TOTP). Returns a token to be used as X-Staff-Token.
app.post('/api/staff/login', requireAustralianAdmin, (req, res) => {
  const { username, password, totp_code } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username, password and totp_code required' });
  }
  const user = verifyStaffCredentials(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (isAdmin2faEnabled()) {
    if (!admin2faConfigured()) {
      return res.status(503).json({ error: '2fa_not_configured', message: 'ADMIN_TOTP_SECRET required' });
    }
    if (!verifyAdminTotp(totp_code)) {
      return res.status(401).json({ error: 'invalid_2fa', message: 'Invalid authenticator code' });
    }
  }
  const tokenInfo = issueStaffToken(user.username, user.role);
  res.json({
    ok: true,
    token: tokenInfo.token,
    expires_at: tokenInfo.expires_at,
    user: { username: user.username, role: user.role, full_name: user.full_name }
  });
});

// One-click quick login for testing/demo (no password). Role: admin | developer | marketer | tester
// We will replace this with real password auth later.
app.post('/api/staff/quick-login', requireAustralianAdmin, (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_STAFF_QUICK_LOGIN !== 'true') {
    return res.status(403).json({ error: 'quick_login_disabled', message: 'Quick login disabled in production.' });
  }
  const { role } = req.body || {};
  const allowed = ['admin', 'developer', 'marketer', 'tester', 'moderator'];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Use one of: ' + allowed.join(', ') });
  }
  const result = quickStaffLogin(role);
  if (!result) {
    return res.status(404).json({ error: 'No user found for role' });
  }
  res.json({ ok: true, ...result, note: 'Quick login (testing only — passwords coming later)' });
});

// Get current staff profile (requires token)
app.get('/api/staff/me', requireStaffAuthAu, (req, res) => {
  const profile = db.getStaffUser ? db.getStaffUser(req.staff.username) : { username: req.staff.username, role: req.staff.role };
  res.json({ ok: true, staff: req.staff, profile });
});

// Internal messages (email-like)
app.get('/api/staff/messages', requireStaffAuthAu, (req, res) => {
  const msgs = getStaffMessagesFor(req.staff.username, req.staff.role);
  res.json({ ok: true, messages: msgs });
});

app.post('/api/staff/messages', requireStaffAuthAu, (req, res) => {
  const { to, subject, body, parent_id } = req.body || {};
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject and body are required' });
  }
  // to can be 'all', a role, or a specific username
  // parent_id for replying to a thread/trend
  const msg = sendStaffMessage(req.staff.username, to, subject, body, parent_id || null);
  res.json({ ok: true, message: msg });
});

app.post('/api/staff/messages/:id/read', requireStaffAuthAu, (req, res) => {
  const id = parseInt(req.params.id, 10);
  markStaffMessageRead(id, req.staff.username);
  res.json({ ok: true });
});

// Staff resources (role-aware links to internal tools, docs, etc.)
app.get('/api/staff/resources', requireStaffAuthAu, (req, res) => {
  const resources = getStaffResourcesFor(req.staff.role);
  res.json({ ok: true, resources, role: req.staff.role });
});

// Staff directory (visible to all staff)
app.get('/api/staff/directory', requireStaffAuthAu, (req, res) => {
  const users = getAllStaffUsers();
  res.json({ ok: true, users });
});

// Convenience route: /staff serves the staff portal (in addition to /static/staff.html via nginx)
app.get('/staff', requireAustralianAdmin, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.sendFile(path.join(__dirname, 'static', 'staff.html'));
});

app.post('/dashboard/login', requireAustralianAdmin, (req, res) => {
  const key = String(req.body?.key || '').trim();
  const totp = String(req.body?.totp || '').trim();
  if (!isValidAdminKey(key)) {
    return res.redirect('/dashboard?err=key');
  }
  if (isAdmin2faEnabled()) {
    if (!admin2faConfigured()) return res.redirect('/dashboard?err=2fa_setup');
    if (!verifyAdminTotp(totp)) return res.redirect('/dashboard?err=2fa');
  }
  const cookie = signDashboardSession(key.slice(0, 6));
  res.setHeader('Set-Cookie', `mt_admin_dash=${encodeURIComponent(cookie)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=7200${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  return res.redirect('/dashboard');
});

app.get('/dashboard', requireAustralianAdmin, (req, res) => {
  const cookies = parseCookies(req);
  const sessionOk = verifyDashboardSession(cookies.mt_admin_dash);
  const headerKey = req.headers['x-admin-key'];
  const queryKey = req.query.key;
  const legacyKeyOk =
    !isAdmin2faEnabled() && (isValidAdminKey(headerKey) || isValidAdminKey(queryKey));

  if (sessionOk || legacyKeyOk) {
    res.sendFile(path.join(__dirname, 'static', 'dashboard.html'));
    return;
  }

  const err = String(req.query.err || '');
  const errMsg =
    err === 'key' ? '<p style="color:#f66;margin:0 0 .5rem">Invalid admin key.</p>' :
    err === '2fa' ? '<p style="color:#f66;margin:0 0 .5rem">Invalid authenticator code.</p>' :
    err === '2fa_setup' ? '<p style="color:#f66;margin:0 0 .5rem">2FA not configured on server.</p>' : '';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>MT Admin — Login</title>
<style>body{font-family:system-ui;background:#111;color:#ddd;display:flex;align-items:center;justify-content:center;height:100vh;margin:0} .box{background:#1a1a1f;border:1px solid #333;padding:2rem;border-radius:12px;max-width:380px;width:100%;text-align:center} input{width:100%;padding:.6rem;background:#111;border:1px solid #444;color:#fff;margin:.5rem 0;border-radius:6px} button{background:#10b981;color:#000;padding:.6rem 1.2rem;border:none;border-radius:6px;font-weight:600;cursor:pointer;width:100%;margin-top:.5rem} .note{font-size:.8rem;opacity:.7;margin-top:1rem}</style>
</head><body>
<div class="box">
  <h2 style="margin:0 0 1rem">MT Admin</h2>
  <p style="margin:0 0 1rem">Australian staff · admin key + authenticator</p>
  ${errMsg}
  <form method="POST" action="/dashboard/login">
    <input name="key" type="password" placeholder="ADMIN_API_KEY or TEST_API_KEY" autocomplete="current-password" required>
    <input name="totp" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="6-digit 2FA code" autocomplete="one-time-code">
    <button type="submit">Login</button>
  </form>
  <div class="note">
    Use Google Authenticator, Authy, or 1Password for the 6-digit code.<br>
    Public sample data: <a href="/api/geo" style="color:#10b981">/api/geo</a>
  </div>
  <div style="margin-top:1rem;font-size:.75rem;opacity:.6">
    <a href="/staff" style="color:#10b981;text-decoration:underline">Staff Portal</a>
  </div>
</div>
</body></html>`);
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
  console.log('Protected endpoints require X-Admin-Key header (or ?key=). TEST_API_KEY also works for developer read access.');
  console.log('WebSocket live updates (globe + events) available on same port');
  if (TEST_API_KEY) console.log('TEST_API_KEY configured for limited developer testing (does not expose master ADMIN_API_KEY)');
  console.log('Staff Portal (new, additive): /staff  or  https://admin.futuret3ch.com.au/static/staff.html');
  console.log('Staff API: POST /api/staff/login  |  X-Staff-Token header for /api/staff/*');
});
