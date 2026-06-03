# Nginx + HTTPS for MT Core + MT Auth (to enable real native MT on the live Vercel site)

This allows the public https://infinite-wallet.vercel.app to fetch real NATIVE MT balances and use auth (login/backups) without mixed-content blocks.

## Prerequisites
- A domain you control (e.g. yourdomain.com). Point A records:
  - core.yourdomain.com → your VPS IP (161.97.106.182)
  - auth.yourdomain.com → your VPS IP
- nginx and certbot installed on VPS (`apt install nginx certbot python3-certbot-nginx`)

## 1. Copy the configs (after git pull or scp the files)

```bash
cd /opt/mt-ecosystem
git pull
cd mt-core/nginx

sudo cp mt-core.conf /etc/nginx/sites-available/mt-core
sudo cp mt-auth.conf /etc/nginx/sites-available/mt-auth
```

## 2. Enable

```bash
sudo ln -s /etc/nginx/sites-available/mt-core /etc/nginx/sites-enabled/ || true
sudo ln -s /etc/nginx/sites-available/mt-auth /etc/nginx/sites-enabled/ || true
sudo nginx -t
sudo systemctl reload nginx
```

## 3. Get free TLS certs (Let's Encrypt)

```bash
sudo certbot --nginx -d core.yourdomain.com -d auth.yourdomain.com
# Follow prompts. It will auto-update the confs with ssl_ directives.
```

Test:

```bash
curl https://core.yourdomain.com/health
curl https://auth.yourdomain.com/health
```

## 4. Update CORS on the services (important!)

Edit the .env files and restart so the backends accept requests from the live wallet + your new domains.

For mt-core:

```bash
cd /opt/mt-ecosystem/mt-core
nano .env
# Add/update:
# CORS_ORIGINS=https://infinite-wallet.vercel.app,https://core.yourdomain.com,https://auth.yourdomain.com,http://localhost:5173
```

Same for mt-auth:

```bash
cd /opt/mt-ecosystem/mt-auth
nano .env
# CORS_ORIGINS=... same list
```

Then:

```bash
sudo systemctl restart mt-core
sudo systemctl restart mt-auth
```

## 5. Point the live wallet (Vercel env vars)

In your Vercel dashboard for the "infinite-wallet" project:

- Go to Settings → Environment Variables
- Add (for Production, and optionally Preview):
  - Name: VITE_MT_NODE_URL
    Value: https://core.yourdomain.com
  - Name: VITE_AUTH_URL
    Value: https://auth.yourdomain.com

- Redeploy the project (or push a commit to trigger).

Now the live site will default to your real mt-core for NATIVE MT (primary card) and mt-auth for logins/backups. No more mixed content, no need for every user to set custom http IPs in Settings.

Local dev can still override with the in-app Settings fields (they take precedence via localStorage).

## Alternative without extra subdomains (single domain + paths - advanced)

If you only have one domain, you can proxy under paths, but you would need to adjust the wallet fetch URLs or run the services with base paths. Subdomains are strongly recommended for cleanliness.

## Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# (the backends 4001/4002 can stay localhost-only now)
```

## Verify on live site

After redeploy, visit https://infinite-wallet.vercel.app , the native MT card should pull real balances from your mt-core (for wallets that have native funds sent to the addr on the MT chain).

Use your local dev + http://IP for testing before the domain is ready.

This completes the "make the public live site use your real native MT by default".
