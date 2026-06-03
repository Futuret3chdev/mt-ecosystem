# MT Core on Contabo - Final Steps (as of June 2026)

## Current Status (from your ss + curl)
- mt-core is successfully running on **port 4001** (pid 4003842, listening on *:4001)
- The other "video" node is still on 4000 (leave it)
- Faucet worked: address 63NQwG9Y... now has balance 1000 native MT on your chain
- Account query returned {"balance":1000,"nonce":0}

## Next: Make the Live Wallet See Real Native MT

1. Open the live wallet: https://infinite-wallet.vercel.app

2. Go to **Settings** tab

3. Find the field:
   **MT Node URL (PRIMARY balance source — our native chain)**

4. Set it to exactly:
   ```
   http://161.97.106.182:4001
   ```

5. Click **Save**

6. Activate the **Test Account** (the one whose address is 63NQwG9YbgSQrBM4EqwYagnqc3pzKayTAC5KBtdKGSSX)

7. Click **REFRESH ON-CHAIN** (big button) or the small "force sync native" link on that row.

The big **NATIVE MT (PRIMARY — OUR NETWORK)** card (and the row in the list) should now show **1000.00** (or whatever you have after more faucets/transfers) instead of the demo 0.00.

The side card "SOLANA $MT (SPL)" will continue to show the real ~22 from Solana (Moralis path).

## Verify on VPS (optional but good)
```bash
sudo systemctl status mt-core --no-pager
curl http://localhost:4001/health
curl http://161.97.106.182:4001/account/63NQwG9YbgSQrBM4EqwYagnqc3pzKayTAC5KBtdKGSSX
```

## If the wallet still shows 0.00 native
- Make sure you saved the URL with **:4001** (not 4000)
- Clear the field, Save (to clear), then re-enter http://161.97.106.182:4001 and Save again
- Hard refresh the browser (Ctrl+Shift+R)
- Check the top bar in the wallet — it should show something like "161.97.106.182:4001" instead of "demo (native MT off..."

## Port notes
- 4001 is now the official port for mt-core on this VPS.
- If you ever want nginx in front, proxy  /  -> 127.0.0.1:4001 and update the wallet URL to your domain.
- Your .env on the VPS should have:
  ```
  PORT=4001
  CORS_ORIGINS=... (already has vercel + your domains)
  DATA_DIR=/opt/mt-ecosystem/mt-core/data
  ```

## Persistence
The node now saves accounts/nfts/txlog to data/ every 30s and on SIGTERM. Reboots of the VPS will keep the state (as long as the mtcore user owns the data dir).

You're done with the "move mt-core to Contabo and make native MT the real primary source" task.

The address 63NQwG9Y... now has real on-chain native MT that the wallet can read directly from your node.
