'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// MT-Connect supported platforms for OAuth / API identity flows (as requested)
const SOCIAL_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: 'f', color: '#1877F2', authHint: 'Meta Graph API (public_profile, email)' },
  { key: 'instagram', label: 'Instagram', icon: '📷', color: '#E1306C', authHint: 'Instagram Basic Display / Graph API' },
  { key: 'tiktok', label: 'TikTok', icon: '♪', color: '#000000', authHint: 'TikTok Login Kit (user.info.basic)' },
  { key: 'snapchat', label: 'Snapchat', icon: '👻', color: '#FFFC00', authHint: 'Snap Kit Login + Bitmoji (if enabled)' },
  { key: 'google', label: 'Google', icon: 'G', color: '#4285F4', authHint: 'OpenID Connect (email, profile, openid)' },
  { key: 'microsoft', label: 'Microsoft', icon: 'Ⓜ', color: '#00A4EF', authHint: 'Microsoft Identity (openid, profile, email)' },
];

type ConnectedSocial = {
  connected: boolean;
  profile?: { id: string; name: string; email?: string; handle?: string };
  linkedAt?: string;
};

type WalletDemoState = {
  address: string | null;
  balance: number | null;
  provider: string | null;
  signature: string | null;
};

const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
const CONNECTION = new Connection(SOLANA_RPC_URL, 'confirmed');

export default function DevelopersPage() {
  // MT-Connect social identity state (simulates real OAuth roundtrips + backend API calls)
  const [connectedSocials, setConnectedSocials] = useState<Record<string, ConnectedSocial>>({});
  const [flowLog, setFlowLog] = useState<string>('');
  const [lastApiResponse, setLastApiResponse] = useState<string>('');

  // Wallet deeplink + injected demo (modeled directly on the SolanaReels game you provided)
  const [walletDemo, setWalletDemo] = useState<WalletDemoState>({ address: null, balance: null, provider: null, signature: null });
  const [walletConnecting, setWalletConnecting] = useState<string | null>(null);

  // Simple activity / toast log for the page
  const [activity, setActivity] = useState<string>('');

  const showActivity = (msg: string) => {
    setActivity(msg);
    setTimeout(() => setActivity(''), 2600);
  };

  // ==================== MT-CONNECT: REALISTIC OAUTH + API FLOW ====================
  const getAuthUrl = (platform: string): string => {
    const redirect = encodeURIComponent('https://memetorrent.futuret3ch.com.au/api/oauth/callback');
    switch (platform) {
      case 'facebook':
        return `https://www.facebook.com/v19.0/dialog/oauth?client_id=MT_DEMO_APP&redirect_uri=${redirect}&scope=public_profile,email&response_type=code`;
      case 'instagram':
        return `https://api.instagram.com/oauth/authorize?client_id=MT_DEMO_APP&redirect_uri=${redirect}&scope=user_profile,user_media&response_type=code`;
      case 'tiktok':
        return `https://www.tiktok.com/v2/auth/authorize?client_key=MT_DEMO_APP&scope=user.info.basic&redirect_uri=${redirect}&response_type=code`;
      case 'snapchat':
        return `https://accounts.snapchat.com/accounts/oauth2/auth?client_id=MT_DEMO_APP&redirect_uri=${redirect}&scope=https://auth.snapchat.com/oauth2/api/user.display_name&response_type=code`;
      case 'google':
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=MT_DEMO_APP&redirect_uri=${redirect}&scope=openid%20email%20profile&response_type=code`;
      case 'microsoft':
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=MT_DEMO_APP&redirect_uri=${redirect}&scope=openid%20profile%20email&response_type=code`;
      default:
        return 'https://example.com/oauth/start';
    }
  };

  const connectSocial = (platformKey: string) => {
    const p = SOCIAL_PLATFORMS.find(s => s.key === platformKey)!;
    const authUrl = getAuthUrl(platformKey);

    let log = `MT-Connect flow started for ${p.label}\n`;
    log += `1. Opening provider OAuth consent screen (real URL):\n   ${authUrl}\n`;
    log += `   (In production: register your app in the ${p.label} Developer Portal and set exact redirect_uri to your MT backend.)\n`;
    setFlowLog(log);
    showActivity(`Opening ${p.label} login...`);

    // Open the real provider auth page (demo client_id will show error page or consent if you register it later)
    window.open(authUrl, '_blank', 'noopener,noreferrer,width=520,height=680');

    // Simulate the redirect + code exchange + profile fetch + MT linking (exactly like a real backend flow would do)
    setTimeout(() => {
      const demoProfile = {
        id: `${platformKey}_demo_${Math.floor(Math.random() * 900000) + 100000}`,
        name: platformKey === 'google' || platformKey === 'microsoft' ? 'Alex Rivera' : '@futuret3ch_demo',
        email: platformKey === 'tiktok' || platformKey === 'snapchat' ? undefined : 'demo@futuret3ch.com.au',
        handle: ['tiktok', 'snapchat', 'instagram'].includes(platformKey) ? '@futuret3ch' : undefined,
      };

      const newEntry: ConnectedSocial = {
        connected: true,
        profile: demoProfile,
        linkedAt: new Date().toISOString(),
      };

      setConnectedSocials(prev => ({ ...prev, [platformKey]: newEntry }));

      const step2 = `\n2. Authorization code received (simulated redirect back to /api/oauth/callback?code=...&state=mt_xxx)\n`;
      const step3 = `3. Backend exchanges code for short-lived access_token via provider token endpoint (server-to-server, never exposed to browser).\n`;
      const step4 = `4. Backend calls provider profile API (Graph / User Info) → received ${demoProfile.name}\n`;
      const step5 = `5. MT identity service: link social ID + profile to INFINITE WALLET pubkey (or guest session) + issue MT-JWT for cross-game SSO.\n`;
      const step6 = `6. Success. Rockets, NFTs and progress now travel with this identity across all MT titles.\n\nAPI response ready — click "Test MT API Call" below.`;

      setFlowLog(log + step2 + step3 + step4 + step5 + step6);
      showActivity(`${p.label} linked to MT identity ✓`);

      // Also surface a realistic backend API call example immediately
      setLastApiResponse(JSON.stringify({
        ok: true,
        provider: platformKey,
        mt_identity: `mt_${demoProfile.id.slice(-8)}`,
        linked_wallet: walletDemo.address || 'not-connected-yet',
        session: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (MT-JWT)',
        rockets_bonus: 12,
        perks_unlocked: ['cross_game_progress', 'eco_badge'],
      }, null, 2));
    }, 1350);
  };

  const disconnectSocial = (platformKey: string) => {
    setConnectedSocials(prev => {
      const copy = { ...prev };
      delete copy[platformKey];
      return copy;
    });
    setFlowLog(prev => prev + `\n\n[Disconnected ${platformKey}] — MT identity unlinked for this session (on-chain assets remain).`);
    showActivity('Social unlinked');
  };

  // "Real" API call simulation (what your backend / frontend SDK would actually POST after OAuth)
  const testSocialApiCall = async (platformKey: string) => {
    const entry = connectedSocials[platformKey];
    if (!entry) return;

    const p = SOCIAL_PLATFORMS.find(s => s.key === platformKey)!;
    showActivity(`Calling MT backend for ${p.label}...`);

    // This is exactly the kind of call a real integration would make after the OAuth roundtrip
    const payload = {
      provider: platformKey,
      provider_user_id: entry.profile?.id,
      provider_profile: entry.profile,
      wallet_pubkey: walletDemo.address || 'GUEST_OR_LATER_LINKED',
      action: 'link_identity',
      client: 'mt-developer-sandbox',
    };

    // Simulate network + server work
    await new Promise(r => setTimeout(r, 420));

    const mockResponse = {
      success: true,
      mt_user_id: `mt_usr_${Math.random().toString(36).slice(2, 10)}`,
      linked_providers: Object.keys(connectedSocials).concat(platformKey),
      rockets_awarded: 8,
      jwt: 'mt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo.sig',
      message: 'Identity linked. Use this JWT for all subsequent /v1/game/* and /v1/wallet/* calls.',
      cross_platform: ['pet', 'soccer', 'puck', 'tap', 'racer', 'blockcraft'],
    };

    setLastApiResponse(JSON.stringify({ request: payload, response: mockResponse }, null, 2));
    setFlowLog(prev => prev + `\n\n[API] POST /v1/identity/connect  →  ${mockResponse.message}`);
    showActivity('MT API response received');
  };

  // ==================== WALLET DEEPLINK + INJECTED (from your game code) ====================
  const getProvider = (name: 'phantom' | 'solflare' | 'backpack') => {
    if (typeof window === 'undefined') return null;
    const w = window as any;
    if (name === 'phantom') return w.phantom?.solana;
    if (name === 'solflare') return w.solflare;
    if (name === 'backpack') return w.backpack?.solana || w.backpack;
    return null;
  };

  const connectWalletDemo = async (providerName: 'phantom' | 'solflare' | 'backpack') => {
    setWalletConnecting(providerName);
    setFlowLog(prev => prev + `\n\n[Wallet] Attempting ${providerName} connect (injected first, deeplink fallback)...`);

    try {
      const provider = getProvider(providerName);

      // Injected path (desktop + in-app browser on mobile) — exactly like your SolanaReels game
      if (provider) {
        const resp = await provider.connect();
        const pubkey = resp?.publicKey?.toString?.() || resp?.publicKey?.toBase58?.();
        if (!pubkey) throw new Error('No public key returned');

        const pk = new PublicKey(pubkey);
        let bal = 0;
        try {
          bal = await CONNECTION.getBalance(pk);
        } catch {}

        setWalletDemo({
          address: pubkey,
          balance: bal / LAMPORTS_PER_SOL,
          provider: providerName,
          signature: null,
        });
        setFlowLog(prev => prev + `\n✓ Connected via injected ${providerName}: ${pubkey}\n  Balance: ${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
        showActivity(`Connected ${providerName}`);
        return;
      }

      // Deeplink / universal link fallback (mobile + no injected) — this is the key point from your game
      const currentUrl = encodeURIComponent(window.location.href);
      let deeplink = '';

      if (providerName === 'phantom') {
        deeplink = `https://phantom.app/ul/browse/${currentUrl}?ref=mt-developers`;
        // Alternative deeper connect deeplink: `phantom://v1/connect?dapp_encryption_public_key=...&app_url=...`
      } else if (providerName === 'solflare') {
        deeplink = `https://solflare.com/ul/browse/${currentUrl}`;
      } else {
        deeplink = `https://backpack.app/ul/browse/${currentUrl}`;
      }

      setFlowLog(prev => prev + `\nNo injected provider detected — opening deeplink / universal link for ${providerName}...\n${deeplink}`);
      showActivity('Opening wallet app...');
      window.open(deeplink, '_blank');

      // Give user a hint to come back and try "Connect" again from inside the wallet browser
      setTimeout(() => {
        setFlowLog(prev => prev + `\nTip: After the wallet opens, choose "Connect" or "Browser" inside the app, then return here and press Connect ${providerName} again. Same pattern used in the SolanaReels game you shared.`);
      }, 900);
    } catch (e: any) {
      setFlowLog(prev => prev + `\n✗ ${providerName} connect error: ${e?.message || e}`);
      showActivity('Connect failed — see log');
    } finally {
      setWalletConnecting(null);
    }
  };

  const signForMTIdentity = async () => {
    if (!walletDemo.address) return;
    const providerName = (walletDemo.provider || 'phantom') as any;
    const provider = getProvider(providerName);
    if (!provider || !provider.signMessage) {
      setFlowLog(prev => prev + `\n[Sign] Provider does not expose signMessage or not re-connected in this tab. Re-connect and try again.`);
      return;
    }

    try {
      const message = new TextEncoder().encode(
        `Sign to link this wallet to MT-Connect identity\nWallet: ${walletDemo.address}\nTimestamp: ${Date.now()}`
      );
      const sig = await provider.signMessage(message, 'utf8');
      const sigStr = typeof sig === 'string' ? sig : (sig?.signature ? JSON.stringify(sig.signature) : 'signature-received');
      setWalletDemo(prev => ({ ...prev, signature: sigStr }));
      setFlowLog(prev => prev + `\n[Sign] Message signed successfully. Signature: ${sigStr.slice(0, 40)}...`);
      showActivity('Message signed for MT identity link');
    } catch (e: any) {
      setFlowLog(prev => prev + `\n[Sign] Failed: ${e?.message || e}`);
    }
  };

  const disconnectWalletDemo = () => {
    setWalletDemo({ address: null, balance: null, provider: null, signature: null });
    setFlowLog(prev => prev + `\n[Wallet] Disconnected demo session (on-chain state unchanged).`);
  };

  // ==================== END OF NEW FLOWS ====================

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
            <a href="https://mt.futuret3ch.com.au/" target="_blank" className="font-medium px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border border-white/30 hover:bg-white/5 text-xs sm:text-sm">Launch Infinite Wallet</a>
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

        {/* Draft description + full 1-4 breakdown exactly as requested */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.015] p-6 sm:p-8 mb-10">
          <div className="text-sm font-semibold tracking-tight mb-3">Developer Landing — Core Principle</div>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            To successfully build the MT ECO SYSTEM and support cross-platform development (Web, iOS, Android, Windows) alongside your virtual gallery experience, you need to balance Core Blockchain Infrastructure with a seamless Developer Experience (DX) Layer.
          </p>
          <p className="text-xs opacity-70">Here is the breakdown of what you need to build and document.</p>
        </div>

        {/* 1. Core Infrastructure */}
        <div className="mb-10">
          <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">1. THE CORE INFRASTRUCTURE</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-3">Backend &amp; Nodes</h2>
          <ul className="list-disc pl-5 text-sm opacity-80 space-y-1.5">
            <li>Self-hosted Solana validator / custom MT L1 nodes</li>
            <li>RPC endpoints, WebSocket feeds (live Rockets, NFT mints, bridge proofs, game states)</li>
            <li>Indexers for holders, Rockets balances, NFTs, game progress, and cross-title achievements</li>
            <li>Secure key management, program deployment pipelines, and audited upgrade authority flows</li>
            <li>Direct on-chain execution (no third-party relayers for core value transfer)</li>
          </ul>
        </div>

        {/* 2. Identity Bridge — THE NEW SOCIAL API FLOWS SECTION */}
        <div className="mb-12 border border-white/10 rounded-3xl p-6 sm:p-8 bg-zinc-950/60">
          <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-2">2. IDENTITY BRIDGE</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-2">MT-Connect (Social + Wallet SSO)</h2>
          <p className="text-sm opacity-80 mb-4">
            Wallet-native identity (INFINITE WALLET pubkey is the primary key). Optional social login (OAuth) for Facebook, Instagram, TikTok, Snapchat, Google, Microsoft.
            These are used ONLY for username association, cross-device recovery hints, ecosystem perks and single-sign-on across games — never custody of keys.
          </p>

          <div className="text-xs opacity-60 mb-3">Click any platform to start a real OAuth consent flow + simulated (but realistic) backend API exchange exactly like production MT-Connect would perform.</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {SOCIAL_PLATFORMS.map((p) => {
              const isConnected = !!connectedSocials[p.key]?.connected;
              return (
                <div key={p.key} className="border border-white/10 rounded-2xl p-4 bg-black/40 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl" style={{ color: p.color }}>{p.icon}</span>
                    <div className="font-semibold">{p.label}</div>
                  </div>
                  <div className="text-[10px] opacity-60 mb-3 leading-tight">{p.authHint}</div>

                  {!isConnected ? (
                    <button
                      onClick={() => connectSocial(p.key)}
                      className="mt-auto w-full py-2 rounded-xl bg-white text-black text-sm font-medium active:opacity-90"
                    >
                      CONNECT &amp; LINK TO MT IDENTITY
                    </button>
                  ) : (
                    <div className="mt-auto space-y-2">
                      <div className="text-xs text-emerald-400">✓ LINKED — {connectedSocials[p.key].profile?.name}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => testSocialApiCall(p.key)}
                          className="flex-1 py-1.5 rounded-xl border border-white/20 text-xs hover:bg-white/5"
                        >
                          TEST MT API CALL
                        </button>
                        <button
                          onClick={() => disconnectSocial(p.key)}
                          className="flex-1 py-1.5 rounded-xl border border-white/20 text-xs hover:bg-white/5"
                        >
                          DISCONNECT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live flow log + last API response */}
          {(flowLog || lastApiResponse) && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {flowLog && (
                <div>
                  <div className="text-xs tracking-[2px] opacity-60 mb-1">MT-CONNECT FLOW LOG (real steps + simulated backend)</div>
                  <pre className="bg-black p-3 rounded-xl text-[10px] opacity-80 overflow-auto max-h-56 whitespace-pre-wrap">{flowLog}</pre>
                </div>
              )}
              {lastApiResponse && (
                <div>
                  <div className="text-xs tracking-[2px] opacity-60 mb-1">LAST MT BACKEND API RESPONSE</div>
                  <pre className="bg-black p-3 rounded-xl text-[10px] opacity-80 overflow-auto max-h-56">{lastApiResponse}</pre>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 text-[10px] opacity-60">
            Real implementation: your backend receives the OAuth code, exchanges it server-side for tokens (never expose secrets to browser), calls the provider userinfo/Graph endpoint, then calls internal MT identity service to create or link the record. The returned MT-JWT is then used for all subsequent game and wallet API calls.
          </div>
        </div>

        {/* 3. Developer Documentation */}
        <div className="mb-10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-2">3. DEVELOPER DOCUMENTATION</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-3">Quick Start • API Reference • Guides</h2>

          <div className="space-y-6 text-sm">
            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-semibold mb-1">Quick Start</div>
              <ol className="list-decimal pl-5 space-y-1 text-xs opacity-80">
                <li>Install the MT SDK via npm: <code>npm install @mt-ecosystem/sdk</code></li>
                <li>Connect your INFINITE WALLET or any self-custodial Solana/MT wallet (see live demo below — deeplink + injected, same as the SolanaReels game).</li>
                <li>Use MT-Connect for optional social SSO (the 6 platforms above).</li>
                <li>Call SDK methods or raw program instructions for swap, bridge, harvest, mint, etc.</li>
              </ol>
            </div>

            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-semibold mb-1">API Reference (selected)</div>
              <ul className="text-xs opacity-80 space-y-0.5">
                <li>GET /v1/wallet/:pubkey — balances + Rockets + linked socials</li>
                <li>POST /v1/identity/connect — after OAuth (Facebook/IG/TikTok/Snapchat/Google/Microsoft)</li>
                <li>POST /v1/transactions — submit signed tx (self-custodial)</li>
                <li>GET /v1/games/:slug/progress — cross-game state</li>
                <li>WS /ws — live Rockets, NFT events, bridge proofs</li>
              </ul>
            </div>

            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-semibold mb-1">Integration Guides by Platform</div>
              <div className="text-xs opacity-80 grid sm:grid-cols-2 gap-x-4">
                <div>• React / Next.js — useWallet + MTClient</div>
                <div>• Unity / Unreal — native C# / C++ bindings + Solana RPC</div>
                <div>• Swift (iOS) / Kotlin (Android) — direct RPC + MT-Connect deep links</div>
                <div>• Flutter — single codebase with web3dart + custom channels</div>
              </div>
            </div>

            <div className="border border-white/10 rounded-2xl p-5">
              <div className="font-semibold mb-1">Error Handling &amp; Limits</div>
              <div className="text-xs opacity-70">Standard JSON errors with code + message. Rate limits per IP + per wallet. Devnet has relaxed limits. All critical calls are idempotent where possible.</div>
            </div>
          </div>
        </div>

        {/* 4. Implementation Priority Map */}
        <div className="mb-10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-2">4. IMPLEMENTATION PRIORITY MAP</div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="border border-white/10 rounded-2xl p-4">
              <div className="font-semibold text-emerald-400 mb-1">CRITICAL</div>
              <ul className="text-xs opacity-80 list-disc pl-4 space-y-0.5">
                <li>Core node + RPC + basic SDK</li>
                <li>SIWS (Sign-In with Solana) + MT-JWT auth</li>
                <li>Basic swap / bridge / harvest endpoints</li>
                <li>MT-Connect core (at least Google + wallet)</li>
              </ul>
            </div>
            <div className="border border-white/10 rounded-2xl p-4">
              <div className="font-semibold text-amber-400 mb-1">HIGH</div>
              <ul className="text-xs opacity-80 list-disc pl-4 space-y-0.5">
                <li>Full MT-Connect (all 6 platforms + deeplink support)</li>
                <li>Game SDK hooks (Rockets, NFTs, progress sync)</li>
                <li>Live WebSocket feeds</li>
                <li>Analytics &amp; leaderboards</li>
              </ul>
            </div>
            <div className="border border-white/10 rounded-2xl p-4">
              <div className="font-semibold text-sky-400 mb-1">MEDIUM</div>
              <ul className="text-xs opacity-80 list-disc pl-4 space-y-0.5">
                <li>NFT mint templates + studio UI</li>
                <li>Advanced routing / gasless options</li>
                <li>Unity/Unreal/Flutter example repos</li>
                <li>Public testnet faucet + explorer</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recommended Next Steps */}
        <div className="mb-10 text-sm opacity-90">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-2">RECOMMENDED NEXT STEPS</div>
          <p>1. Stand up the self-hosted RPC + indexer layer. 2. Implement MT-Connect backend (OAuth exchange + identity linking service). 3. Publish the first version of the @mt-ecosystem/sdk with wallet + MT-Connect helpers. 4. Build the live sandbox (this page) into a full interactive API explorer with real devnet calls. 5. Document every program instruction (like Raydium/Jupiter docs style — already partially included below).</p>
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

        {/* API Endpoints */}
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

        {/* Wallet Connection Example (cross-platform support) */}
        <div className="mb-10 border border-white/10 rounded-3xl p-6 sm:p-8 bg-zinc-950/60">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">Wallet Connection (Injected + Mobile Deeplink)</h2>
          <p className="text-sm opacity-80 mb-4">
            Manual provider detection for Phantom, Solflare and Backpack. Works on desktop via injected providers. On mobile it falls back to universal/deeplinks so the user can open the page inside the wallet browser and connect directly.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {(['phantom', 'solflare', 'backpack'] as const).map((prov) => (
              <button
                key={prov}
                disabled={!!walletConnecting}
                onClick={() => connectWalletDemo(prov)}
                className="px-4 py-2 rounded-2xl border border-white/20 hover:bg-white/5 text-sm disabled:opacity-50"
              >
                {walletConnecting === prov ? 'Connecting...' : `Connect ${prov[0].toUpperCase() + prov.slice(1)}`}
              </button>
            ))}
            {walletDemo.address && (
              <button onClick={disconnectWalletDemo} className="px-4 py-2 rounded-2xl border border-white/20 text-sm">Disconnect</button>
            )}
          </div>

          {walletDemo.address && (
            <div className="mb-4 p-4 rounded-2xl bg-white/[0.015] text-sm">
              <div><span className="opacity-60">Connected via:</span> {walletDemo.provider}</div>
              <div className="font-mono text-emerald-400 break-all mt-0.5">{walletDemo.address}</div>
              {walletDemo.balance !== null && <div className="text-xs opacity-70 mt-0.5">Balance: {walletDemo.balance.toFixed(4)} SOL</div>}
              <div className="mt-3 flex gap-2">
                <button onClick={signForMTIdentity} className="px-3 py-1 text-xs rounded-xl border border-white/20 hover:bg-white/5">Sign Message (Link to MT Identity)</button>
              </div>
              {walletDemo.signature && (
                <div className="mt-2 text-[10px] opacity-70 break-all">Signature: {walletDemo.signature}</div>
              )}
            </div>
          )}

          <div className="text-[10px] opacity-60">On mobile without an injected provider the buttons open a deeplink. Open the site from inside Phantom, Solflare or Backpack and the injected path will be available.</div>
        </div>

        {/* Resources & Downloads (disabled per request) */}
        <div className="mb-10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">RESOURCES &amp; DOWNLOADS</div>
          <h2 className="text-2xl font-semibold tracking-tight mb-3">SDKs, Tools &amp; Docs</h2>

          <div className="text-xs opacity-50 mb-3">
            Downloads (SDKs, mobile libs, browser extensions) are currently disabled / coming soon. Check back or contact for access.
          </div>
          <div className="text-xs opacity-50">
            All packages are open for licensed developers. Full source and more examples in the MT GitHub org (coming soon). Email Support@MemeTorrent.com for early access keys.
          </div>
        </div>

        {/* Expanded Sandbox — now includes MT-Connect + wallet flows + original endpoints */}
        <div className="mb-10 p-6 border border-white/10 rounded-3xl">
          <h3 className="font-semibold mb-2">Sandbox (Devnet + MT-Connect)</h3>
          <p className="text-xs opacity-70 mb-3">Test endpoints safely. Social OAuth flows above already exercise the real identity API pattern. These are additional mocks.</p>

          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => { setLastApiResponse('{"balance":"124567890","mint":"ELyw...pump","rockets":1240}'); showActivity('GET /v1/wallet'); }} className="px-3 py-1 text-xs border border-white/20 rounded hover:bg-white/5">GET /v1/wallet</button>
            <button onClick={() => { setLastApiResponse('{"txId":"simulated-123","status":"confirmed","rocketsEarned":18}'); showActivity('POST /v1/transactions'); }} className="px-3 py-1 text-xs border border-white/20 rounded hover:bg-white/5">POST /v1/transactions</button>
            <button onClick={() => { setLastApiResponse('{"nftId":"new-456","owner":"your-wallet","collection":"MT-PETS"}'); showActivity('POST /v1/nft/mint'); }} className="px-3 py-1 text-xs border border-white/20 rounded hover:bg-white/5">POST /v1/nft/mint</button>
            <button onClick={() => { setLastApiResponse('{"status":"ok","linked":["facebook","google"],"rockets":32}'); showActivity('POST /v1/identity/status'); }} className="px-3 py-1 text-xs border border-white/20 rounded hover:bg-white/5">POST /v1/identity/status</button>
          </div>

          {lastApiResponse && (
            <pre className="bg-black p-3 rounded-xl text-[10px] opacity-80 overflow-auto">{lastApiResponse}</pre>
          )}
          <p className="text-[10px] opacity-50 mt-2">Real Devnet + production MT-Connect endpoints coming soon. Use the whitepaper for program specs.</p>
        </div>

        {/* Full Get Started / Docs / Swap / Advanced / Guides (Jupiter + Raydium style as requested) */}
        <div className="mt-6 pt-8 border-t border-white/10">
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

            <div className="mt-6 pt-4 border-t border-white/10 text-xs opacity-80">
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

        <div className="mt-10 pt-8 border-t border-white/10 text-sm">
          <a href="/whitepaper" className="text-emerald-400 hover:underline">Read the $MT Whitepaper →</a>
          <div className="mt-2 opacity-60">Core architecture, token mechanics and integration concepts are documented there.</div>
        </div>
      </div>

      {/* Small live activity banner */}
      {activity && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-1.5 rounded-2xl bg-emerald-400 text-black text-xs shadow-xl">
          {activity}
        </div>
      )}

      <div className="border-t border-white/10 py-8 text-center text-[10px] opacity-40">
        <Link href="/" className="hover:text-white">← Back to MT ECO SYSTEM</Link>
      </div>
    </main>
  );
}
