# Deploy mt-core to your existing Contabo VPS (with 200+ games running)

You already have a busy VPS. We will add mt-core cleanly without breaking things.

## 1. Prepare on your local machine (this workspace)

We have already improved mt-core for VPS:
- Persistence (accounts, nfts, txlog saved to data/ as JSON)
- Config via env (PORT, CORS_ORIGINS, DATA_DIR)
- Graceful shutdown save

Make sure you have latest code here.

## 2. On the Contabo VPS (via SSH)

```bash
# SSH to your VPS
ssh root@YOUR_CONTABO_IP

# Create dedicated user (best practice, don't run as root)
useradd -m -s /bin/bash mtcore
usermod -aG www-data mtcore  # if you use www-data group

# Go to a good location (e.g. alongside your games)
cd /opt   # or wherever your software lives
# Or /home/mtcore

# Clone or copy the mt-core folder
# Option A: git (recommended for updates)
git clone https://github.com/Futuret3chdev/mt-ecosystem.git /opt/mt-ecosystem
cd /opt/mt-ecosystem/mt-core

# Option B: rsync/scp from your machine (if you want only mt-core)
# IMPORTANT: Run the scp/rsync command FROM YOUR WINDOWS MACHINE (PowerShell, Git Bash, or WSL), NOT from inside an SSH session to the VPS.
# The E: path only exists on Windows.
# Example (single file update is often enough after initial deploy):
#   scp "E:/mt-ecosystem/mt-core/node.js" root@YOUR_CONTABO_IP:/opt/mt-ecosystem/mt-core/node.js
# Or full dir:
#   scp -r E:/mt-ecosystem/mt-core root@YOUR_CONTABO_IP:/opt/mt-ecosystem/mt-core
# Alternative (easiest for Windows users): Use WinSCP GUI (free) - SFTP connect as root, upload the files.

# Install deps (as mtcore user or root then chown)
sudo -u mtcore bash
cd /opt/mt-ecosystem/mt-core
npm install --production

# Create data dir for persistence
mkdir -p data
chown mtcore:mtcore data
```

## 3. Configure

```bash
# Copy env example
cp .env.example .env

# Edit .env
nano .env
```

Example content for your setup:

```
PORT=4001
CORS_ORIGINS=https://infinite-wallet.vercel.app,https://your-wallet-domain.com,http://localhost:5173
DATA_DIR=/opt/mt-ecosystem/mt-core/data
# NETWORK_NAME=MT ECO SYSTEM Main
# NETWORK_ID=mt-main-1
```

Important: Set CORS_ORIGINS to include your live wallet domains so the browser wallet can talk to it.

## 4. Install as systemd service (you are here)

**Best way (recommended):** We have a helper script that automatically finds the correct `node` path (very useful if you use nvm or custom node installs for your games).

From inside `/opt/mt-ecosystem/mt-core` on the VPS, run:

```bash
sudo bash bin/install-service.sh
```

This script will:
- Create the mtcore user if missing
- Ensure data/ dir
- Create .env from example if needed (and prompt you to edit)
- Detect the full path to node (using which/command -v)
- Write the correct /etc/systemd/system/mt-core.service with the right ExecStart
- daemon-reload, enable, and start the service

You can re-run it later if you change node version.

---

If the script is not there (older copy), or you prefer manual:

You tried:
```bash
sudo cp systemd/mt-core.service /etc/systemd/system/mt-core.service
```
and got "cannot stat" — this usually means the `systemd/` folder wasn't copied when you moved the mt-core directory to the VPS.

### Fix it right now (create the service file directly)

Run this on the VPS (from inside `/opt/mt-ecosystem/mt-core`):

```bash
sudo tee /etc/systemd/system/mt-core.service > /dev/null << 'EOL'
[Unit]
Description=MT Core - Native MT Blockchain Node
After=network.target

[Service]
Type=simple
# Use a dedicated low-privilege user (create with: useradd -m -s /bin/bash mtcore)
User=mtcore
Group=mtcore

WorkingDirectory=/opt/mt-ecosystem/mt-core

# Best: use .env file (create from .env.example on VPS)
EnvironmentFile=-/opt/mt-ecosystem/mt-core/.env

# Fallback direct env (uncomment and customize if not using .env file)
# Environment=PORT=4001
# Environment=CORS_ORIGINS=https://infinite-wallet.vercel.app,https://yourdomain.com
# Environment=DATA_DIR=/opt/mt-ecosystem/mt-core/data
# Environment=NODE_ENV=production

# Main command - uses the PORT from env or defaults inside the app
# On your VPS, run `which node` and update the path below if it's not /usr/bin/node
ExecStart=/usr/bin/node node.js

# Restart policy
Restart=always
RestartSec=10
StartLimitBurst=5
StartLimitIntervalSec=60

# Security hardening (good practice on shared VPS)
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

# Resource limits (adjust based on your VPS)
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOL
```

This writes the exact current service file.

Then continue with the rest:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mt-core
sudo systemctl start mt-core

sudo systemctl status mt-core
journalctl -u mt-core -f
```

**Before starting the service, make sure you have a .env file:**

```bash
cp .env.example .env
nano .env
```

At minimum put:

```
PORT=4001   # Use a free port! 4000 (and many others) may already be used by your other 200 games/services.
CORS_ORIGINS=https://infinite-wallet.vercel.app
DATA_DIR=/opt/mt-ecosystem/mt-core/data
```

**Port conflict warning (common on busy VPS):**  
Run `sudo ss -ltnp | grep -E ':(400[0-9]|808[0-9])'` on the VPS first to find a free port.  
Update both the .env **and** the URL you will later put in the wallet Settings (e.g. http://161.97.106.182:4001).

Also ensure the user and data dir:

```bash
sudo useradd -m -s /bin/bash mtcore || true
sudo mkdir -p /opt/mt-ecosystem/mt-core/data
sudo chown -R mtcore:mtcore /opt/mt-ecosystem/mt-core
```

Now proceed to the "Next commands" section below if you want the full block.

First, if you haven't created the dedicated user yet (highly recommended, even on existing busy VPS):

```bash
# Create low-priv user (if not exists)
sudo useradd -m -s /bin/bash mtcore || true

# Give it ownership of the mt-core dir (adjust path if you put it elsewhere)
sudo chown -R mtcore:mtcore /opt/mt-ecosystem/mt-core

# Make sure data dir is writable
sudo mkdir -p /opt/mt-ecosystem/mt-core/data
sudo chown -R mtcore:mtcore /opt/mt-ecosystem/mt-core/data
```

Now edit the service file (the cp already happened):

```bash
sudo nano /etc/systemd/system/mt-core.service
```

In the editor:
- Make sure `User=mtcore` and `Group=mtcore` (or change to your existing user/group if you prefer).
- The `EnvironmentFile` line points to `.env` — this is the easiest.
- If you don't want to use .env file, uncomment the direct `Environment=` lines and fill them.
- WorkingDirectory should match where you have the code: `/opt/mt-ecosystem/mt-core`

**CRITICAL: Find the correct node path first (run these on VPS before editing the service):**

```bash
which node
command -v node
type -p node
ls -l $(which node) 2>/dev/null || echo "node not in PATH"
node --version
```

- If `which node` outputs `/usr/bin/node`, then use `ExecStart=/usr/bin/node node.js`
- If it outputs something like `/usr/local/bin/node` or `/root/.nvm/versions/node/v20.18.0/bin/node`, use the **full path** exactly as shown.
- Example: `ExecStart=/root/.nvm/versions/node/v20.18.0/bin/node node.js`

This is very important because on systems with nvm or custom node installs (common when running many games), /usr/bin/node may not exist or be the wrong version.

Save & exit (Ctrl+O, Enter, Ctrl+X in nano).

Then reload systemd and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mt-core
sudo systemctl start mt-core
```

Check if it's running:

```bash
sudo systemctl status mt-core
```

Watch live logs (very useful):

```bash
journalctl -u mt-core -f
```

(You can press Ctrl+C to exit the log tail.)

If it fails to start, the status and logs will tell you exactly why (usually .env issue, permission, or node not found).
```

## 5. Expose safely with HTTPS (nginx + certbot) — REQUIRED for live site to show real native MT

Your VPS likely already has nginx for the games.

**To make the PUBLIC live https://infinite-wallet.vercel.app show real NATIVE MT balances by default (no mixed content, no per-user http IP Settings needed):**

Use the ready-made configs in `mt-core/nginx/`.

See the full copy-paste guide:

```bash
cat mt-core/nginx/README.md
```

It covers:
- mt-core.conf (for :4001) and mt-auth.conf (for :4002)
- server_name subdomains (core.yourdomain.com + auth.yourdomain.com — point A records to the VPS IP)
- Enabling sites
- certbot for free TLS
- Updating CORS_ORIGINS in both .env files (include the new https domains + vercel + localhost)
- Restarting the services
- Setting VITE_MT_NODE_URL=https://core.yourdomain.com and VITE_AUTH_URL in Vercel project env vars
- Redeploy

After that, the live production wallet will use your real mt-core as the default for the NATIVE MT (PRIMARY) card and mt-auth for accounts/backups.

(For local dev testing you can still override via the in-app Settings using the raw http://IP:4001 etc.)

If you don't have extra subdomains yet, the README has notes. Using the bare VPS IP for HTTPS is not practical for Let's Encrypt + browser trust.

## 6. Test it

From anywhere (or from the wallet Settings):

```bash
# Health
curl http://core.yourdomain.com/health
# or http://YOUR_VPS_IP:4000/health

# Faucet a test address (gives 1000 native MT)
curl -X POST http://core.yourdomain.com/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_TEST_MT_ADDRESS_HERE"}'

# Check balance
curl http://core.yourdomain.com/account/YOUR_TEST_MT_ADDRESS_HERE
```

## 7. After HTTPS setup: live site uses real native MT by default

Once you have the nginx + certbot + VITE_ env vars set in Vercel (see the mt-core/nginx/README.md), the public live site will:

- Default to your https mt-core for the big NATIVE MT (PRIMARY — OUR NETWORK) card.
- Default to your https mt-auth for login + "Your Wallets" / encrypted backups.

No more "MT node unavailable" or mixed content on the live demo. Users see real on-chain native balances for wallets that have funds on the MT chain.

Local developers can still override via Settings (localStorage takes precedence).

The Solana SPL side card remains for legacy/bridge context (the $MT token you sent on Solana). Primary holdings and new activity should be on the native MT network.

## 8. Firewall on Contabo

```bash
# If using ufw
sudo ufw allow 4001/tcp   # mt-core
sudo ufw allow 4002/tcp   # mt-auth (adjust if you chose different ports)
# Better: only allow from your IP for now, or rely on nginx
```

Since you have nginx, 4000 can be localhost only.

## 9. Updates later (now recommended via git)

Since the full project is on GitHub:

On VPS (as root or after sudo -u mtcore):

```bash
cd /opt/mt-ecosystem
git pull
cd mt-core
chown -R mtcore:mtcore .
npm install --production   # if package.json changed
sudo systemctl restart mt-core
sudo systemctl status mt-core --no-pager
journalctl -u mt-core -n 10 --no-pager
```

This replaces manual scp for code changes. Keep your .env and data/ (they are gitignored).
```

Also update the initial clone note.

## 10. Set up mt-auth (for "Backed up to your account", cross-device restore, "Your Wallets" list)

mt-auth provides email/phone login + encrypted wallet backups (client-side encrypted, server never sees seeds).

Recommended: run it on a different port from mt-core, e.g. 4002 when core is on 4001.

### On VPS (after git clone or pull):

```bash
cd /opt/mt-ecosystem/mt-auth

# Install
npm install --production

# Data dir
mkdir -p data
sudo chown -R mtcore:mtcore /opt/mt-ecosystem/mt-auth

# Env (important for CORS + port)
cp .env.example .env
nano .env
```

Minimal .env:

```
PORT=4002
CORS_ORIGINS=https://infinite-wallet.vercel.app,http://localhost:5173
DATA_DIR=/opt/mt-ecosystem/mt-auth/data
```

### Install as systemd (persistent, Restart=always like mt-core)

From inside `/opt/mt-ecosystem/mt-auth`:

```bash
# Copy the template (or create dir if missing after git)
sudo cp systemd/mt-auth.service /etc/systemd/system/mt-auth.service || true
```

If cp fails (subfolder not present), use the tee block:

```bash
sudo tee /etc/systemd/system/mt-auth.service > /dev/null << 'EOL'
[Unit]
Description=MT Auth - Account & Encrypted Wallet Backup Service
After=network.target

[Service]
Type=simple
User=mtcore
Group=mtcore

WorkingDirectory=/opt/mt-ecosystem/mt-auth

EnvironmentFile=-/opt/mt-ecosystem/mt-auth/.env

# Fallbacks if no .env:
# Environment=PORT=4002
# Environment=CORS_ORIGINS=https://infinite-wallet.vercel.app
# Environment=DATA_DIR=/opt/mt-ecosystem/mt-auth/data

ExecStart=/usr/bin/node server.js

Restart=always
RestartSec=10
StartLimitBurst=5
StartLimitIntervalSec=60

NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOL
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mt-auth
sudo systemctl start mt-auth

sudo systemctl status mt-auth --no-pager
journalctl -u mt-auth -n 20 --no-pager
```

### Firewall

```bash
sudo ufw allow 4002/tcp
sudo ufw reload
```

### Test from your Windows machine (like you did for core)

```powershell
curl.exe -v --max-time 8 http://161.97.106.182:4002/health
```

Expect JSON with "service": "MT Auth", ok: true.

Also test login flow from the wallet once you set the Auth URL.

### Later updates for mt-auth (git workflow)

```bash
cd /opt/mt-ecosystem
git pull
cd mt-auth
chown -R mtcore:mtcore .
npm install --production
sudo systemctl restart mt-auth
sudo systemctl status mt-auth --no-pager
```

### Connect in wallet (local dev recommended for http://IP)

In Settings (local `npm run dev` so no mixed-content):

- Auth URL: http://161.97.106.182:4002
- Save
- Then login or use Guest + import seed — after login it will call loadMyWallets from your VPS mt-auth and populate "Your Wallets".
- Same for create/import: they now call addOrUpdateLocalWallet so list shows immediately + native MT refresh works.

For the **public live Vercel site** (https), http://IP calls will be blocked by browser. To make native MT + auth work on the public demo URL you need nginx + certbot for https front for both services, then set VITE_MT_NODE_URL and VITE_AUTH_URL in Vercel env (or user can try custom https in Settings on live). See nginx examples earlier in this doc.

Now with both services under systemd + git pull friendly, your "NATIVE MT (PRIMARY — OUR NETWORK)" is fully self-hosted.
