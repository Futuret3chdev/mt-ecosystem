const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../mt-admin.db');
const db = new Database(DB_PATH);

// Enable WAL for better concurrency
db.pragma('journal_mode = WAL');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      source TEXT NOT NULL,
      type TEXT NOT NULL,
      path TEXT,
      referrer TEXT,
      ua TEXT,
      ip TEXT,
      session_id TEXT,
      user_id TEXT,
      data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,           -- 'block_ip', 'rate_limit', 'challenge_ua', etc.
      value TEXT NOT NULL,
      note TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS traffic_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      ip TEXT,
      ua TEXT,
      path TEXT,
      method TEXT,
      status INTEGER,
      source TEXT
    );
  `);
  console.log('MT Admin DB initialized at', DB_PATH);
}

function insertEvent(event) {
  const stmt = db.prepare(`
    INSERT INTO events (id, ts, source, type, path, referrer, ua, ip, session_id, user_id, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    event.id,
    event.ts,
    event.source,
    event.type,
    event.path || null,
    event.referrer || null,
    event.ua || null,
    event.ip || null,
    event.session_id || null,
    event.user_id || null,
    JSON.stringify(event.data || {})
  );
}

function getOverview(range = '7d') {
  const since = Date.now() - (range === '24h' ? 86400000 : 7 * 86400000);

  const total = db.prepare('SELECT COUNT(*) as count FROM events WHERE ts > ?').get(since).count;
  const uniqueSessions = db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM events WHERE ts > ? AND session_id IS NOT NULL').get(since).count;
  const bySource = db.prepare(`
    SELECT source, COUNT(*) as count 
    FROM events 
    WHERE ts > ? 
    GROUP BY source 
    ORDER BY count DESC
  `).all(since);

  const byType = db.prepare(`
    SELECT type, COUNT(*) as count 
    FROM events 
    WHERE ts > ? 
    GROUP BY type 
    ORDER BY count DESC
  `).all(since);

  return {
    range,
    totalEvents: total,
    uniqueSessions,
    bySource,
    byType,
    lastUpdated: Date.now()
  };
}

function getEvents({ source, type, limit = 100, offset = 0 }) {
  let query = 'SELECT * FROM events WHERE 1=1';
  const params = [];

  if (source) {
    query += ' AND source = ?';
    params.push(source);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY ts DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    data: r.data ? JSON.parse(r.data) : {}
  }));
}

function getVitalsSummary(filters = {}) {
  const since = Date.now() - (filters.range === '24h' ? 86400000 : 7*86400000);
  const vitals = db.prepare(`
    SELECT data 
    FROM events 
    WHERE type = 'vital' AND ts > ?
  `).all(since);

  const metrics = { fcp: [], lcp: [], inp: [], cls: [], fid: [], ttfb: [] };

  vitals.forEach(v => {
    try {
      const d = JSON.parse(v.data);
      if (d.fcp) metrics.fcp.push(d.fcp);
      if (d.lcp) metrics.lcp.push(d.lcp);
      if (d.inp) metrics.inp.push(d.inp);
      if (d.cls) metrics.cls.push(d.cls);
      if (d.fid) metrics.fid.push(d.fid);
      if (d.ttfb) metrics.ttfb.push(d.ttfb);
    } catch (_) {}
  });

  const p75 = arr => arr.length ? arr.sort((a,b)=>a-b)[Math.floor(arr.length * 0.75)] : null;

  const fcp = p75(metrics.fcp);
  const lcp = p75(metrics.lcp);
  const inp = p75(metrics.inp);
  const cls = p75(metrics.cls);
  const fid = p75(metrics.fid);
  const ttfb = p75(metrics.ttfb);

  // Simple RES calculation (like Vercel, 0-100, weighted)
  let score = 100;
  if (lcp > 2500) score -= 20;
  if (lcp > 4000) score -= 20;
  if (inp > 200) score -= 15;
  if (cls > 0.1) score -= 15;
  if (fcp > 1800) score -= 10;
  if (fid > 100) score -= 10;
  if (ttfb > 800) score -= 10;
  const res = Math.max(0, Math.round(score));

  return {
    fcp_p75: fcp,
    lcp_p75: lcp,
    inp_p75: inp,
    cls_p75: cls,
    fid_p75: fid,
    ttfb_p75: ttfb,
    res,
    sampleSize: vitals.length
  };
}

function getTrafficSummary(filters = {}) {
  const since = Date.now() - (filters.range === '24h' ? 86400000 : 7*86400000);
  const topPaths = db.prepare(`
    SELECT path, COUNT(*) as count 
    FROM events 
    WHERE ts > ? 
    GROUP BY path 
    ORDER BY count DESC 
    LIMIT 20
  `).all(since);

  const topUAs = db.prepare(`
    SELECT ua, COUNT(*) as count 
    FROM events 
    WHERE ts > ? 
    GROUP BY ua 
    ORDER BY count DESC 
    LIMIT 10
  `).all(since);

  // Simple bot detection
  const bots = topUAs.filter(u => /bot|crawler|spider|headless|headlesschrome/i.test(u.ua)).reduce((s, u) => s + u.count, 0);

  return { topPaths, topUAs, totalRequests: topPaths.reduce((s, p) => s + p.count, 0), botRequests: bots };
}

function addRule(rule) {
  const stmt = db.prepare('INSERT INTO rules (type, value, note) VALUES (?, ?, ?)');
  const info = stmt.run(rule.type, rule.value, rule.note || '');
  return { id: info.lastInsertRowid, ...rule };
}

function getRules() {
  return db.prepare('SELECT * FROM rules ORDER BY created_at DESC').all();
}

module.exports = {
  initDB,
  insertEvent,
  getOverview,
  getEvents,
  getVitalsSummary,
  getTrafficSummary,
  addRule,
  getRules
};
