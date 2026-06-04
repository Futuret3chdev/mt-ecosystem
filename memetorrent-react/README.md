# memetorrent.futuret3ch.com.au — MT-ECO SYSTEM Web3 Site

The official marketing + on-ramp site for the MT-ECO SYSTEM (developed by Futuret3ch and MemeTorrent).

- Hero with strong vision + direct "Launch INFINITE WALLET" CTAs
- $MT token stats (via existing API)
- Ecosystem highlights
- Features: 1¢ fees, self-built everything, NFTs, Rockets, self-built bridges
- Prominent INFINITE WALLET promo linking to https://wallet.futuret3ch.com.au/ (all links in this site updated from old wallet.futuret3ch.com.au)
- Security section (self-custody emphasis)
- Ready for future developer API / social connect (Meta/Google/Microsoft) pages

## Dev

```bash
cd memetorrent-react
npm install
npm run dev
```

Builds to static output. Deploy alongside (or behind) the domain.

## Connection to Wallet

The site promotes and links out to the standalone INFINITE WALLET (Vite app in ../infinite-wallet).

Future: deeper integration (connect button that can talk to a running INFINITE WALLET instance via postMessage or injected provider, and "Sign in with MT" using our own lightweight social APIs).

See also: ../mt-core (the node), ../infinite-wallet (the actual wallet).

Part of building the best decentralized on-chain network — no third parties.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
