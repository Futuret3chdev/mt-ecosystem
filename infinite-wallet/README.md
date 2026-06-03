# MT Wallet — Official Wallet for the MT ECO SYSTEM

Phantom-grade, self-built, self-custodial wallet for the MT ECO SYSTEM.

- 100% local key management (bip39 mnemonic → ed25519)
- AES-GCM + PBKDF2 encrypted vault (password protected, never sent anywhere)
- Native MT chain support (compatible with mt-core node: tweetnacl + bs58 signatures)
- Solana $MT SPL balance + SOL for bridge context
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

Send / NFT transactions are signed locally and submitted to the node at http://localhost:4000.

## Production / Deploy

- Build: `npm run build`
- The output in `dist/` is a static site. Deploy to any static host (or the wallet.futuret3ch.com.au domain).

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
