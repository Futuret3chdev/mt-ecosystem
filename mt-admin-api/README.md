# MT Admin API + Master Dashboard

Self-hosted, custom-built observability and admin system for the MT-ECO SYSTEM playgrounds (memetorrent.futuret3ch.com.au and wallet.futuret3ch.com.au).

**No third parties.** Unlike Vercel Analytics, Speed Insights, or Cloudflare Firewall.

## Features (MVP and growing)

- **Custom Analytics**: Page views, sources (web-marketing, web-wallet, game-*, pm2, etc.), referrers, sessions.
- **Speed Insights equivalent**: Collect and aggregate Web Vitals (FCP, LCP, INP, CLS, FID, TTFB). Compute "Real Experience Score".
- **Traffic & Firewall-like**: Basic traffic summaries, top paths/UAs, rules engine (block IP, rate limit, challenge UA).
- **Bot Detection**: Simple UA + rate based (expandable).
- **Extensible**: Webhooks for Telegram/Discord bots, future SDKs for web/iOS/Android/widgets.
- **Master Admin Dashboard**: Observe everything in one place. Real-time-ish views, filters, exports.

## Architecture

- API: Node + Express + better-sqlite3 (fast embedded DB, self-hosted).
- Ingestion: Public /track endpoint (used by client trackers).
- Queries: Protected /api/admin/* with X-Admin-Key.
- Dashboard: Served from the API at `/dashboard` (self-contained HTML/JS).
- Static tester pages: `/static/*` (especially `/static/admin_messages.html`) is **reserved** and served statically by nginx (with Express fallback). Testers rely on https://admin.futuret3ch.com.au/static/admin_messages.html — this path must never be broken or proxied away.
- Storage: Local SQLite (easy to backup, move to Postgres later if needed).

## Setup (on your Contabo VPS or dev)

```bash
cd mt-admin-api
cp .env.example .env
# Edit .env with strong ADMIN_API_KEY and ALLOWED_ORIGINS (your playground domains + localhost)
npm install
npm run init-db
npm start
```

The API will run on port 4003 (or PORT).

Protect with nginx reverse proxy + your existing auth if desired (e.g. under admin.futuret3ch.com.au).

## Client Tracking (playgrounds only)

Add a small tracker to memetorrent-react and infinite-wallet (and future games).

Example (send to your admin API, e.g. https://admin.futuret3ch.com.au/api/track or direct VPS):

```js
// Simple tracker - send pageviews + vitals
function track(type, data = {}) {
  const payload = {
    source: 'web-marketing', // or 'web-wallet', 'game-pet', etc.
    type,
    path: window.location.pathname,
    referrer: document.referrer,
    ua: navigator.userAgent,
    session_id: sessionStorage.getItem('mt_session') || (sessionStorage.setItem('mt_session', crypto.randomUUID()), sessionStorage.getItem('mt_session')),
    data
  };
  navigator.sendBeacon('https://YOUR_ADMIN_API/api/track', JSON.stringify(payload));
}

// Page view
track('pageview');

// Vitals (use web-vitals lib in real)
import { onLCP, onINP, onCLS } from 'web-vitals';
onLCP((m) => track('vital', { lcp: m.value }));
// etc for FCP, INP, CLS, FID, TTFB
```

Send game events from PM2 apps or client: track('game_event', { game: 'pet', action: 'feed', value: 10 }).

## Dashboard

Visit /dashboard on the admin API (or mount it).

Shows:
- Overview (events, sessions, by source/type)
- Vitals / Speed Insights style (P75 for FCP/LCP/INP etc, RES-like score)
- Traffic (top paths, UAs)
- Rules management (add block/rate rules)
- Recent events

Real-time updates via polling.

Later: WebSocket for live, charts, filters by source (marketing vs wallet vs games), export CSV, alerts via webhooks.

## Firewall / Bot / Rules

Basic in-memory + DB rules.

Example rule: { "type": "block_ip", "value": "1.2.3.4", "note": "bad actor" }

In a future middleware or log shipper, apply rules.

For now, visible in dashboard and can be used by your nginx or apps.

Bot detection: simple UA contains bot/crawler + rate limit.

## Extensibility (the "unlike anyone has seen before" part)

- Sources: web, games (PM2), mt-core, mt-auth, future SDKs.
- Webhooks: on certain events (e.g. high traffic, new user, game milestone) POST to your Telegram/Discord bots.
- SDKs: Publish a tiny @mt-ecosystem/tracker for web, and later native for iOS/Android.
- Widgets: Embeddable admin views.
- Multi-platform: The same API powers web dashboard, bot commands (/stats, /block 1.2.3.4), mobile apps.

## Deployment

Run alongside your other services on the Contabo VPS.

Proxy through your existing nginx (e.g. admin.futuret3ch.com.au -> localhost:4003).

Use the same systemd style as mt-core/mt-auth.

Backup the .db file.

## Next (after basic works)

- Rich dashboard UI with Chart.js / Recharts (tabs: Analytics, Performance, Traffic, Firewall, Bots, Games, Wallet).
- Real Web Vitals + "Real Experience Score" calculation.
- Nginx log shipper -> /api/traffic-log (for accurate firewall/traffic beyond JS beacons).
- Rule engine enforcement (middleware or separate service).
- Webhook system + example Telegram bot.
- Auth for the admin UI (reuse mt-auth or simple).
- Export + alerts.

This is built to be the central nervous system for your entire ecosystem — observable, controllable, and extensible across everything you build.

No third parties. Everything yours.

---

Run `npm run init-db` after setting .env, then `npm start`.

Send test events:
curl -X POST http://localhost:4003/api/track -H "Content-Type: application/json" -d '{"source":"web-marketing","type":"pageview","path":"/","data":{}}'

Then hit /api/admin/overview?key=YOUR_KEY (or header).

Let's build something special.