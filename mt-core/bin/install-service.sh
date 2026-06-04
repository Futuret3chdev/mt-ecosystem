#!/bin/bash
set -e

echo "=== MT Core - Auto install systemd service ==="

# Must be run as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo bash $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MTCORE_DIR="$(dirname "$SCRIPT_DIR")"

echo "mt-core directory: $MTCORE_DIR"

# Find node
NODE_PATH=$(command -v node 2>/dev/null || which node 2>/dev/null || echo "")

if [ -z "$NODE_PATH" ]; then
  echo "ERROR: 'node' command not found in PATH."
  echo "Install Node.js first (e.g. via nodesource or nvm for the mtcore user)."
  echo "After installing node, run this script again."
  exit 1
fi

echo "Found node at: $NODE_PATH"
echo "Version: $($NODE_PATH --version)"

# Create user if needed
if ! id -u mtcore >/dev/null 2>&1; then
  echo "Creating system user 'mtcore'..."
  useradd -m -s /bin/bash mtcore
fi

# Ensure data dir
mkdir -p "$MTCORE_DIR/data"
chown mtcore:mtcore "$MTCORE_DIR/data"

# Ensure .env exists
if [ ! -f "$MTCORE_DIR/.env" ]; then
  if [ -f "$MTCORE_DIR/.env.example" ]; then
    cp "$MTCORE_DIR/.env.example" "$MTCORE_DIR/.env"
    echo "Created $MTCORE_DIR/.env from example. Please edit it now:"
    echo "  nano $MTCORE_DIR/.env"
    echo "At minimum set:"
    echo "  PORT=4001"
    echo "  CORS_ORIGINS=https://infinite-wallet.vercel.app,https://wallet.futuret3ch.com.au,https://auth.futuret3ch.com.au,https://api.futuret3ch.com.au"
    echo "  DATA_DIR=$MTCORE_DIR/data"
    read -p "Press enter after you have edited .env ..."
  else
    echo "WARNING: No .env.example found. Creating basic .env"
    cat > "$MTCORE_DIR/.env" << EENV
PORT=4001
CORS_ORIGINS=https://infinite-wallet.vercel.app,https://wallet.futuret3ch.com.au,https://auth.futuret3ch.com.au,https://api.futuret3ch.com.au
DATA_DIR=$MTCORE_DIR/data
EENV
    nano "$MTCORE_DIR/.env"
  fi
fi

# Write the service file with correct node path
SERVICE_FILE="/etc/systemd/system/mt-core.service"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=MT Core - Native MT Blockchain Node
After=network.target

[Service]
Type=simple
User=mtcore
Group=mtcore

WorkingDirectory=$MTCORE_DIR

EnvironmentFile=-$MTCORE_DIR/.env

ExecStart=$NODE_PATH node.js

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
EOF

echo "Service file written to $SERVICE_FILE"

systemctl daemon-reload
systemctl enable mt-core
systemctl start mt-core || true

echo ""
echo "=== Done ==="
systemctl status mt-core --no-pager || true
echo ""
echo "To watch logs: journalctl -u mt-core -f"
echo "To restart after editing .env: systemctl restart mt-core"
echo ""
echo "Test: curl http://localhost:4001/health"
