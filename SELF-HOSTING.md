# Self-Hosting MT ECO SYSTEM on Contabo (or any VPS)

This is the recommended path for "our network" ownership.

## Recommended Architecture
- **Backend services on Contabo VPS**:
  - mt-core (port 4000) - native chain
  - mt-auth (port 4002) - accounts + encrypted wallet backups (use 4001/4002 or free ports that don't collide)
- **Frontend**:
  - Keep `infinite-wallet` on Vercel (easy) and point it at your VPS via env vars.
  - Or serve static build from VPS with nginx.

## 1. Prepare the VPS (Contabo Ubuntu example)
```bash
apt update && apt upgrade -y
apt install -y nodejs npm git nginx certbot python3-certbot-nginx
# Install Node 20+ if needed (nodesource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

## 2. Clone & Install
```bash
git clone https://github.com/Futuret3chdev/mt-ecosystem.git /opt/mt-ecosystem
cd /opt/mt-ecosystem

# mt-core
cd mt-core
npm install
# Create data dir (persistence)
mkdir -p data

# mt-auth
cd ../mt-auth
npm install
mkdir -p data
cp .env.example .env  # edit PORT=4002, CORS, DATA_DIR

```

## 3. Run with systemd (recommended over PM2 for simplicity)

Create `/etc/systemd/system/mt-core.service`:
```ini
[Unit]
Description=MT Core Native Chain
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mt-ecosystem/mt-core
Environment=NODE_ENV=production
Environment=PORT=4000
Environment=CORS_ORIGINS=https://infinite-wallet.vercel.app,https://yourdomain.com
Environment=DATA_DIR=/opt/mt-ecosystem/mt-core/data
ExecStart=/usr/bin/node node.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Similar for `mt-auth.service` (PORT=4002 recommended, DATA_DIR=/opt/mt-ecosystem/mt-auth/data, WorkingDirectory for mt-auth, ExecStart node server.js).

```bash
systemctl daemon-reload
systemctl enable --now mt-core
systemctl enable --now mt-auth
```

## 4. Nginx + SSL (for auth.futuret3ch.com.au + api.futuret3ch.com.au)
Use the ready confs in `mt-core/nginx/` (recommended):

```bash
cd /opt/mt-ecosystem
git pull
cd mt-core/nginx
sudo cp mt-core.conf /etc/nginx/sites-available/mt-core
sudo cp mt-auth.conf /etc/nginx/sites-available/mt-auth
sudo ln -s /etc/nginx/sites-available/mt-core /etc/nginx/sites-enabled/ 2>/dev/null || true
sudo ln -s /etc/nginx/sites-available/mt-auth /etc/nginx/sites-enabled/ 2>/dev/null || true
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d auth.futuret3ch.com.au -d api.futuret3ch.com.au
```

(Or manually place the server blocks with correct `server_name api.futuret3ch.com.au;` proxying 127.0.0.1:4001, and separate for auth on 4002.)

## 5. Point the Wallet frontend (Vercel custom domain + env)
**wallet.futuret3ch.com.au must be validated in Vercel** (this is the current "Invalid Configuration" issue if DNS is wrong).

- In DNS: DELETE any A record (and any wrong/old CNAME) pointing `wallet` at the VPS IP or using the full name in the host field.
- In Vercel infinite-wallet project Domains: add/connect `wallet.futuret3ch.com.au` (clean, no www.).
- Vercel will show a table:
  Type: CNAME
  Name: wallet
  Value: <the vercel-dns hash>.vercel-dns-xxx.com.
- In your DNS provider, set:
  - Name / Host / Subdomain field: exactly `wallet` (bare — do not paste the full `wallet.futuret3ch.com.au`)
  - Value / Target: the full value from Vercel, with trailing dot if your provider accepts it (e.g. `bb78f335c0031b77.vercel-dns-017.com.`)
- Wait for validation → status changes to "Valid Configuration".
- Then set these Environment Variables in Vercel (Production + Preview):

  - `VITE_MT_NODE_URL=https://api.futuret3ch.com.au`
  - `VITE_AUTH_URL=https://auth.futuret3ch.com.au`

- Redeploy.

Once valid, https://wallet.futuret3ch.com.au becomes the production URL (you can promote it as primary; the *.vercel.app will continue to work or redirect).

See `mt-core/nginx/README.md` for the full current steps + the wallet DNS troubleshooting.

Local dev testing against your VPS (no mixed content issue on http://localhost:5173):
- Run `npm run dev` inside `infinite-wallet/`
- In the app Settings tab set the http://IP:4001 and :4002 values (they persist in localStorage for that browser).

Users can also manually set them in the in-app **Settings** (MT Node URL + it will persist in their browser).

## 6. Important Notes
- **Persistence**: Both services now save to JSON files on disk (accounts.json, users.json, backups.json). This survives restarts.
- **Genesis**: The genesis is locked. Use the multisig or faucet for initial distribution.
- **Faucet**: Only expose in dev. In prod either remove or heavily rate-limit + require auth.
- **Security**:
  - Firewall: `ufw allow 80,443,22`
  - Keep Node updated
  - Consider putting mt-core behind auth if you want private chain
- **Monitoring**: `journalctl -u mt-core -f`

## Quick Local Test (before VPS)
```bash
# Terminal 1
cd mt-core && npm start

# Terminal 2
cd mt-auth && npm start

# In browser wallet Settings (after `npm run dev` in infinite-wallet/):
# MT Node URL: http://localhost:4000   (or 4001 if you set that for core)
# Auth URL: http://localhost:4001      (or 4002)
# (Auth is optional for basic use; required for login + backups + "Your Wallets" sync)
```

Then use the faucet button or POST to /faucet.

This gives you real native MT balances in the top "NATIVE MT" card.

Moving the whole monorepo is fine for development, but for production only run the two backend services as daemons. The frontend can stay on Vercel pointing at your Contabo services.

Let me know if you want me to add a docker-compose example, more robust persistence (SQLite), or help with the nginx configs.
