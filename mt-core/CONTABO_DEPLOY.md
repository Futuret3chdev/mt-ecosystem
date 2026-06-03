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
PORT=4000
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
# Environment=PORT=4000
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

## 5. Expose safely (nginx recommended, since you run many services)

Your VPS likely already has nginx for the games.

Add a server block for mt-core (reverse proxy + SSL).

Example `/etc/nginx/sites-available/mt-core`:

```nginx
server {
    listen 80;
    server_name core.yourdomain.com;   # or use IP temporarily

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/mt-core /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Then get SSL:

```bash
sudo certbot --nginx -d core.yourdomain.com
```

If you don't have a domain yet for it, you can use the VPS IP directly first for testing (but update CORS, and note that the live HTTPS wallet will hit Mixed Content blocks with plain HTTP — see the wallet connection section below for testing workaround using local dev server).

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

## 7. Connect from the live wallet

**Critical for the live HTTPS wallet:** The Vercel site is served over HTTPS. Modern browsers block "mixed content" — i.e., HTTPS page fetching HTTP APIs. You **must** put mt-core behind HTTPS (via nginx + certbot as below) for the live site to work without errors.

On the live wallet (https://infinite-wallet.vercel.app):

- Go to **Settings** tab
- Find "MT Node URL (PRIMARY balance source — our native chain)"
- Paste the **HTTPS** URL once you have nginx + certbot: e.g. `https://core.yourdomain.com` 
- For quick testing only: you can run the wallet locally with `npm run dev` (HTTP) and point it at `http://YOUR_IP:4001`. The live site will still need HTTPS.

- Save

The native MT card will now talk to your real mt-core on Contabo (no more mixed content blocks or localhost refused).

Use the faucet button (it appears when a node is configured; we relaxed the "local only" gate for self-hosted nodes). Or manually POST to /faucet as shown.

To fund the wallet address 63NQwG9YbgSQrBM4EqwYagnqc3pzKayTAC5KBtdKGSSX (or the MT addr shown in the list for that wallet):

- The MT address for the wallet is shown in the list as "MT: ..." for Test Account etc. Use that as the "address" for faucet.

To fund the wallet address 63NQwG9YbgSQrBM4EqwYagnqc3pzKayTAC5KBtdKGSSX (or the MT addr shown in the list for that wallet):

- The MT address for the wallet is shown in the list as "MT: ..." for Test Account etc. Use that as the "address" for faucet.

Note: The address string for a wallet's native MT and its Solana SOL addr is the **same** because of how we derive from seed. But they live on different chains.

You sent SPL on Solana → shows in "SOLANA $MT (SPL)" side card.

You will send native MT on your mt-core → shows in big "NATIVE MT" card.

## 8. Firewall on Contabo

```bash
# If using ufw
sudo ufw allow 4001/tcp   # only if not behind nginx
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

## 10. Also consider moving mt-auth

For full cross-device + multiple wallets, do the same for mt-auth (port 4001, similar service file).

See the root SELF-HOSTING.md for more.

Once mt-core is running and wallet points to it, native balances will appear when you faucet or transfer on the native chain.

Test with the specific wallet that has 63NQwG9Y... as its address.

Let me know the output of the health check or faucet, and we can iterate (e.g. if you want me to add rate limiting to faucet, better logging, etc.).

You can also keep running other 200 games on the same VPS — just use different ports/domains.

Good luck, this will make the native MT real on your infrastructure. 

Run the commands above on your VPS and report back any errors. I'll help debug with more tool-guided fixes if needed.
