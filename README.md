# MT-ECO SYSTEM

**Next-generation decentralized on-chain network.**

Native token: **$MT** (`ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump`)

- Self-built **INFINITE WALLET** (email + phone accounts, multiple wallets per user, cross-device access via our self-built auth) — developed by Futuret3ch and MemeTorrent for the MT-ECO SYSTEM
- Ultra-low fixed fees (~1¢ SOL equivalent)
- On-chain NFTs (mint directly in the wallet)
- **Rockets** — cross-game/platform utility earned in MT Games, stored and transferable via the wallet
- Real Buy/Sell on live Jupiter & Raydium (nothing fake)
- Self-built bridge (starting with Solana)
- Everything built in-house: wallet, node/protocol, auth service, future games, developer APIs

**No third-party chains, bridges, wallets, or custodians.**

## Repository Structure

```
mt-ecosystem/
├── infinite-wallet/      # The official INFINITE WALLET (Vite + React)
│   └── Deploy to Vercel as static site (https://infinite-wallet.vercel.app)
├── memetorrent-react/    # Marketing + Web3 site (Next.js 16 + TS + Tailwind)
│   └── Deploy to Vercel (memetorrent.futuret3ch.com.au)
├── mt-core/              # MT Node / Protocol (Express + custom ledger, crypto, NFTs)
│   └── Run locally for dev. Deploy to Railway/Render/VPS for production.
├── mt-genesis-cli/       # Tools for genesis multisig / initial distribution
└── bridge/               # Future cross-chain bridge modules
```

## Quick Start (Local Development)

### 1. MT Node (backend)
```powershell
cd mt-core
npm install
npm run dev
# Node runs on http://localhost:4000
# Includes dev faucet: POST /faucet { "address": "..." }
```

### 2. INFINITE WALLET (frontend)
```powershell
cd infinite-wallet
npm install
npm run dev
# Open http://localhost:5173
# Create a vault → use the 🚰 "Get 1000 Test $MT (dev faucet)" button
# Then try Send, Mint NFT, etc.
```

### 3. Marketing / Web3 Site
```powershell
cd memetorrent-react
npm install
npm run dev
# Open the Next.js dev server
```

### 4. Auth Service (email + phone accounts + cross-device wallet restore)
```powershell
cd mt-auth
npm install
npm start
# Runs on http://localhost:4001
# Wallet will use it for signup/login + encrypted backups
```

All frontends are self-contained. The wallet talks to the local node (4000) and auth (4001) when running locally.

On the live Vercel previews the wallet works in "local demo" mode. For full email/phone + multi-device, run the auth service locally and update AUTH_URL in the wallet lib.

## GitHub + Vercel Deployment

This repo is set up to be easily deployed on Vercel for live previews and production.

### Push to GitHub (done automatically during setup)

### Deploy on Vercel (Recommended)

**Option A — Two separate Vercel projects (cleanest for custom domains)**

The projects were already created and deployed via Vercel CLI during setup.

Current live previews (auto-updating from GitHub `main`):
- **Marketing site**: https://memetorrent-react.vercel.app (or the project-specific one)
- **INFINITE WALLET**: https://infinite-wallet.vercel.app (the production wallet)

**Manual / re-deploy steps if needed:**

1. Go to [vercel.com/new](https://vercel.com/new) → Import Git Repository → select `Futuret3chdev/mt-ecosystem`.

2. **For the main site** (`memetorrent.futuret3ch.com.au`):
   - **Root Directory**: `memetorrent-react`
   - Framework Preset: **Next.js**
   - Deploy.

3. **For the wallet** (https://infinite-wallet.vercel.app):
   - Import the **same** repo as a second project.
   - **Root Directory**: `infinite-wallet`
   - Framework Preset: **Vite**
   - Output Directory: `dist`
   - Deploy.

Then in Vercel project settings, add your custom domains and configure DNS (CNAME records).

4. In each Vercel project → Settings → Domains:
   - Add your custom domains for memetorrent-react and the wallet if using custom domains instead of vercel.app subdomains
   - Update DNS (CNAME to the Vercel target).

**Option B — Single repo with vercel.json (advanced)**

You can add a `vercel.json` at the root later to define multiple builds if preferred.

### Backend (mt-core)

The Node server is **not** a good fit for Vercel serverless functions (it's a long-running Express app with in-memory state today).

Recommended hosting for the MT node:
- Railway.app
- Render.com
- Fly.io
- Your own VPS / Docker

Update the wallet's `MT_NODE` constant (in `infinite-wallet/src/lib/mt-wallet.js`) to point to your deployed node URL when going live.

## Security & Philosophy

- Wallet keys are generated and encrypted **entirely in the browser** (AES-GCM + PBKDF2).
- Signing happens locally. The node only receives signatures + public data.
- No Firebase, no external auth providers in the core flows.
- Future developer APIs and social connect (Google, Microsoft, Meta) will be self-hosted lightweight services.

## Next Steps While Developing

- Real persistence for the MT node (replace in-memory ledger)
- Complete Solana ↔ MT bridge flow (burn proof → mint)
- Games that award Rockets
- Developer portal + licensed API keys
- Browser extension version of the wallet
- ...

## License / Contact

Developed by Futuret3ch and MemeTorrent for the MT-ECO SYSTEM.

See individual package READMEs for more details:
- `infinite-wallet/README.md`
- `memetorrent-react/README.md`
- `mt-core/` (read the source + node.js comments)

---

**This is the foundation of a fully self-built on-chain ecosystem. Let's make it the best one.**
