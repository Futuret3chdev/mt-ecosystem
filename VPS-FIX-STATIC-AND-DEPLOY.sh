#!/bin/bash
# Helper to fix static copy and continue deployment after git pull on VPS
# Run as root in /opt/mt-ecosystem

set -e

echo "=== Fixing static for tester page (admin_messages.html) and deploying nginx configs ==="

cd /opt/mt-ecosystem

# 1. Backup whatever is currently in the served static dir (protects tester content)
echo ">>> Backing up current served static (your tester admin_messages.html)"
sudo mkdir -p /opt/mt-ecosystem/mt-admin-api/static.backup
sudo cp -r /opt/mt-ecosystem/mt-admin-api/static/* /opt/mt-ecosystem/mt-admin-api/static.backup/ 2>/dev/null || true
echo "Backup done at /opt/mt-ecosystem/mt-admin-api/static.backup"

# 2. Make sure source static from the pulled code is used
echo ">>> Checking source static from repo (should have admin_messages.html now)"
ls -la mt-admin-api/static/ || echo "WARNING: static dir not in source yet"

# Create target dir
sudo mkdir -p /opt/mt-ecosystem/mt-admin-api/static

# Copy from source (the versioned one in git)
# If your real tester content was in the backup, we can restore the important file after if needed
sudo cp -r mt-admin-api/static/* /opt/mt-ecosystem/mt-admin-api/static/ 2>/dev/null || echo "No files matched in source static, will create minimal placeholder"

# 3. Ensure the tester page exists (restore from backup if the source copy was a placeholder)
if [ -f /opt/mt-ecosystem/mt-admin-api/static.backup/admin_messages.html ]; then
  echo ">>> Restoring your original tester admin_messages.html (priority)"
  sudo cp /opt/mt-ecosystem/mt-admin-api/static.backup/admin_messages.html /opt/mt-ecosystem/mt-admin-api/static/admin_messages.html
fi

echo "Static now deployed. Verify with: ls /opt/mt-ecosystem/mt-admin-api/static/"

# 4. Deploy the nginx configs (memetorrent + admin with /static protection)
echo ""
echo ">>> Deploying memetorrent nginx (the one mirroring wallet)"
sudo cp mt-core/nginx/memetorrent.conf /etc/nginx/sites-available/memetorrent
sudo ln -sf /etc/nginx/sites-available/memetorrent /etc/nginx/sites-enabled/memetorrent || true

echo ">>> Deploying admin nginx (explicit /static/ location before proxy)"
sudo cp mt-core/nginx/admin.futuret3ch.com.au.conf /etc/nginx/sites-available/admin.futuret3ch.com.au
sudo ln -sf /etc/nginx/sites-available/admin.futuret3ch.com.au /etc/nginx/sites-enabled/admin.futuret3ch.com.au || true

echo ">>> Testing and reloading nginx"
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "Nginx configs updated. /static/ should now be served statically (protecting your tester page)."

# 5. Deploy mt-admin-api (for Developer Mode + dashboard)
echo ""
echo ">>> Deploying mt-admin-api (self-hosted admin that Developer Mode talks to)"
cd mt-admin-api

if [ ! -f .env ]; then
  echo "No .env found, copying from example..."
  cp .env.example .env
  echo ">>> EDIT /opt/mt-ecosystem/mt-admin-api/.env NOW if needed (ADMIN_API_KEY, ALLOWED_ORIGINS)"
fi

npm install --production

# init db if needed
if [ ! -f mt-admin.db ] && [ -f package.json ]; then
  echo "Initializing DB..."
  npm run init-db 2>/dev/null || node src/db/init.js || true
fi

# pm2
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete mt-admin-api 2>/dev/null || true
  pm2 start server.js --name mt-admin-api --time
  pm2 save
  echo "mt-admin-api running under pm2"
else
  echo "pm2 not found. Starting with nohup (temporary)..."
  pkill -f "node server.js" || true
  nohup node server.js > /tmp/mt-admin-api.log 2>&1 &
  echo "Started. Logs: tail -f /tmp/mt-admin-api.log"
fi

cd ..

echo ""
echo "=== Done. Next manual steps ==="
echo "1. certbot for the domains (especially admin and memetorrent if using A record):"
echo "   sudo certbot --nginx -d admin.futuret3ch.com.au"
echo "   sudo certbot --nginx -d memetorrent.futuret3ch.com.au"
echo ""
echo "2. Verify tester page is intact:"
echo "   curl -I https://admin.futuret3ch.com.au/static/admin_messages.html"
echo "   (should return 200, and content should be your tester messages)"
echo ""
echo "3. Test Developer Mode in the wallet (after Vercel deploy of infinite-wallet is live):"
echo "   - Open wallet.futuret3ch.com.au"
echo "   - Settings -> enable DEVELOPER MODE"
echo "   - Use the buttons (should hit the admin API now)"
echo ""
echo "4. Your local mt-core changes (constants.js etc.) were preserved (they are still modified in git status)."
echo "   If you want them committed later, do it from your Windows machine after pulling."
echo ""
echo "If the static copy still has issues, run: ls -la mt-admin-api/static/ on VPS and paste here."