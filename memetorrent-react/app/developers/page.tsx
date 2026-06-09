'use client';

import Link from 'next/link';

export default function DevelopersPage() {
  const downloads = [
    { label: 'SOFTWARE', desc: 'Desktop tools & SDKs' },
    { label: 'ANDROID', desc: 'Mobile integration library' },
    { label: 'IOS', desc: 'iOS SDK & examples' },
    { label: 'BROWSER EXTENSIONS', desc: 'Wallet & dApp extensions' },
  ];

  return (
    <main className="min-h-screen">
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <Link href="/" className="font-semibold tracking-tight flex items-center gap-2">
            <span className="text-emerald-400">MT</span> ECO SYSTEM
          </Link>
          <div className="flex items-center gap-3 sm:gap-6 text-sm">
            <Link href="/" className="opacity-70 hover:opacity-100">Back to Home</Link>
            <a href="https://wallet.futuret3ch.com.au/" target="_blank" className="font-medium px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-white/30 hover:bg-white/5 text-xs sm:text-sm">Launch Infinite Wallet</a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">FOR BUILDERS</div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-1.6px] mb-4">Develop on MT-ECO SYSTEM</h1>
        <p className="opacity-70 max-w-2xl mb-8">
          Build applications, games, tools, bridges and extensions that integrate directly with the self-built MT network, 
          INFINITE WALLET, native $MT token, Rockets economy, and on-chain NFTs.
        </p>

        {/* Licenses */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.015] p-6 sm:p-8 mb-10">
          <div className="text-sm font-semibold tracking-tight mb-3">Licenses</div>
          <p className="text-sm opacity-70 leading-relaxed mb-4">
            To develop on MT-ECO SYSTEM you will need the appropriate licenses for the core components, 
            node software, SDKs and integration modules. All development happens against our self-hosted infrastructure.
          </p>
          <div className="text-xs opacity-60">Full license details and access requirements will be provided with the developer resources.</div>
        </div>

        {/* Getting Started */}
        <div className="mb-10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">GETTING STARTED</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Quick Start</h2>
          <div className="prose prose-invert text-sm opacity-80 max-w-none">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Install the MT SDK via npm: <code>npm install @mt-ecosystem/sdk</code></li>
              <li>Connect your INFINITE WALLET or any self-custodial Solana/MT wallet.</li>
              <li>Use the SDK to query balances, execute flows (bridge, swap, harvest), or build custom dApps.</li>
            </ol>
            <p>Example:</p>
            <pre className="bg-black p-4 rounded text-xs overflow-auto"><code>{`import { MTClient } from '@mt-ecosystem/sdk';

const client = new MTClient({ wallet: yourWallet });
const balance = await client.getBalance('MT');
console.log(balance); // 124567890 MT`}</code></pre>
          </div>
        </div>

        {/* SDK Reference (modeled after Raydium/Jupiter style) */}
        <div className="mb-10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">SDK REFERENCE</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Core Classes &amp; Methods</h2>
          
          <div className="space-y-6 text-sm">
            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-mono text-emerald-400 mb-1">MTClient</div>
              <div className="opacity-80">Main entry point for all on-chain interactions.</div>
              <ul className="mt-2 space-y-1 text-xs opacity-70">
                <li><code>constructor(options: {'{'} wallet, rpcUrl? {'}'})</code></li>
                <li><code>getBalance(mint: 'MT' | 'SPL' | string): Promise&lt;number&gt;</code></li>
                <li><code>bridge(params): Promise&lt;TxSignature&gt;</code> — Native ↔ SPL</li>
                <li><code>swap(params): Promise&lt;TxSignature&gt;</code> — Jupiter routed or direct</li>
                <li><code>harvestRockets(game: string): Promise&lt;TxSignature&gt;</code></li>
              </ul>
            </div>

            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-mono text-emerald-400 mb-1">WalletAdapter</div>
              <div className="opacity-80">Self-custodial wallet helpers (Phantom, Solflare, Backpack, INFINITE WALLET).</div>
              <ul className="mt-2 space-y-1 text-xs opacity-70">
                <li><code>connect(): Promise&lt;PublicKey&gt;</code></li>
                <li><code>signTransaction(tx: Transaction): Promise&lt;Transaction&gt;</code></li>
                <li><code>deriveSubWallet(role: 'couple' | 'team' | 'auditor'): Keypair</code></li>
              </ul>
            </div>

            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-mono text-emerald-400 mb-1">FlowBuilder</div>
              <div className="opacity-80">For ONE-PLACE MANAGEMENT FLOWS (NFT designer, staking preview, reports, constellation).</div>
              <ul className="mt-2 space-y-1 text-xs opacity-70">
                <li><code>buildBridgeFlow(direction, amount)</code></li>
                <li><code>buildReport(): MerkleProof</code></li>
                <li><code>simulateNFTMint(traits): PreviewNFT</code></li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Endpoints (modeled after Jupiter/Raydium docs) */}
        <div className="mb-10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">API ENDPOINTS</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">REST &amp; On-Chain APIs</h2>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-semibold">GET /api/holders</div>
              <div className="text-xs opacity-60 mb-2">Live holder &amp; stats data (used by TokenStats).</div>
              <div className="mt-1 text-xs opacity-70">Returns Dexscreener-style payload + on-chain holder count.</div>
            </div>

            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-semibold">On-chain: Bridge / Swap / Harvest</div>
              <div className="text-xs opacity-60 mb-2">Direct program calls via INFINITE WALLET or SDK. No third-party relayers.</div>
              <div className="mt-1 text-xs opacity-70">See whitepaper for program IDs and instruction layouts.</div>
            </div>

            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-semibold">WebSocket: Live Flows</div>
              <div className="text-xs opacity-60 mb-2">Subscribe to real-time Rockets earnings, NFT mints, bridge proofs.</div>
              <div className="mt-1 text-xs opacity-70">wss://api.mt-ecosystem.futuret3ch.com/ws</div>
            </div>
          </div>
        </div>

        {/* Code Examples */}
        <div className="mb-10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">EXAMPLES</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Quick Integrations</h2>

          <div className="space-y-6">
            <div>
              <div className="font-medium mb-2 text-sm">React + Wallet</div>
              <pre className="bg-black p-4 rounded text-xs overflow-auto"><code>{`import { useWallet } from '@solana/wallet-adapter-react';
import { MTClient } from '@mt-ecosystem/sdk';

function MyDapp() {
  const { wallet } = useWallet();
  const client = new MTClient({ wallet });

  const handleBridge = async () => {
    const sig = await client.bridge({ 
      direction: 'native-to-spl', 
      amount: 5_000_000 
    });
    console.log('Bridged:', sig);
  };

  return <button onClick={handleBridge}>Bridge 5M MT</button>;
}`}</code></pre>
            </div>

            <div>
              <div className="font-medium mb-2 text-sm">Node / Backend (with license)</div>
              <pre className="bg-black p-4 rounded text-xs overflow-auto"><code>{`import { MTClient } from '@mt-ecosystem/sdk';
const client = new MTClient({ 
  rpcUrl: process.env.MT_RPC, 
  licenseKey: process.env.MT_LICENSE 
});

const report = await client.generateAuditReport({ 
  wallet: 'YourBusinessVaultPubkey',
  includeNFTs: true 
});`}</code></pre>
            </div>
          </div>
        </div>

        {/* Resources & Downloads */}
        <div>
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">RESOURCES &amp; DOWNLOADS</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-6">SDKs, Tools &amp; Docs</h2>

          {/* Downloads disabled per request */}
          <div className="text-xs opacity-50 mb-6">
            Downloads (SDKs, mobile libs, browser extensions) are currently disabled / coming soon. Check back or contact for access.
          </div>

          <div className="mt-6 text-xs opacity-50">
            All packages are open for licensed developers. Full source and more examples in the MT GitHub org (coming soon).
            Join the developer Telegram or email Support@MemeTorrent.com for early access keys.
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/10 text-sm">
          <a href="/whitepaper" className="text-emerald-400 hover:underline">Read the $MT Whitepaper →</a>
          <div className="mt-2 opacity-60">Core architecture, token mechanics and integration concepts are documented there.</div>
        </div>

        {/* Simple Sandbox mock */}
        <div className="mt-8 p-6 border border-white/10 rounded-3xl">
          <h3 className="font-semibold mb-3">Sandbox (Devnet) — Try it now</h3>
          <p className="text-xs opacity-70 mb-3">Test endpoints safely. (Mock responses for demo.)</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => alert('Response: { "balance": "124567890", "mint": "ELyw...pump" }')} className="px-3 py-1 text-xs border border-white/20 rounded hover:bg-white/5">GET /v1/wallet</button>
            <button onClick={() => alert('Response: { "txId": "simulated-123", "status": "confirmed" }')} className="px-3 py-1 text-xs border border-white/20 rounded hover:bg-white/5">POST /v1/transactions</button>
            <button onClick={() => alert('Response: { "nftId": "new-456", "owner": "your-wallet" }')} className="px-3 py-1 text-xs border border-white/20 rounded hover:bg-white/5">POST /v1/nft/mint</button>
          </div>
          <p className="text-[10px] opacity-50 mt-2">Real Devnet coming soon. Use the whitepaper for full spec.</p>
        </div>

        {/* Get Started & Jupiter-style Docs (added per request) */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">GET STARTED</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Docs</h2>

          <div className="space-y-8 text-sm opacity-90">
            <div>
              <h3 className="font-semibold mb-2">AI</h3>
              <p>Our AI assistant (powered by on-site Grok-like responses) helps with questions about $MT, wallet, utilities, and more. See the contact page for the live chat.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Tool Kits</h3>
              <p>SDKs and toolkits for integrating with MT-ECO SYSTEM. (Downloads currently disabled.)</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Changelog</h3>
              <p>Track updates to the SDK, APIs, and on-chain features. Full changelog coming soon in the MT GitHub.</p>
            </div>

            {/* Full pasted Jupiter-style content for Get Started / Swap / Advanced / Guides / Migration */}
            <div className="mt-6 pt-4 border-t border-white/10 text-xs opacity-80">
              <h4 className="font-semibold mb-1">Get Started</h4>
              <p>AI • Tool Kits • Changelog • Resources</p>

              <h4 className="font-semibold mt-3 mb-1">Swap</h4>
              <p>Overview: One API for all swap use cases on MT-ECO SYSTEM (inspired by Meta-Aggregator patterns).</p>
              <p className="mt-1">Meta-Aggregator: All routers compete for the best price. You get a fully assembled transaction, sign it, and MT handles landing. Best for most integrations.</p>
              <p className="mt-1">Router: Metis onchain routing. Get raw swap instructions to build your own transaction. Add custom instructions, CPI, or modify the transaction however you need.</p>
              <p className="mt-1">Choosing a path: Start with Meta-Aggregator for best price. Only use the Router if you need to modify the transaction.</p>

              <h4 className="font-semibold mt-3 mb-1">Order &amp; Execute</h4>
              <p>The Swap API unifies capabilities into a single entry point. Two paths cover every use case: Meta-Aggregator (all routing engines compete for the best price. You get a fully assembled transaction, sign it, and Jupiter handles landing) and Router (Metis onchain routing only. You get raw swap instructions with full transaction control for custom builds, CPI, and composability).</p>

              <h4 className="font-semibold mt-3 mb-1">Router</h4>
              <p>Build: Common Instructions, Transaction Submission (GET /build, POST /submit). Self-managed via your own RPC, or via /submit with SOL tips for Jupiter’s proprietary landing pipeline.</p>

              <h4 className="font-semibold mt-3 mb-1">Advanced</h4>
              <p>Overview, Slippage Estimation, Gasless Swaps, Compute Units &amp; Priority Fees, Reduce Transaction Size, Reduce Latency, Routing Integration, Integrate DEX into Metis, Market Listing, Integrate MM into JupiterZ (RFQ).</p>

              <h4 className="font-semibold mt-3 mb-1">Guides</h4>
              <p>Embed Swap Widget, Migration (Metis to Router, Metis to Meta-Aggregator, Ultra to Meta-Aggregator).</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Resources</h3>
              <p>Whitepaper, token info, and integration guides. See links above and the main site sections for LIVE $MT, flows, and TAP.</p>
            </div>

            {/* Swap section modeled on provided Jupiter docs */}
            <div>
              <h3 className="font-semibold mb-2">Swap</h3>
              <p className="mb-2">Overview: One API for all swap use cases on MT-ECO SYSTEM (inspired by Meta-Aggregator patterns).</p>

              <div className="mb-4">
                <p className="font-medium">Meta-Aggregator</p>
                <p className="text-xs opacity-80">All routers compete for best price. Get a fully assembled transaction, sign it, and MT handles landing. Best for most integrations.</p>
              </div>

              <div className="mb-4">
                <p className="font-medium">Router</p>
                <p className="text-xs opacity-80">On-chain routing only. Get raw swap instructions with full transaction control for custom builds, CPI, and composability.</p>
              </div>

              <div className="text-xs opacity-70 mb-2">Choosing a path: Start with Meta-Aggregator for best price and simplicity. Use Router only if you need to modify the transaction.</div>

              <div className="mb-4">
                <p className="font-medium mb-1">Endpoints (example structure)</p>
                <ul className="list-disc pl-5 text-xs space-y-1 opacity-80">
                  <li>GET /swap/order — Get a quote and assembled transaction</li>
                  <li>POST /swap/execute — Execute a signed transaction with managed landing</li>
                  <li>GET /swap/build — Get a quote and raw swap instructions</li>
                  <li>POST /tx/submit — Submit signed transaction</li>
                </ul>
              </div>

              <div>
                <p className="font-medium">Advanced</p>
                <p className="text-xs opacity-80">Gasless swaps, compute unit estimation, reducing transaction size and latency, slippage estimation, priority fees.</p>
              </div>

              <div className="mt-2">
                <p className="font-medium">Guides</p>
                <p className="text-xs opacity-80">Embed Swap Widget, Migration guides (e.g. from older flows to new router/meta-aggregator), Integrate DEX into MT routing, Market Listing.</p>
              </div>
            </div>

            <div className="text-[10px] opacity-50">Full interactive docs and live API explorer coming soon. See the Jupiter and Raydium docs style for reference on structure.</div>

            {/* Additional pasted Jupiter-style content for Get Started / Swap / Advanced / Guides / Migration */}
            <div className="mt-8 pt-4 border-t border-white/10 text-xs opacity-80">
              <h4 className="font-semibold mb-1">Order &amp; Execute</h4>
              <p>The Swap API unifies Jupiter’s swap capabilities into a single entry point at https://api.jup.ag/swap/v2. Two paths cover every use case: Meta-Aggregator (all routing engines compete for the best price. You get a fully assembled transaction, sign it, and Jupiter handles landing) and Router (Metis onchain routing only. You get raw swap instructions with full transaction control for custom builds, CPI, and composability).</p>

              <h4 className="font-semibold mt-3 mb-1">Router</h4>
              <p>Build: Common Instructions, Transaction Submission (GET /build, POST /submit). Self-managed via your own RPC or /submit with SOL tips.</p>

              <h4 className="font-semibold mt-3 mb-1">Advanced</h4>
              <p>Overview, Slippage Estimation, Gasless Swaps, Compute Units &amp; Priority Fees, Reduce Transaction Size, Reduce Latency, Routing Integration, Integrate DEX into Metis, Market Listing, Integrate MM into JupiterZ (RFQ).</p>

              <h4 className="font-semibold mt-3 mb-1">Guides</h4>
              <p>Embed Swap Widget, Migration (Metis to Router, Metis to Meta-Aggregator, Ultra to Meta-Aggregator).</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-8 text-center text-[10px] opacity-40">
        <Link href="/" className="hover:text-white">← Back to MT ECO SYSTEM</Link>
      </div>
    </main>
  );
}
