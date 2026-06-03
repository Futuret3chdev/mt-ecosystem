# Self-Hosting MT ECO SYSTEM on Contabo (or any VPS)

This is the recommended path for "our network" ownership.

## Recommended Architecture
- **Backend services on Contabo VPS**:
  - mt-core (port 4000) - native chain
  - mt-auth (port 4001) - accounts + encrypted wallet backups
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

Similar for `mt-auth.service` (PORT=4001, same DATA_DIR pattern).

```bash
systemctl daemon-reload
systemctl enable --now mt-core
systemctl enable --now mt-auth
```

## 4. Nginx + SSL (example for api.yourdomain.com)
```nginx
server {
    listen 80;
    server_name core.yourdomain.com auth.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;  # or 4001 for auth
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then:
```bash
certbot --nginx -d core.yourdomain.com -d auth.yourdomain.com
```

## 5. Point the Wallet (Vercel)
In your Vercel project for `infinite-wallet` set these Environment Variables (Production + Preview):

- `VITE_MT_NODE_URL=https://core.yourdomain.com`
- `VITE_AUTH_URL=https://auth.yourdomain.com`

Redeploy the wallet.

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

# In browser wallet Settings:
# MT Node URL: http://localhost:4000
# (Auth is optional for basic use)
```

Then use the faucet button or POST to /faucet.

This gives you real native MT balances in the top "NATIVE MT" card.

Moving the whole monorepo is fine for development, but for production only run the two backend services as daemons. The frontend can stay on Vercel pointing at your Contabo services.

Let me know if you want me to add a docker-compose example, more robust persistence (SQLite), or help with the nginx configs.
