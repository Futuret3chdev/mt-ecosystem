#!/bin/bash
# VPS Deployment helper for MT-ECO SYSTEM playground
# Run this on your VPS after git pull (or copy the commands manually).
#
# This does:
# 1. memetorrent nginx proxy (the one you asked "you should do this" for, mirroring wallet)
# 2. Basic setup for mt-admin-api (self-hosted analytics + the Developer Mode dashboard)
#
# Prerequisites on VPS:
#   sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
#   (Node.js + npm already installed from before)
#
# Usage:
#   chmod +x VPS-DEPLOY-MEMETORRENT-AND-ADMIN.sh
#   ./VPS-DEPLOY-MEMETORRENT-AND-ADMIN.sh
#
# After running, you will still need to:
#   - Set DNS (A record to this VPS IP for memetorrent.futuret3ch.com.au if using proxy, or CNAME for direct Vercel)
#   - Run certbot for the domains you want HTTPS on
#   - Restart/reload nginx

set -e

echo "=== MT-ECO SYSTEM VPS Deploy: memetorrent + Admin ==="
echo "Current dir: $(pwd)"
echo "Make sure you are in /opt/mt-ecosystem or the root of the cloned repo."

# 1. Pull latest (safe if already pulled)
echo ""
echo ">>> Pulling latest code..."
git pull || true

# 2. memetorrent nginx (the critical one matching your "you should do this" wallet paste)
echo ""
echo ">>> Setting up memetorrent nginx proxy (like wallet.futuret3ch.com.au)..."
sudo cp mt-core/nginx/memetorrent.conf /etc/nginx/sites-available/memetorrent
sudo ln -sf /etc/nginx/sites-available/memetorrent /etc/nginx/sites-enabled/memetorrent || true

# Also make sure wallet is still there (in case it was cleaned)
if [ -f mt-core/nginx/wallet.conf ]; then
  sudo cp mt-core/nginx/wallet.conf /etc/nginx/sites-available/wallet
  sudo ln -sf /etc/nginx/sites-available/wallet /etc/nginx/sites-enabled/wallet || true
fi

sudo nginx -t
sudo systemctl reload nginx
echo "memetorrent (and wallet) nginx configs applied."

# 3. mt-admin-api (self-hosted analytics, Developer Mode pings, /dashboard)
echo ""
echo ">>> Deploying mt-admin-api (required for Developer Mode live data + master admin)..."
cd mt-admin-api

if [ ! -f .env ]; then
  echo "Creating .env from example..."
  cp .env.example .env
  echo ">>> IMPORTANT: Edit /opt/mt-ecosystem/mt-admin-api/.env now!"
  echo "    Set ADMIN_API_KEY to something strong."
  echo "    Set ALLOWED_ORIGINS to include your domains (https://memetorrent-react.vercel.app,https://wallet.futuret3ch.com.au,https://memetorrent.futuret3ch.com.au etc.)"
  echo "    PORT=4003 is fine."
fi

npm install --production

# Initialize DB if not exists
if [ ! -f mt-admin.db ]; then
  echo "Initializing SQLite DB..."
  npm run init-db || node src/db/init.js
fi

# Use pm2 if available (recommended, same as your other services)
if command -v pm2 &> /dev/null; then
  pm2 delete mt-admin-api 2>/dev/null || true
  pm2 start server.js --name mt-admin-api --time
  pm2 save
  echo "mt-admin-api started with pm2."
else
  echo "pm2 not found. Starting with node in background (not recommended for prod)..."
  nohup node server.js > /tmp/mt-admin-api.log 2>&1 &
  echo "Started. Check logs: tail -f /tmp/mt-admin-api.log"
fi

cd ..

# 4. Static files for testers (CRITICAL — do not break /static/admin_messages.html)
echo ""
echo ">>> Syncing static files (testers use /static/admin_messages.html on this domain)..."
sudo mkdir -p /opt/mt-ecosystem/mt-admin-api/static
sudo cp -r mt-admin-api/static/* /opt/mt-ecosystem/mt-admin-api/static/ || true
sudo chown -R www-data:www-data /opt/mt-ecosystem/mt-admin-api/static 2>/dev/null || true

# 5. nginx for admin (using the versioned template from the repo)
# This template explicitly serves /static/ from disk first, then proxies the rest.
# This protects the tester page at https://admin.futuret3ch.com.au/static/admin_messages.html
echo ""
echo ">>> Installing admin nginx config (preserves /static/* for testers)..."
sudo cp mt-core/nginx/admin.futuret3ch.com.au.conf /etc/nginx/sites-available/admin.futuret3ch.com.au
sudo ln -sf /etc/nginx/sites-available/admin.futuret3ch.com.au /etc/nginx/sites-enabled/admin.futuret3ch.com.au || true

sudo nginx -t
sudo systemctl reload nginx
echo "admin nginx config installed (static + proxy to 4003)."

echo ""
echo "=== Done (local part) ==="
echo ""
echo "NEXT MANUAL STEPS YOU MUST DO (do not skip):"
echo ""
echo "1. DNS"
echo "   memetorrent.futuret3ch.com.au  →  either A to this VPS (for nginx proxy) or the exact CNAME from Vercel memetorrent-react project"
echo "   admin.futuret3ch.com.au        →  A record to this VPS IP (required for the admin API + static tester page)"
echo ""
echo "2. HTTPS (run these after the script):"
echo "   sudo certbot --nginx -d memetorrent.futuret3ch.com.au"
echo "   sudo certbot --nginx -d admin.futuret3ch.com.au"
echo ""
echo "3. IMPORTANT — Tester page preservation"
echo "   https://admin.futuret3ch.com.au/static/admin_messages.html must continue to work exactly as before."
echo "   The script copied mt-admin-api/static/ and installed a nginx config with an explicit /static/ location before the proxy."
echo "   If certbot rewrites the file, re-apply the static location or re-copy the template from mt-core/nginx/admin.futuret3ch.com.au.conf"
echo ""
echo "4. Test Developer Mode + tester page:"
echo "   - Live wallet → Settings → enable DEVELOPER MODE"
echo "   - Click the admin dashboard link and the 'Send Test Track Event' button"
echo "   - Visit https://admin.futuret3ch.com.au/static/admin_messages.html (should show the tester messages page)"
echo "   - Visit https://admin.futuret3ch.com.au/dashboard for the full observatory"
echo ""
echo "5. If you want memetorrent through the VPS proxy (like the wallet setup you showed):"
echo "   Use A record to VPS IP + the certbot line above."
echo ""
echo "Run 'pm2 logs mt-admin-api' (or journalctl) to watch the admin API."
echo "The static admin_messages.html lives in the repo at mt-admin-api/static/ so it is versioned."
echo ""
echo "If anything fails, paste the error here and I'll give the exact fix."