require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./src/db');

const app = express();
const PORT = process.env.PORT || 4003;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-key-change-me';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(express.json({ limit: '1mb' }));

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
    const event = {
      id: uuidv4(),
      ts: Date.now(),
      source: req.body.source || 'web-unknown', // 'web-marketing', 'web-wallet', 'game-pet', 'pm2', etc.
      type: req.body.type || 'pageview',        // 'pageview', 'vital', 'custom', 'error', 'game_event'
      path: req.body.path || req.body.url || '/',
      referrer: req.body.referrer || '',
      ua: req.body.ua || req.get('user-agent') || '',
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      session_id: req.body.session_id || null,
      user_id: req.body.user_id || null,
      data: req.body.data || {}   // flexible: { fcp: 123, lcp: 456, ... } or { game: 'pet', action: 'feed' }
    };

    db.insertEvent(event);

    // Future: emit to websockets for real-time dashboard, trigger webhooks for Telegram/Discord bots
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
          <div onclick="showTab('performance')" class="tab" id="tab-performance">Performance (Speed Insights)</div>
          <div onclick="showTab('traffic')" class="tab" id="tab-traffic">Traffic</div>
          <div onclick="showTab('firewall')" class="tab" id="tab-firewall">Firewall / Rules</div>
          <div onclick="showTab('events')" class="tab" id="tab-events">Events / Audit</div>
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
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`MT Admin API running on port ${PORT}`);
  console.log('Dashboard: /dashboard (use ?key= or X-Admin-Key header for full data)');
  console.log('Protected endpoints require X-Admin-Key header (or ?key=)');
});
