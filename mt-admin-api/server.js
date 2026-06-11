require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const geoip = require('geoip-lite');
const WebSocket = require('ws');
const db = require('./src/db');

const app = express();
const PORT = process.env.PORT || 4003;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-key-change-me';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

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

// Serve static assets for tester pages etc. (e.g. /static/admin_messages.html)
// This must come early so it is not caught by later proxy or catch-all logic.
// Testers rely on https://admin.futuret3ch.com.au/static/admin_messages.html — do not break this path.
const path = require('path');
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

// Simple API key middleware for admin / internal sources (games, bots, SDKs)
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key === ADMIN_API_KEY) return next();
  res.status(401).json({ error: 'Unauthorized - invalid admin key' });
}

// Public tracking endpoint (used by web trackers in playgrounds + future SDKs)
// No key required for basic tracking (can add rate limiting / bot detection later)
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

// Admin-only endpoints (protected by key) - the "master admin system"
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

// Basic firewall / traffic / bot section (expand later with rules engine)
app.get('/api/admin/traffic', requireAdminKey, (req, res) => {
  res.json(db.getTrafficSummary(req.query));
});

app.post('/api/admin/rule', requireAdminKey, (req, res) => {
  // Simple rule: { type: 'block_ip' | 'rate_limit', value: '1.2.3.4', note: '' }
  const rule = db.addRule(req.body);
  res.json({ ok: true, rule });
});

app.get('/api/admin/rules', requireAdminKey, (req, res) => {
  res.json(db.getRules());
});

app.get('/api/admin/geo', requireAdminKey, (req, res) => {
  res.json(db.getRecentGeoEvents(parseInt(req.query.limit) || 300));
});

// Public test version (remove or protect later if needed)
app.get('/api/geo', (req, res) => {
  res.json(db.getRecentGeoEvents(parseInt(req.query.limit) || 50));
});

// Live geo data for the globe (recent events with lat/lon + botScore)
app.get('/api/admin/geo', requireAdminKey, (req, res) => {
  res.json(db.getRecentGeoEvents(parseInt(req.query.limit) || 300));
});

// Also expose a simple public-ish version for testing (remove or protect in prod if needed)
app.get('/api/geo', (req, res) => {
  res.json(db.getRecentGeoEvents(parseInt(req.query.limit) || 50));
});

// Health + future extensibility (webhooks, SDK info)
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'mt-admin-api', time: Date.now() }));

// Simple self-contained dashboard (major admin system - self-hosted, unified for MT ecosystem, no third parties)
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>MT Admin — Master Observatory (Playgrounds)</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; }
        .metric { font-variant-numeric: tabular-nums; }
        .tab { padding: 0.5rem 1rem; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab.active { border-bottom: 2px solid #10b981; color: #10b981; }
        .section { display: none; }
        .section.active { display: block; }
        .card { background: #18181b; border: 1px solid #27272a; border-radius: 1rem; padding: 1rem; }
        .res-good { color: #10b981; }
        .res-ok { color: #eab308; }
        .res-poor { color: #ef4444; }
      </style>
    </head>
    <body class="bg-zinc-950 text-white p-6">
      <div class="max-w-7xl mx-auto">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">MT Admin</h1>
            <p class="text-zinc-400 text-sm">Self-hosted Master Observatory for MT-ECO SYSTEM Playgrounds</p>
            <p class="text-emerald-400 text-xs">memetorrent + wallet • no third parties</p>
          </div>
          <div class="text-right">
            <div class="text-emerald-400">● LIVE</div>
            <div class="text-xs text-zinc-500">Sources: web-marketing, web-wallet, game-*, pm2, mt-core, mt-auth</div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 mb-4 border-b border-zinc-800">
          <div onclick="showTab('analytics')" class="tab active" id="tab-analytics">Analytics</div>
          <div onclick="showTab('globe')" class="tab" id="tab-globe">🌍 Live Globe</div>
          <div onclick="showTab('performance')" class="tab" id="tab-performance">Performance (Speed Insights)</div>
          <div onclick="showTab('traffic')" class="tab" id="tab-traffic">Traffic</div>
          <div onclick="showTab('firewall')" class="tab" id="tab-firewall">Firewall / Rules</div>
          <div onclick="showTab('events')" class="tab" id="tab-events">Events / Audit</div>
          <div onclick="showTab('api')" class="tab" id="tab-api">API Playground</div>
        </div>

        <!-- ANALYTICS -->
        <div id="section-analytics" class="section active">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="card">
              <div class="text-xs text-zinc-400">Total Events (7d)</div>
              <div id="total-events" class="text-4xl font-semibold metric">--</div>
            </div>
            <div class="card">
              <div class="text-xs text-zinc-400">Unique Sessions</div>
              <div id="unique-sessions" class="text-4xl font-semibold metric">--</div>
            </div>
            <div class="card">
              <div class="text-xs text-zinc-400">Top Source</div>
              <div id="top-source" class="text-2xl font-semibold">--</div>
            </div>
            <div class="card">
              <div class="text-xs text-zinc-400">Last Event</div>
              <div id="last-event" class="text-sm text-zinc-400">--</div>
            </div>
          </div>

          <div class="card mb-6">
            <div class="font-semibold mb-2">Events by Source</div>
            <canvas id="source-chart" height="80"></canvas>
          </div>
        </div>

        <!-- PERFORMANCE -->
        <div id="section-performance" class="section">
          <div class="flex items-center gap-3 mb-4">
            <div class="font-semibold">Real User Performance (like Speed Insights)</div>
            <select id="vitals-range" class="bg-zinc-900 border border-zinc-700 text-sm px-2 py-1 rounded" onchange="loadVitals()">
              <option value="7d">Last 7 days</option>
              <option value="24h">Last 24h</option>
            </select>
          </div>

          <div class="card mb-6">
            <div class="text-sm mb-2">Real Experience Score (RES) — overall UX (target >90)</div>
            <div id="res-score" class="text-6xl font-bold">--</div>
            <div class="text-xs text-zinc-400">Based on vitals thresholds (LCP, INP, CLS, etc.)</div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6" id="vitals-grid"></div>

          <div class="text-xs text-zinc-400">Collects from browser PerformanceObserver in playgrounds. Send custom vitals from games/PM2 too.</div>
        </div>

        <!-- TRAFFIC -->
        <div id="section-traffic" class="section">
          <div class="card">
            <div class="font-semibold mb-3">Top Paths & User Agents (from web events)</div>
            <div id="traffic" class="text-sm grid grid-cols-1 md:grid-cols-2 gap-4"></div>
          </div>
        </div>

        <!-- FIREWALL / RULES -->
        <div id="section-firewall" class="section">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card">
              <div class="font-semibold mb-3">Active Rules (block/rate/challenge)</div>
              <div id="rules-list" class="text-sm"></div>
              <div class="mt-4">
                <div class="text-xs mb-1">Add Rule</div>
                <div class="flex gap-2">
                  <select id="rule-type" class="bg-zinc-900 border border-zinc-700 text-xs p-1 rounded">
                    <option value="block_ip">Block IP</option>
                    <option value="rate_limit">Rate Limit (IP)</option>
                    <option value="challenge_ua">Challenge UA (bot)</option>
                  </select>
                  <input id="rule-value" placeholder="value (e.g. 1.2.3.4)" class="flex-1 bg-zinc-900 border border-zinc-700 text-xs p-1 rounded">
                  <input id="rule-note" placeholder="note" class="flex-1 bg-zinc-900 border border-zinc-700 text-xs p-1 rounded">
                  <button onclick="addRule()" class="px-3 py-1 bg-emerald-600 text-xs rounded">Add</button>
                </div>
              </div>
            </div>
            <div class="card">
              <div class="font-semibold mb-3">Recent Traffic / Audit (web + future nginx logs)</div>
              <div id="traffic-audit" class="text-xs max-h-64 overflow-auto"></div>
            </div>
          </div>
          <div class="mt-4 text-xs text-zinc-400">Rules can be enforced in future middleware or nginx. Bots detected from UA + rate.</div>
        </div>

        <!-- EVENTS -->
        <div id="section-events" class="section">
          <div class="card">
            <div class="flex justify-between mb-3">
              <div class="font-semibold">Recent Events (all sources)</div>
              <button onclick="loadEvents()" class="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded">Refresh</button>
            </div>
            <div id="events-table" class="overflow-auto max-h-80 text-sm"></div>
          </div>
        </div>

        <!-- LIVE GLOBE - full real-time 3D globe with red dots as events happen (bots = brighter red) -->
        <div id="section-globe" class="section">
          <div class="card">
            <div class="flex justify-between items-center mb-3">
              <div>
                <div class="font-semibold">Live Globe — Events as they happen</div>
                <div class="text-xs text-zinc-400">Red dots appear in real-time from the WebSocket feed. Brighter = higher bot score. Click dot for details. Self-hosted, no third-party maps.</div>
              </div>
              <div class="text-xs">
                <button onclick="toggleGlobeRotation()" class="px-2 py-1 border border-white/20 rounded">Pause/Play Rotation</button>
                <button onclick="clearGlobeDots()" class="px-2 py-1 border border-white/20 rounded ml-1">Clear Dots</button>
              </div>
            </div>
            <div id="globe-container" style="width:100%; height:520px; background:#000; border-radius:12px; overflow:hidden; position:relative;">
              <canvas id="globe-canvas" style="width:100%; height:100%; display:block;"></canvas>
              <div id="globe-tooltip" style="position:absolute; display:none; background:#111; border:1px solid #333; padding:6px 10px; border-radius:6px; font-size:12px; pointer-events:none; z-index:10;"></div>
            </div>
            <div class="mt-2 text-xs text-zinc-400">Live dots are pushed via WebSocket from every /api/track. Geo resolved with self-hosted geoip-lite. Filter by source in Analytics above.</div>
          </div>
        </div>

        <!-- API PLAYGROUND - developers can copy & run everything -->
        <div id="section-api" class="section">
          <div class="card">
            <div class="font-semibold mb-2">API Playground — Copy & Run (self-hosted, no keys needed for /track)</div>
            <div class="text-xs mb-3 opacity-70">All endpoints. Paste your ADMIN_API_KEY for protected calls. Everything the Vercel dashboard has, plus more (globe, bot scoring, custom sources).</div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Track -->
              <div class="border border-white/10 rounded p-3">
                <div class="font-medium text-emerald-400">POST /api/track (public)</div>
                <pre class="text-[10px] bg-black p-2 rounded mt-1 overflow-auto">fetch('/api/track', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    source: 'game-pet',
    type: 'harvest',
    path: '/garden',
    data: { rockets: 42, user: 'demo' }
  })
}).then(r => r.json()).then(console.log)</pre>
                <button onclick="tryTrack()" class="mt-2 text-xs px-3 py-1 bg-emerald-600 rounded">Run Example</button>
              </div>

              <!-- Overview -->
              <div class="border border-white/10 rounded p-3">
                <div class="font-medium text-emerald-400">GET /api/admin/overview</div>
                <pre class="text-[10px] bg-black p-2 rounded mt-1 overflow-auto">fetch('/api/admin/overview?range=7d&key=YOUR_KEY')
  .then(r => r.json()).then(console.log)</pre>
                <button onclick="tryOverview()" class="mt-2 text-xs px-3 py-1 bg-emerald-600 rounded">Run</button>
              </div>

              <!-- Geo (for globe) -->
              <div class="border border-white/10 rounded p-3">
                <div class="font-medium text-emerald-400">GET /api/admin/geo (live globe data)</div>
                <pre class="text-[10px] bg-black p-2 rounded mt-1 overflow-auto">fetch('/api/admin/geo?limit=200&key=YOUR_KEY')
  .then(r => r.json()).then(d => console.log('Dots for globe:', d.length))</pre>
                <button onclick="tryGeo()" class="mt-2 text-xs px-3 py-1 bg-emerald-600 rounded">Run</button>
              </div>

              <!-- Vitals -->
              <div class="border border-white/10 rounded p-3">
                <div class="font-medium text-emerald-400">GET /api/admin/vitals (RES like Vercel Speed Insights)</div>
                <pre class="text-[10px] bg-black p-2 rounded mt-1 overflow-auto">fetch('/api/admin/vitals?key=YOUR_KEY').then(r=>r.json()).then(console.log)</pre>
                <button onclick="tryVitals()" class="mt-2 text-xs px-3 py-1 bg-emerald-600 rounded">Run</button>
              </div>
            </div>

            <div class="mt-3 text-xs">More endpoints: /api/admin/events, /traffic, /rules, POST /rule. Full source in mt-admin-api/server.js + src/db.js. Use the key from .env for protected calls.</div>
          </div>
        </div>

        <div class="mt-8 text-[10px] text-zinc-500">
          Self-hosted • Unified across marketing, wallet, games, core, auth • Webhooks for Telegram/Discord • Future SDKs for iOS/Android/widgets
        </div>
      </div>

      <script>
        const API_BASE = ''; // same origin or https://admin.futuret3ch.com.au
        let ADMIN_KEY = '';
        let charts = {};

        function promptKey() {
          ADMIN_KEY = prompt('Enter X-Admin-Key (from .env) for full data, or Cancel for limited view', 'dev-key-change-me') || '';
        }

        async function loadOverview() {
          const res = await fetch(API_BASE + '/api/admin/overview?range=7d' + (ADMIN_KEY ? '&key=' + ADMIN_KEY : ''));
          if (!res.ok) return;
          const data = await res.json();
          document.getElementById('total-events').textContent = (data.totalEvents || 0).toLocaleString();
          document.getElementById('unique-sessions').textContent = (data.uniqueSessions || 0).toLocaleString();
          document.getElementById('top-source').textContent = data.bySource?.[0]?.source || '—';
          document.getElementById('last-event').textContent = data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : '—';

          // source chart
          if (charts.source) charts.source.destroy();
          const ctx = document.getElementById('source-chart');
          if (ctx) {
            charts.source = new Chart(ctx, {
              type: 'bar',
              data: {
                labels: (data.bySource || []).map(s => s.source),
                datasets: [{ label: 'Events', data: (data.bySource || []).map(s => s.count), backgroundColor: '#10b981' }]
              },
              options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
            });
          }
        }

        async function loadVitals() {
          const range = document.getElementById('vitals-range')?.value || '7d';
          const res = await fetch(API_BASE + '/api/admin/vitals?range=' + range + (ADMIN_KEY ? '&key=' + ADMIN_KEY : ''));
          if (!res.ok) return;
          const data = await res.json();
          const grid = document.getElementById('vitals-grid');
          if (!grid) return;
          grid.innerHTML = '';

          const metrics = [
            {k: 'fcp_p75', l: 'FCP (P75 ms)'},
            {k: 'lcp_p75', l: 'LCP (P75 ms)'},
            {k: 'inp_p75', l: 'INP (P75 ms)'},
            {k: 'cls_p75', l: 'CLS (P75)'},
            {k: 'fid_p75', l: 'FID (P75 ms)'},
            {k: 'ttfb_p75', l: 'TTFB (P75 ms)'}
          ];

          const resEl = document.createElement('div');
          resEl.className = 'col-span-full mb-2 text-center';
          const resVal = data.res || 0;
          let resClass = 'res-good';
          if (resVal < 90) resClass = 'res-ok';
          if (resVal < 50) resClass = 'res-poor';
          resEl.innerHTML = \`<div class="text-sm">Real Experience Score (RES): <span class="\${resClass} text-4xl font-bold">\${resVal}</span> <span class="text-xs">(>90 great)</span></div>\`;
          grid.appendChild(resEl);

          metrics.forEach(m => {
            const v = data[m.k] != null ? (m.k.includes('cls') ? data[m.k].toFixed(3) : Math.round(data[m.k])) : '—';
            const div = document.createElement('div');
            div.className = 'card text-center';
            div.innerHTML = \`<div class="text-[10px] text-zinc-400">\${m.l}</div><div class="text-2xl font-semibold mt-1">\${v}</div>\`;
            grid.appendChild(div);
          });
        }

        async function loadTraffic() {
          const res = await fetch(API_BASE + '/api/admin/traffic?range=7d' + (ADMIN_KEY ? '&key=' + ADMIN_KEY : ''));
          if (!res.ok) return;
          const data = await res.json();
          const el = document.getElementById('traffic');
          if (!el) return;
          let html = '<div class="grid grid-cols-1 gap-2">';
          html += '<div><b>Top Paths</b><br>' + (data.topPaths || []).map(p => \`\${p.path} — \${p.count}\`).join('<br>') + '</div>';
          html += '<div><b>Top UAs (bots highlighted)</b><br>' + (data.topUAs || []).map(u => {
            const isBot = /bot|crawler|spider/i.test(u.ua);
            return \`<span class="\${isBot ? 'text-red-400' : ''}">\${u.ua.slice(0,60)} — \${u.count}</span>\`;
          }).join('<br>') + '</div>';
          if (data.botRequests) html += \`<div class="text-red-400 mt-2">Bot-like requests detected: \${data.botRequests}</div>\`;
          html += '</div>';
          el.innerHTML = html;
        }

        async function loadEvents() {
          const res = await fetch(API_BASE + '/api/admin/events?limit=40' + (ADMIN_KEY ? '&key=' + ADMIN_KEY : ''));
          if (!res.ok) return;
          const data = await res.json();
          const el = document.getElementById('events-table');
          if (!el) return;
          if (!data.length) { el.innerHTML = '<div class="text-zinc-400">No events yet. Track from sites/games.</div>'; return; }
          let html = '<table class="w-full text-xs"><tr class="text-zinc-400"><th>Time</th><th>Source</th><th>Type</th><th>Path</th><th>Data</th></tr>';
          data.forEach(e => {
            const d = e.data && Object.keys(e.data).length ? JSON.stringify(e.data).slice(0,70) : '';
            html += \`<tr class="border-t border-zinc-800"><td>\${new Date(e.ts).toLocaleTimeString()}</td><td class="font-mono text-emerald-400">\${e.source}</td><td>\${e.type}</td><td class="truncate max-w-[180px]">\${e.path}</td><td class="text-zinc-400">\${d}</td></tr>\`;
          });
          html += '</table>';
          el.innerHTML = html;
        }

        async function loadRules() {
          const res = await fetch(API_BASE + '/api/admin/rules' + (ADMIN_KEY ? '?key=' + ADMIN_KEY : ''));
          if (!res.ok) return;
          const data = await res.json();
          const el = document.getElementById('rules-list');
          if (!el) return;
          if (!data.length) { el.innerHTML = '<div class="text-zinc-400">No rules yet.</div>'; return; }
          el.innerHTML = data.map(r => \`<div class="flex justify-between py-0.5 text-xs"><span>\${r.type}: \${r.value}</span><span class="text-zinc-400">\${r.note || ''}</span></div>\`).join('');
        }

        async function addRule() {
          const type = document.getElementById('rule-type')?.value;
          const value = document.getElementById('rule-value')?.value;
          const note = document.getElementById('rule-note')?.value;
          if (!type || !value) return alert('Type and value required');
          await fetch(API_BASE + '/api/admin/rule' + (ADMIN_KEY ? '?key=' + ADMIN_KEY : ''), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({type, value, note})
          });
          loadRules();
        }

        function showTab(tab) {
          document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.getElementById('section-' + tab).classList.add('active');
          document.getElementById('tab-' + tab).classList.add('active');
        }

        async function init() {
          if (!ADMIN_KEY) promptKey();
          await loadOverview();
          await loadVitals();
          await loadTraffic();
          await loadEvents();
          await loadRules();

          // auto refresh
          setInterval(() => {
            loadOverview();
            loadVitals();
            loadTraffic();
            loadEvents();
          }, 25000);

          // default tab
          showTab('analytics');
        }

        function promptKey() {
          ADMIN_KEY = prompt('Enter X-Admin-Key from .env for full admin data (or cancel for public view)', 'dev-key-change-me') || '';
        }

        // init on load
        window.onload = init;

        // ==================== FULL AMBITIOUS LIVE GLOBE (self-contained 2D canvas, real-time dots) ====================
        let globeCanvas, globeCtx, globeDots = [], globeAngle = 0, globeAnimating = true, globeWS;

        function initGlobe() {
          globeCanvas = document.getElementById('globe-canvas');
          if (!globeCanvas) return;
          globeCtx = globeCanvas.getContext('2d');
          globeCanvas.width = 820;
          globeCanvas.height = 520;

          // mouse drag
          let drag = false, last = 0;
          globeCanvas.addEventListener('mousedown', e => { drag = true; last = e.clientX; });
          window.addEventListener('mouseup', () => drag = false);
          globeCanvas.addEventListener('mousemove', e => {
            if (!drag) return;
            globeAngle += (e.clientX - last) * 0.006;
            last = e.clientX;
            drawGlobe();
          });

          // live WS
          try {
            const p = location.protocol === 'https:' ? 'wss:' : 'ws:';
            globeWS = new WebSocket(`${p}//${location.host}`);
            globeWS.onmessage = ev => {
              try {
                const m = JSON.parse(ev.data);
                if (m.type === 'new_event' && m.event && m.event.data && m.event.data.geo) {
                  addGlobeDot(m.event);
                }
              } catch(e){}
            };
          } catch(e){}

          loadGlobeInitial();
          setInterval(drawGlobe, 60);
          drawGlobe();
        }

        function drawGlobe() {
          if (!globeCtx) return;
          const w = globeCanvas.width, h = globeCanvas.height, cx = w/2, cy = h/2, r = 195;
          globeCtx.fillStyle = '#05070a'; globeCtx.fillRect(0,0,w,h);

          // globe
          globeCtx.strokeStyle = '#112233'; globeCtx.lineWidth = 1.5;
          globeCtx.beginPath(); globeCtx.arc(cx, cy, r, 0, Math.PI*2); globeCtx.stroke();

          // latitude
          for (let i = -7; i <= 7; i++) {
            const y = cy + i * 18;
            const rw = Math.sqrt(r*r - (y-cy)*(y-cy));
            if (rw > 2) {
              globeCtx.beginPath(); globeCtx.arc(cx, y, rw, 0, Math.PI*2); globeCtx.stroke();
            }
          }

          // live dots
          const now = Date.now();
          globeDots = globeDots.filter(d => now - d.ts < 38000);
          globeDots.forEach(d => {
            const age = (now - d.ts) / 38000;
            const alpha = Math.max(0.15, 1 - age);
            const isBot = d.botScore > 35;
            globeCtx.fillStyle = isBot ? `rgba(255,40,40,${alpha})` : `rgba(255,90,90,${alpha})`;
            const size = isBot ? 5.5 : 3.8;
            const x = cx + Math.cos((d.lon + globeAngle) * Math.PI/180) * (r * Math.cos(d.lat * Math.PI/180));
            const y = cy + Math.sin(d.lat * Math.PI/180) * (r * 0.55);
            globeCtx.beginPath(); globeCtx.arc(x, y, size, 0, Math.PI*2); globeCtx.fill();
            if (isBot) {
              globeCtx.strokeStyle = `rgba(255,40,40,${alpha*0.6})`; globeCtx.lineWidth = 1.5;
              globeCtx.beginPath(); globeCtx.arc(x, y, size+3, 0, Math.PI*2); globeCtx.stroke();
            }
            d.screenX = x; d.screenY = y;
          });

          // labels
          globeCtx.fillStyle = '#556677'; globeCtx.font = '11px system-ui';
          globeCtx.fillText('LIVE GLOBE — red dots = real /api/track events (brighter = bot)', 18, 24);
          globeCtx.fillText('Drag to rotate • WS live updates • Self-hosted geoip', 18, h-18);
        }

        function addGlobeDot(ev) {
          if (!ev.data || !ev.data.geo) return;
          const g = ev.data.geo;
          globeDots.push({
            lat: g.lat, lon: g.lon, ts: Date.now(),
            source: ev.source, type: ev.type, path: ev.path,
            botScore: ev.data.botScore || 0,
            ip: ev.ip
          });
          drawGlobe();
        }

        async function loadGlobeInitial() {
          if (!ADMIN_KEY) return;
          try {
            const r = await fetch(`/api/admin/geo?limit=180&key=${ADMIN_KEY}`);
            if (!r.ok) return;
            const list = await r.json();
            list.forEach(ev => addGlobeDot(ev));
            drawGlobe();
          } catch(e){}
        }

        function initGlobeFallback(c) { /* basic if needed */ }

        // ==================== API PLAYGROUND ====================
        function initAPIPlayground() {}

        async function tryTrack() {
          const r = await fetch('/api/track', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({source:'game-pet',type:'harvest',path:'/garden',data:{rockets:42}})});
          alert('Track OK: ' + JSON.stringify(await r.json()));
        }
        async function tryOverview() {
          const k = ADMIN_KEY || prompt('Key');
          const r = await fetch(`/api/admin/overview?key=${k}`); console.log(await r.json()); alert('See console + Events');
        }
        async function tryGeo() {
          const k = ADMIN_KEY || prompt('Key');
          const r = await fetch(`/api/admin/geo?limit=60&key=${k}`); const d=await r.json(); console.log(d); alert(d.length + ' geo points');
        }
        async function tryVitals() {
          const k = ADMIN_KEY || prompt('Key');
          const r = await fetch(`/api/admin/vitals?key=${k}`); console.log(await r.json()); alert('Vitals+RES in console');
        }

        window.toggleGlobeRotation = () => { globeRotating = !globeRotating; };
        window.clearGlobeDots = () => { globeDots = []; drawGlobe(); };

        window.onload = init;
      </script>
    </body>
    </html>
  `);
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
