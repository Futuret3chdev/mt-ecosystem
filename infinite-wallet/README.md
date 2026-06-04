# INFINITE WALLET — Official Wallet for the MT-ECO SYSTEM

The self-built wallet with infinite possibilities. Full client-side control, email/phone accounts, cross-device encrypted backups via our mt-auth, native MT on our chain as primary, and more.

Self-built, self-custodial wallet for the MT-ECO SYSTEM. Developed by Futuret3ch and MemeTorrent.

- 100% local key management (bip39 mnemonic → ed25519)
- AES-GCM + PBKDF2 encrypted vault (password protected, never sent anywhere)
- Native MT chain PRIMARY (balances/NFTs/txs/sends retrieved from our mt-core /account etc; never from Solana for the native asset)
- Solana $MT (SPL) + SOL only as secondary (for current token holdings, gas, Jupiter in-wallet swaps, future bridge). Uses prioritized RPCs (Helius + QuickNode defaults) for reliable balance queries.
- Built-in NFT minting on MT chain
- Rockets (cross-game utility) display
- Self-built bridge flows (Solana burn proof → MT mint)
- Fixed ~1¢ fees (0.01 MT)
- No Firebase, no third-party auth, no external custody

## Quick Start (dev)

1. Start the MT node (required for balances, sends, NFTs):
   cd mt-core
   node node.js

2. Start the wallet:
   cd infinite-wallet
   npm install
   npm run dev

Open http://localhost:5173

Create or import a wallet (12-word seed), set a strong password. Everything is encrypted locally.

3. (Important for testing) Once both are running, in the wallet Portfolio view you will see a "🚰 Get 1000 Test $MT (dev faucet)" button right under your balance (only shown for localhost node). Click it — the local node will instantly credit your wallet 1000 test MT so you can try real sends, NFT mints, etc. without touching genesis multisig.

Native MT balance is always fetched from our node first (see Settings → MT Node URL to point at a running or deployed mt-core so live previews or remote can retrieve from "us"). Solana queries only hit for the SPL leg.
Send / NFT transactions (native) are signed locally and submitted to the node at http://localhost:4000 (or your configured MT Node).

## Production / Deploy

- Build: `npm run build`
- The output in `dist/` is a static site. Deploy to any static host (or the wallet.futuret3ch.com.au domain).

**For reliable public Solana $MT (SPL) balances on the live site without every visitor pasting a key:**

Add an environment variable on your hosting platform (Vercel, Railway, etc.):

- **Key:** `VITE_MORALIS_API_KEY`
- **Value:** your full Moralis JWT token (the one that starts with `eyJhbGci...`)
- Redeploy / trigger a new build after setting it.

The key will be used as the default (baked into the client JS at build time). Visitors can still override it per-browser in the wallet's Settings tab. See the in-app Settings UI for more details. (Note: any client-side key is visible in the built bundle.)

Same pattern works for `VITE_` vars if you want to default the custom RPC or MT node.

## Security Notes

- Private keys exist only in memory after unlock.
- Lock the wallet (or close tab) to clear decrypted material.
- Always back up your seed phrase offline. There is no cloud recovery.

## Future

- Browser extension version
- Hardware wallet (Ledger) integration
- In-wallet game embeds
- Full developer console + licensed API keys

Part of the MT ECO SYSTEM (https://memetorrent.futuret3ch.com.au/).
