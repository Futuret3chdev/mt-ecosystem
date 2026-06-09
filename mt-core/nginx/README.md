# Nginx + HTTPS for MT Core + MT Auth (to enable real native MT on the live Vercel site + custom domains)

This allows the public https://wallet.futuret3ch.com.au (and https://infinite-wallet.vercel.app) to fetch real NATIVE MT balances and use auth (login/backups) without mixed-content blocks.

**wallet.futuret3ch.com.au is served directly by Vercel** (best performance). You point its DNS records to Vercel's names (CNAME/A) — NOT an A record to your VPS.

**auth.futuret3ch.com.au** and **api.futuret3ch.com.au** point A/AAAA to your VPS IP (161.97.106.182) and are proxied by nginx + TLS on the VPS.

## Prerequisites
- Your domain futuret3ch.com.au (or the one you control). DNS:
  - auth.futuret3ch.com.au → A record to VPS IP 161.97.106.182
  - api.futuret3ch.com.au  → A record to VPS IP 161.97.106.182
  - wallet.futuret3ch.com.au → (see "wallet domain" section below — do NOT point to VPS if using direct Vercel)
- nginx and certbot installed on VPS (`apt install nginx certbot python3-certbot-nginx`)

## 1. Copy the configs (after git pull or scp the files)

```bash
cd /opt/mt-ecosystem
git pull
cd mt-core/nginx

sudo cp mt-core.conf /etc/nginx/sites-available/mt-core
sudo cp mt-auth.conf /etc/nginx/sites-available/mt-auth
# (wallet.conf is only if you choose the VPS-reverse-proxy option for the frontend — see "wallet domain DNS" section)
```

## 2. Enable

```bash
sudo ln -s /etc/nginx/sites-available/mt-core /etc/nginx/sites-enabled/ || true
sudo ln -s /etc/nginx/sites-available/mt-auth /etc/nginx/sites-enabled/ || true
sudo nginx -t
sudo systemctl reload nginx
```

## 3. Get free TLS certs (Let's Encrypt) — only for auth + api (VPS backends)

```bash
sudo certbot --nginx -d auth.futuret3ch.com.au -d api.futuret3ch.com.au
# Follow prompts. It will auto-update the confs with ssl_ directives + 443 server blocks.
```

Test (after DNS + certs):

```bash
curl -I https://auth.futuret3ch.com.au
curl -I https://api.futuret3ch.com.au
# or specific endpoints once services respond, e.g. curl https://api.futuret3ch.com.au/health if exposed
```

## 4. Update CORS on the services (important!)

Edit the .env files and restart so the backends accept requests from the live wallet custom domain + vercel + subdomains.

For mt-core:

```bash
cd /opt/mt-ecosystem/mt-core
nano .env
# Add/update the line (comma separated, no spaces ideally):
# CORS_ORIGINS=https://wallet.futuret3ch.com.au,https://infinite-wallet.vercel.app,https://auth.futuret3ch.com.au,https://api.futuret3ch.com.au,http://localhost:5173,http://localhost:3000
```

Same for mt-auth:

```bash
cd /opt/mt-ecosystem/mt-auth
nano .env
# CORS_ORIGINS=https://wallet.futuret3ch.com.au,https://infinite-wallet.vercel.app,https://auth.futuret3ch.com.au,https://api.futuret3ch.com.au,http://localhost:5173,http://localhost:3000
```

Then:

```bash
sudo systemctl restart mt-core
sudo systemctl restart mt-auth
```

## 5. Vercel environment variables (for the wallet frontend project)

In your Vercel dashboard for the "infinite-wallet" project:

- Go to Settings → Environment Variables
- Add these **for Production** (and optionally Preview):
  - Name: VITE_MT_NODE_URL
    Value: https://api.futuret3ch.com.au
  - Name: VITE_AUTH_URL
    Value: https://auth.futuret3ch.com.au

- (Optional but recommended) Also add for the fallback serverless proxies if you ever use /api/mt or /api/auth paths (or leave unset to default to the https subdomains which go through nginx):
  - Name: MT_TARGET_URL
    Value: https://api.futuret3ch.com.au
  - Name: AUTH_TARGET_URL
    Value: https://auth.futuret3ch.com.au
  (You can also point at http://161.97.106.182:4001 etc for direct; https subdomains are simplest once live.)

- Redeploy the project (or push a commit to trigger).

Now the live site (on wallet.futuret3ch.com.au or vercel.app) will default to your real mt-core for NATIVE MT (primary card first, locked) and mt-auth for logins + per-user encrypted wallet backups. No more mixed content, wallets persist across devices for logged-in users.

Local dev can still override with the in-app Settings fields (they take precedence via localStorage).

## Alternative without extra subdomains (single domain + paths - advanced)

If you only have one domain, you can proxy under paths, but you would need to adjust the wallet fetch URLs or run the services with base paths. Subdomains are strongly recommended for cleanliness.

## Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# (the backends 4001/4002 can stay localhost-only now)
```

## wallet domain DNS (the current "Invalid Configuration" fix)

The error "wallet.futuret3ch.com.au Invalid Configuration" (while vercel.app shows Valid) happens because DNS does not yet point the name at Vercel's edge.

<<<<<<< HEAD
**CRITICAL WARNING — DO NOT CHANGE NAMESERVERS**

Vercel is showing you the option to switch the whole domain to `ns1.vercel-dns.com` / `ns2.vercel-dns.com`.

**Do NOT do this.**

Changing the nameservers for `futuret3ch.com.au` would hand **the entire domain** (including the apex `futuret3ch.com.au`, `auth.`, `api.`, `memetorrent.`, email MX records, etc.) over to Vercel DNS.  
Your main website at `futuret3ch.com.au` and the auth/api subdomains pointing to your VPS would stop working.

You only need the **subdomain** `wallet.futuret3ch.com.au` on Vercel. Keep using your current DNS provider (HostGator / Crazy Domains / whoever manages futuret3ch.com.au today).

**Correct way (recommended) — and your records already look perfect:**

From the cPanel screenshot you just showed, you **already have the exact right record**:

wallet.futuret3ch.com.au.	60	CNAME	bb78f335c0031b77.vercel-dns-017.com

No A record for wallet. Low TTL (60). Perfect.

The current symptoms are:

- 404 from nginx/1.18.0 (Ubuntu) → DNS for wallet. is still resolving to your VPS IP (A record is active, even if you deleted it 24h ago in cPanel). Traffic never reaches Vercel.

- Vercel build error "Found invalid Node.js Version: "24.x"" → You must set Node.js Version to **22.x** in the project settings (24.x is not accepted for this project/runtime yet).

The "I still have an A record somewhere" error from Vercel is almost always a **stale cache** on Vercel's DNS checker (even 24h later — some resolvers and Vercel's validators hold old data).

### What to do right now

1. **Double-check what the world actually sees** (run these on the VPS or any computer):
   ```bash
   dig +short wallet.futuret3ch.com.au
   dig +short -t CNAME wallet.futuret3ch.com.au
   ```
   It should return the vercel-dns hash (not an IP address).

2. **Force Vercel to forget the old A record** (this is the trick that usually fixes it):
   - In the Vercel infinite-wallet project → Domains.
   - Next to `wallet.futuret3ch.com.au`, click the `⋯` menu → **Remove** / Disconnect the domain.
   - Wait 30–60 seconds.
   - Re-add `wallet.futuret3ch.com.au` (choose Production).
   - Vercel will do a fresh lookup, see your clean CNAME in cPanel, and should immediately show **Valid Configuration**.

3. **Set the required environment variables** (so the wallet app talks to your real VPS auth + api instead of demo/local):
   Vercel project → Settings → Environment Variables (add for both **Production** and **Preview**):
   - `VITE_AUTH_URL` = `https://auth.futuret3ch.com.au`
   - `VITE_MT_NODE_URL` = `https://api.futuret3ch.com.au`
   Then trigger a new deploy (or push a small change).

4. Once it shows Valid, you can make `wallet.futuret3ch.com.au` the primary domain.

**Do not switch to Vercel nameservers.** That would break your main site + auth/api subdomains as you correctly feared. Your current cPanel setup + single CNAME for wallet is the right approach.

After the re-add + Valid + successful deploy with the two VITE_ vars, `https://wallet.futuret3ch.com.au` will load the real INFINITE WALLET directly from Vercel (no more 403, and logins/backups will use your real mt-auth on the VPS).

If `dig` still shows the VPS IP after you deleted the A in cPanel and waited, the record may still be live at the registrar level or the zone edit didn't save. Double-check the full list in cPanel (not just filtered) and delete the A again.

The rest of your records (email DKIM, convert-api, webmail, etc.) are untouched and fine.

**Note for your PC (correct Vite source):** All work is on your PC in the mt-ecosystem folder (the Vite one). The ~/eco/.../infinite-wallet on VPS is the old 2025 CRA version — ignore it completely (you can delete that subfolder if you want). Push only from the PC's correct tree. Use PowerShell commands below (not bash heredoc) when on Windows.

**To restore the 3 config files you need** (if they are missing from sites-available, as in your latest request):

On the VPS:

```bash
cd /opt/mt-ecosystem
git pull

cd mt-core/nginx

# Restore using the exact names you want
sudo cp mt-auth.conf /etc/nginx/sites-available/auth.futuret3ch.com.au
sudo cp mt-core.conf /etc/nginx/sites-available/api.futuret3ch.com.au
sudo cp wallet.conf /etc/nginx/sites-available/wallet.futuret3ch.com.au

# IMPORTANT for NFT mints: after copy + certbot, ensure BOTH 80 and 443 server blocks
# have `client_max_body_size 20m;` (nginx default is 1m, which causes 413 on image NFTs).
# Edit the ssl block added by certbot if necessary.

# Symlinks
sudo ln -sf /etc/nginx/sites-available/auth.futuret3ch.com.au /etc/nginx/sites-enabled/auth.futuret3ch.com.au
sudo ln -sf /etc/nginx/sites-available/api.futuret3ch.com.au /etc/nginx/sites-enabled/api.futuret3ch.com.au
sudo ln -sf /etc/nginx/sites-available/wallet.futuret3ch.com.au /etc/nginx/sites-enabled/wallet.futuret3ch.com.au

sudo nginx -t
sudo systemctl reload nginx

# Re-run certbot to install/renew the certs into the configs
sudo certbot --nginx -d auth.futuret3ch.com.au
sudo certbot --nginx -d api.futuret3ch.com.au
sudo certbot --nginx -d wallet.futuret3ch.com.au
```

If certbot says "not due for renewal", check existing certs with `sudo certbot certificates` and use `sudo certbot install --cert-name <the-name> --nginx` for each.

This will recreate the 3 files with proper server_name, proxy (for wallet to Vercel, auth to 4002, api to 4001), and certbot will add the 443 SSL blocks + cert paths.

After this, https to the subdomains (via their A records or the wallet proxy) should be secure (padlock, no "unsecure").

**Note:** With your current CNAME for wallet (resolving to Vercel IPs per your dig), the VPS proxy for wallet is not used for normal access to the domain. It is only hit if you also have an A record for wallet to the VPS IP. The direct Vercel path (CNAME only) is recommended to get "Valid Configuration" in the Vercel project. If you want the VPS proxy, add an A record for wallet to the VPS IP in your DNS.

Keep the auth and api A records to the VPS IP.

The old ~/eco/mt-ecosystem/infinite-wallet (CRA/craco) on VPS is legacy 2025 code — ignore it. All current work is in the Vite mt-ecosystem tree on your PC.

**Do this:**

1. In your DNS provider, **DELETE** any A/AAAA/CNAME record for `wallet.futuret3ch.com.au` that points to 161.97.106.182 (or anywhere else).

2. In Vercel (infinite-wallet project → Domains), open the entry for wallet.futuret3ch.com.au. Vercel will display the **exact DNS records** it needs in a table like this:

   Type: CNAME
   Name: wallet
   Value: bb78f335c0031b77.vercel-dns-017.com.

   (The important part: in **your DNS provider**, the "Name" / "Host" / "Subdomain" field must be exactly `wallet` — **not** `wallet.futuret3ch.com.au` or `wallet.`. The provider appends the rest.)

   For the "Value" / "Target" / "Points to" field, use the full value Vercel gives, usually with a trailing dot: `bb78f335c0031b77.vercel-dns-017.com.`

   (Trailing dot on the target is often required or recommended by DNS providers to mark it as a full name.)

   Some setups use two A records instead — copy **whatever table** Vercel lists for this domain exactly.

3. First **DELETE** any existing A record + any old/wrong CNAME for `wallet` (including ones that used the full `wallet.futuret3ch.com.au.` as the name). Then create the new record matching Vercel's table.

4. Save / publish the DNS change.

5. Wait for propagation (check https://dnschecker.org for both `wallet.futuret3ch.com.au` and the CNAME target). This can be 1-30+ minutes depending on your provider's TTL (14400 is what you showed — fine, but lower helps during setup).

6. Back in Vercel, click "Verify", "Refresh", or "Check again" on the domain row. It should change from "Invalid Configuration" to "Valid Configuration".

7. (After valid) You can set `wallet.futuret3ch.com.au` as the primary domain for the Production deployment. Both it and the vercel.app will work (Vercel can redirect or serve on the custom).

**Alternative (VPS proxy for wallet too):** If you prefer everything under your VPS nginx (simpler DNS: just one A to VPS for wallet.), keep the A record pointing to 161.97.106.182 for wallet., then:

```bash
sudo cp wallet.conf /etc/nginx/sites-available/wallet
sudo ln -s /etc/nginx/sites-available/wallet /etc/nginx/sites-enabled/ || true
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d wallet.futuret3ch.com.au
```

This works but adds a proxy hop. Direct-to-Vercel (above) is recommended.
>>>>>>> 5644329 (chore(marketing): clean memetorrent-react to pure marketing site only (remove old embedded wallet/ CRA build, duplicate WalletStub, empty files, web3))

## Firewall (VPS)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# (the backends 4001/4002 can stay localhost-only now; nginx terminates TLS)
```

## Verify on live site

After DNS valid + redeploy + VPS certs + restarts:

- Visit https://wallet.futuret3ch.com.au

- Login (email/phone or the big social slide drawer with 30+ platforms)

- Create wallets (including the promoted "Couples Wallet" and "Business Wallet" types — they are first-class and badged)

- They must survive reload and show under the logged-in user (real storage in mt-auth per userId, client decrypts only)

- Native MT card (first, "NATIVE MT (PRIMARY — OUR NETWORK)") pulls live from api.futuret3ch.com.au

- Marketing site (memetorrent-react) CTAs already point to https://wallet.futuret3ch.com.au/

<<<<<<< HEAD
Use http://YOUR_VPS_IP:4001 (mt-core) / :4002 (mt-auth) for direct VPS testing before domains/TLS are live. After, prefer https://api.futuret3ch.com.au/health etc.

This completes production custom domain + real persistent per-user wallets for the 20k users path. No demo fallbacks in the happy path.

## Verify MT API returns JSON (fixes "Mint failed: Unexpected token '<', \"<!DOCTYPE\"... is not valid JSON")

The NFT mint (and sends, balance sync) POST/GET to /tx , /nfts/:addr , /account/:addr etc. If these hit the Vercel wallet SPA (or a default nginx page) instead of mt-core, you get HTML body and the client `res.json()` throws the exact parse error you saw.

After you have:

- Set **VITE_MT_NODE_URL=https://api.futuret3ch.com.au** and **VITE_AUTH_URL=https://auth.futuret3ch.com.au** (Production + Preview) in Vercel infinite-wallet project envs
- Set Node.js Version to **22.x** in project settings
- Triggered a **successful Production** deploy (green check, not failed on 24.x)
- Attached/ re-added wallet.futuret3ch.com.au domain to that successful production deployment (so it serves the app, no 403)

Do these checks (run from anywhere with curl; use the VPS for local net tests):

```bash
# 1. Basic health from public (should be pure JSON, 200)
curl -i https://api.futuret3ch.com.au/health
# Expect: HTTP/2 200 + {"ok":true,"network":...}  (no HTML, no 403, no nginx default page)

# 2. Account endpoint (use any addr or one from your wallet; should 200 + JSON even if 0 balance)
curl -i https://api.futuret3ch.com.au/account/EXAMPLEADDR...

# 3. NFTs (used on load and after mint)
curl -i https://api.futuret3ch.com.au/nfts/EXAMPLEADDR...

# 4. The mint path itself (POST a signed NFT_MINT - will fail auth but must return JSON not HTML)
# For a quick syntax/JSON check without full sig, a bad body should still be JSON error:
curl -i -X POST https://api.futuret3ch.com.au/tx \
  -H 'Content-Type: application/json' \
  -d '{"type":"NFT_MINT","from":"test"}'
# Expect 400 + {"error": "..."}  JSON. If you see <!DOCTYPE or <html you are still hitting frontend.

# Also test auth while at it:
curl -i https://auth.futuret3ch.com.au/health   # (if exposed) or just try login flow in UI
```

**On the VPS (as root or with sudo):**

```bash
# Confirm which port the core is actually listening on (after any .env / restart)
sudo systemctl status mt-core
curl -i http://127.0.0.1:4001/health   # direct; should work if service on 4001

sudo systemctl status mt-auth
curl -i http://127.0.0.1:4002/health

# Check active nginx server blocks for the api name (must see your proxy to 4001)
sudo nginx -T | grep -A 20 -E 'server_name.*api.futuret3ch|listen.*443|proxy_pass.*4001'

# If no match or wrong proxy, re-copy the confs + re-certbot as in the restore commands earlier.
# Also ensure no hijack files with duplicate server_name (rm bad symlinks in sites-enabled, use exact auth.futuret3ch.com.au etc names).
```

**In the live wallet UI (once it loads on wallet.futuret3ch.com.au without 403):**

- Open DevTools → Network tab
- Do a mint (or refresh balances)
- Look for the request to `/tx` or `api.futuret3ch.com.au/tx` (or `/api/mt/tx` if you set VITE to the relative)
- The response must be JSON (preview tab shows object). If it shows the wallet index.html source, the node URL in the bundle is wrong for this deploy.
- The top bar indicator should show `https://api.futuret3ch.com.au` (or `/api/mt` if you chose the serverless VITE).

If you still see the HTML error after the above, the custom domain in Vercel is likely still aliased to a bad/failed/preview deployment. In Vercel dashboard: Domains tab for the project → for wallet. → "..." → Reassign to the latest successful production deployment from main branch. Or remove domain, redeploy prod, re-add.

Once health + /tx return real JSON objects/arrays, NFT mint will succeed end-to-end (the tx is recorded, owner gets the NFT in /nfts list, no more parse error).

## Debugging: "wallet.futuret3ch.com.au is going to the wrong core files" (or wrong backend)

This usually happens when:

- DNS for `wallet.futuret3ch.com.au` is still an **A record to the VPS IP** (instead of the Vercel CNAME).
- An nginx server block for that `server_name` is active on the VPS.
- That block has the wrong `proxy_pass` (e.g. pointing at port 4001/mt-core instead of `https://infinite-wallet.vercel.app`).

### How to access / inspect all nginx files

There are two places:

1. **Source templates** (the clean ones in this repo):
   ```bash
   cd /opt/mt-ecosystem
   ls -l mt-core/nginx/
   cat mt-core/nginx/wallet.conf     # the correct proxy-to-Vercel version
   cat mt-core/nginx/mt-core.conf    # for api.futuret3ch.com.au → 4001
   cat mt-core/nginx/mt-auth.conf    # for auth.futuret3ch.com.au → 4002
   ```

2. **Live runtime files** (what nginx is actually using right now):
   ```bash
   # All available site configs
   ls -l /etc/nginx/sites-available/

   # Only the ones that are actually loaded
   ls -l /etc/nginx/sites-enabled/

   # Every .conf file on the system
   sudo find /etc/nginx -name "*.conf" | sort
   ```

### Diagnostic commands (run these on the VPS via SSH)

```bash
ssh youruser@161.97.106.182

# 1. Search for any mention of the wallet domain
sudo grep -rn "wallet.futuret3ch.com.au" /etc/nginx/ 2>/dev/null || true

# 2. Search more broadly for "wallet."
sudo grep -rn "wallet\." /etc/nginx/sites-available/ /etc/nginx/sites-enabled/ 2>/dev/null || true

# 3. THE BEST ONE: dump the FULL effective nginx config (merged from all files)
# This shows you exactly which server{} block is answering for the domain
sudo nginx -T | grep -A 30 -E "server_name.*wallet|listen.*wallet" || sudo nginx -T | grep -i wallet

# Even more context
sudo nginx -T | grep -E "(server_name|listen|proxy_pass|location /)" | head -100

# 4. View the exact file(s) that contain the domain
sudo grep -l "wallet.futuret3ch.com.au" /etc/nginx/sites-available/* 2>/dev/null || true

# 5. See the exact active server block nginx is using for it (best diagnostic)
sudo nginx -T | grep -A 80 -E 'server_name.*wallet.futuret3ch.com.au' || echo "No exact match, trying broader..."
sudo nginx -T | grep -A 30 -E 'server_name.*wallet'
```

### Common fixes

**Option A — Recommended: Stop VPS from handling wallet. at all (use direct Vercel CNAME)**

```bash
# Disable any wallet frontend config
sudo rm -f /etc/nginx/sites-enabled/wallet
sudo rm -f /etc/nginx/sites-enabled/*wallet*

# Make sure only the backend ones are enabled
ls /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx
```

Then make sure your DNS is the **CNAME** (Name: `wallet`, Value: the vercel-dns one) and **no A record** to the VPS for wallet.

**Option B — You want to proxy wallet. through VPS nginx (alternative)**

Re-copy the correct template:

```bash
sudo cp /opt/mt-ecosystem/mt-core/nginx/wallet.conf /etc/nginx/sites-available/wallet

# If the file already exists and is wrong, the cp will overwrite it with the correct proxy to vercel
sudo ln -s /etc/nginx/sites-available/wallet /etc/nginx/sites-enabled/ 2>/dev/null || true

sudo nginx -t
sudo systemctl reload nginx

# Then get TLS for it
sudo certbot --nginx -d wallet.futuret3ch.com.au
```

After any change, test with:

```bash
curl -I http://wallet.futuret3ch.com.au   # or https after cert
```

And check what `proxy_pass` line is active for it using the `nginx -T` command above.

Always run `sudo nginx -t` before `reload`. If it fails, the site will be broken until you fix the syntax.

Use http://161.97.106.182:4001 etc for direct VPS testing before domains/TLS are live.

This completes production custom domain + real persistent per-user wallets for the 20k users path. No demo fallbacks in the happy path. (For the marketing site + Vercel wallet deploys, the /api proxies + correct TARGET envs give working sign-in and native data even before all subdomains are 100% cut over.)
