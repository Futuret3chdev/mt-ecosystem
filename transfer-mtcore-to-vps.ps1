# Run this script FROM YOUR WINDOWS MACHINE (PowerShell)
# NOT from inside the SSH session on the VPS.
#
# It will transfer the current good mt-core/node.js to your Contabo VPS.
# This fixes the old skeleton that was causing immediate exit after banner.

$ErrorActionPreference = "Stop"

$VPS_USER = "root"
$VPS_HOST = "161.97.106.182"
$REMOTE_DIR = "/opt/mt-ecosystem/mt-core"
$LOCAL_DIR = "E:\mt-ecosystem\mt-core"
$CORE_FILES = @("node.js", "nfts.js", "txlog.js", "ledger.js", "constants.js", "crypto.js")

Write-Host "=== MT Core Transfer Helper ===" -ForegroundColor Cyan
Write-Host "This must be run on Windows, in a PowerShell that has access to E:\ drive."
Write-Host "Make sure you can SSH to the VPS (test with: ssh ${VPS_USER}@${VPS_HOST} first if needed)."
Write-Host ""

foreach ($file in $CORE_FILES) {
    $localPath = Join-Path $LOCAL_DIR $file
    if (-not (Test-Path $localPath)) {
        Write-Error "Local file not found: $localPath"
        exit 1
    }
}

Write-Host "Transferring core files to VPS..." -ForegroundColor Yellow

foreach ($file in $CORE_FILES) {
    $localForScp = "E:/mt-ecosystem/mt-core/$file"
    try {
        scp $localForScp "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/$file"
        Write-Host "  Uploaded $file" -ForegroundColor Green
    } catch {
        Write-Host "SCP failed for $file. Common fixes:" -ForegroundColor Red
        Write-Host "1. Make sure OpenSSH client is enabled on Windows."
        Write-Host "2. Try Git Bash instead of PowerShell."
        Write-Host "3. Use WinSCP GUI to upload the files from $LOCAL_DIR to $REMOTE_DIR"
        exit 1
    }
}

Write-Host ""
Write-Host "=== Next steps on the VPS (copy-paste these) ===" -ForegroundColor Cyan
Write-Host "ssh ${VPS_USER}@${VPS_HOST}"
Write-Host "cd ${REMOTE_DIR}"
Write-Host ""
Write-Host "# Verify transfer (size should now be ~9k, and head should show modern code):"
Write-Host "ls -l node.js"
Write-Host "head -30 node.js   # look for 'CONFIG - Perfect for Contabo' and 'SIMPLE PERSISTENCE'"
Write-Host ""
Write-Host "# IMPORTANT: Change port because 4000 is taken by your video-api game"
Write-Host "nano .env"
Write-Host "# Edit the PORT line to:"
Write-Host "PORT=4001"
Write-Host "# (keep your CORS_ORIGINS and DATA_DIR lines)"
Write-Host ""
Write-Host "chown mtcore:mtcore node.js nfts.js txlog.js ledger.js constants.js crypto.js .env"
Write-Host ""
Write-Host "# Test manually (this must STAY RUNNING and print modern banner with 0.0.0.0:4001):"
Write-Host "sudo -u mtcore /usr/bin/node node.js"
Write-Host "# Press Ctrl+C after you see it stays up."
Write-Host ""
Write-Host "# If manual test good, restart service:"
Write-Host "sudo systemctl restart mt-core"
Write-Host "sudo systemctl status mt-core --no-pager"
Write-Host ""
Write-Host "# Check logs for persistence (should no longer say 'getInternal* is not a function'):"
Write-Host "journalctl -u mt-core -n 30 --no-pager"
Write-Host ""
Write-Host "# Test from your Windows PC (use the new port):"
Write-Host "curl -v http://161.97.106.182:4001/health"
Write-Host ""
Write-Host "# Credit the test address:"
Write-Host 'curl -X POST http://161.97.106.182:4001/faucet -H "Content-Type: application/json" -d "{\"address\":\"63NQwG9YbgSQrBM4EqwYagnqc3pzKayTAC5KBtdKGSSX\"}"'
Write-Host ""
Write-Host "# Then in the live wallet (https://infinite-wallet.vercel.app):"
Write-Host "# Settings > MT Node URL = http://161.97.106.182:4001 > Save"
Write-Host "# Activate Test Account > REFRESH ON-CHAIN"
Write-Host ""
Write-Host "Done. The NATIVE MT card should now pull real data from your node (not 0.00 demo)." -ForegroundColor Green
