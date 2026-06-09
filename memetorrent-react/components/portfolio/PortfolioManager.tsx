'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTokenStats, MTStatsRaw } from '@/lib/api';
import { LINKS } from '@/lib/constants';
import { Connection, Transaction } from '@solana/web3.js';

type Asset = {
  symbol: string;
  name: string;
  balance: number;
  chain: string;
  color: string;
  logo?: string;
};

type FlowType = 'bridge' | 'swap' | 'harvest' | 'report' | 'nft-designer' | 'rockets-staking' | 'multi-wallet' | 'constellation' | null;

export default function PortfolioManager() {
  const [price, setPrice] = useState(0);

  // Multi-wallet support for the switcher feature
  const [wallets, setWallets] = useState([
    { id: 'main', name: 'Primary Vault', balanceMT: 124567890, balanceSPL: 45678901, rockets: 1247, nfts: 7 },
    { id: 'trading', name: 'Trading Desk', balanceMT: 23400000, balanceSPL: 189000000, rockets: 320, nfts: 2 },
    { id: 'games', name: 'TAP Games Vault', balanceMT: 8900000, balanceSPL: 12000000, rockets: 4520, nfts: 14 },
    { id: 'nft', name: 'NFT Collector', balanceMT: 450000, balanceSPL: 3200000, rockets: 180, nfts: 31 },
  ]);
  const [currentWalletId, setCurrentWalletId] = useState('main');

  const currentWallet = wallets.find(w => w.id === currentWalletId)!;

  // Assets derived from current wallet for display
  const assets: Asset[] = [
    { symbol: 'MT', name: 'Native MT', balance: currentWallet.balanceMT, chain: 'MT (PRIMARY — OUR NETWORK)', color: '#10b981', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png' },
    { symbol: '$MT', name: 'SPL $MT', balance: currentWallet.balanceSPL, chain: 'Solana', color: '#f59e0b', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png' },
    { symbol: 'ROCKET', name: 'Rockets', balance: currentWallet.rockets, chain: 'TAP Ecosystem', color: '#8b5cf6' },
    { symbol: 'NFT', name: 'NFTs', balance: currentWallet.nfts, chain: 'MT + Solana', color: '#ec4899' },
  ];

  const [activeFlow, setActiveFlow] = useState<FlowType>(null);
  const [flowStep, setFlowStep] = useState(0);
  const [flowData, setFlowData] = useState<any>({});
  const [message, setMessage] = useState<string | null>(null);
  const [nftPreview, setNftPreview] = useState({ color: '#10b981', type: 'Rocket', accessory: 'Wings' }); // for NFT designer
  const [stakedRockets, setStakedRockets] = useState(0); // for staking preview (demo only)

  // Whitepaper flip state
  const [whitepaperFlipped, setWhitepaperFlipped] = useState(false);

  // Real direct buy states (wallet connect + Jupiter swap)
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [buySolAmount, setBuySolAmount] = useState(0.1);
  const [jupQuote, setJupQuote] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecutingSwap, setIsExecutingSwap] = useState(false);

  // Ref for the active flow panel so we can scroll it directly under the clicked flow launcher
  const panelRef = useRef<HTMLDivElement>(null);

  // Live $MT price for realistic valuation
  useEffect(() => {
    getTokenStats()
      .then((s: MTStatsRaw) => setPrice(parseFloat(s.price) || 0.000000012))
      .catch(() => setPrice(0.000000012));
  }, []);

  // When a flow is started, scroll its simulator panel into view so it appears
  // "directly under the clicked flow" instead of just at the bottom of the whole stack.
  // Works on mobile too.
  useEffect(() => {
    if (activeFlow && panelRef.current) {
      const t = setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 130);
      return () => clearTimeout(t);
    }
  }, [activeFlow]);



  const totalValue = assets.reduce((sum, a) => {
    if (a.symbol === 'MT' || a.symbol === '$MT') return sum + a.balance * price;
    if (a.symbol === 'ROCKET') return sum + a.balance * 0.008; // mock rocket value
    return sum + a.balance * 12; // mock nft floor
  }, 0);

  const nativeMT = assets.find(a => a.symbol === 'MT')!;
  const splMT = assets.find(a => a.symbol === '$MT')!;

  // Update current wallet's balances (supports multi-wallet)
  const updateCurrentWallet = (updates: Partial<typeof currentWallet>) => {
    setWallets(prev => prev.map(w =>
      w.id === currentWalletId
        ? { ...w, ...updates, balanceMT: Math.max(0, Math.floor(updates.balanceMT ?? w.balanceMT)), balanceSPL: Math.max(0, Math.floor(updates.balanceSPL ?? w.balanceSPL)), rockets: Math.max(0, Math.floor(updates.rockets ?? w.rockets)), nfts: Math.max(0, Math.floor(updates.nfts ?? w.nfts)) }
        : w
    ));
  };

  const showToast = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2400);
  };

  const MT_MINT = 'ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump';

  // === Real Wallet Connection (Phantom / Solflare / Backpack) ===
  const connectWallet = async (walletType: 'phantom' | 'solflare' | 'backpack') => {
    try {
      let provider: any = null;

      if (walletType === 'phantom') {
        provider = (window as any).phantom?.solana;
      } else if (walletType === 'solflare') {
        provider = (window as any).solflare;
      } else if (walletType === 'backpack') {
        provider = (window as any).backpack?.solana;
      }

      if (!provider) {
        showToast(`Please install the ${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet extension.`);
        return;
      }

      const resp = await provider.connect();
      const address = resp.publicKey?.toString() || resp.publicKey;

      setWalletAddress(address);
      setConnectedWallet(walletType);
      showToast(`Connected ${walletType} wallet`);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to connect wallet: ' + (err?.message || 'Unknown error'));
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setConnectedWallet(null);
    setJupQuote(null);
    showToast('Wallet disconnected');
  };

  // === Jupiter Quote for real buy ===
  const getJupiterQuote = async () => {
    if (!buySolAmount || buySolAmount <= 0) return;

    setIsLoadingQuote(true);
    try {
      const inputMint = 'So11111111111111111111111111111111111111112'; // Wrapped SOL
      const amountLamports = Math.floor(buySolAmount * 1_000_000_000);

      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${MT_MINT}&amount=${amountLamports}&slippageBps=100&onlyDirectRoutes=false`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Quote failed');

      const data = await res.json();
      setJupQuote(data);
      showToast(`Quote ready: ~${(Number(data.outAmount) / 1e6).toFixed(0)} $MT for ${buySolAmount} SOL`);
    } catch (e: any) {
      console.error(e);
      showToast('Failed to fetch quote from Jupiter. Using external link instead?');
      setJupQuote(null);
    }
    setIsLoadingQuote(false);
  };

  // === Execute real swap using connected wallet + Jupiter ===
  const executeRealBuy = async () => {
    if (!walletAddress || !jupQuote || !connectedWallet) {
      showToast('Connect a wallet and get a quote first.');
      return;
    }

    setIsExecutingSwap(true);

    try {
      // 1. Get swap transaction from Jupiter
      const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: jupQuote,
          userPublicKey: walletAddress,
          wrapAndUnwrapSol: true,
          // feeAccount can be added later for referrals if wanted
        }),
      });

      if (!swapRes.ok) {
        const err = await swapRes.text();
        throw new Error('Jupiter swap failed: ' + err);
      }

      const { swapTransaction } = await swapRes.json();

      // 2. Prepare and sign the transaction
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));

      let provider: any = null;
      if (connectedWallet === 'phantom') provider = (window as any).phantom?.solana;
      else if (connectedWallet === 'solflare') provider = (window as any).solflare;
      else if (connectedWallet === 'backpack') provider = (window as any).backpack?.solana;

      if (!provider || !provider.signTransaction) {
        throw new Error('Wallet provider not available for signing');
      }

      const signedTx = await provider.signTransaction(transaction);

      // 3. Send the transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // 4. Confirm
      await connection.confirmTransaction(signature, 'confirmed');

      showToast(`✅ Buy successful! Signature: ${signature.slice(0, 12)}... Check your wallet.`);
      setJupQuote(null); // reset quote after success

      // Optional: you can still update local demo balance for the UI to reflect
      // (kept for visual continuity)
      const estimatedMT = Number(jupQuote.outAmount) / 1_000_000;
      updateCurrentWallet({ balanceSPL: currentWallet.balanceSPL + Math.floor(estimatedMT) });

    } catch (err: any) {
      console.error('Swap error:', err);
      showToast('Swap failed: ' + (err.message || 'Please try the external Raydium link below.'));
    }

    setIsExecutingSwap(false);
  };

  // Flow handlers — real-feeling self-custodial management flows
  const startFlow = (type: FlowType) => {
    setActiveFlow(type);
    setFlowStep(0);
    setFlowData({});
  };

  const closeFlow = () => {
    setActiveFlow(null);
    setFlowStep(0);
    setFlowData({});
  };

  const completeStep = (data?: any) => {
    if (data) setFlowData({ ...flowData, ...data });

    if (activeFlow === 'bridge') {
      if (flowStep === 0) {
        setFlowStep(1);
      } else if (flowStep === 1) {
        // Execute bridge
        const amt = flowData.amount || 5000000;
        const fromNative = flowData.direction === 'native-to-spl';
        if (fromNative) {
          updateCurrentWallet({ balanceMT: currentWallet.balanceMT - amt, balanceSPL: currentWallet.balanceSPL + amt });
        } else {
          updateCurrentWallet({ balanceSPL: currentWallet.balanceSPL - amt, balanceMT: currentWallet.balanceMT + amt });
        }
        showToast(`Bridge complete • ${amt.toLocaleString()} $MT moved on-chain`);
        setTimeout(() => closeFlow(), 1200);
      }
    }

    if (activeFlow === 'harvest') {
      const earned = flowData.earned || 180 + Math.floor(Math.random() * 120);
      updateCurrentWallet({ rockets: currentWallet.rockets + earned });
      showToast(`+${earned} Rockets harvested from TAP • auto to wallet`);
      setTimeout(() => closeFlow(), 900);
    }

    if (activeFlow === 'swap') {
      showToast('Swap routed via Jupiter • keys signed locally. (Demo complete)');
      setTimeout(() => closeFlow(), 1100);
    }

    if (activeFlow === 'report') {
      const report = `MT-ECO-VERIFIED-${Date.now().toString(36).toUpperCase()}`;
      showToast(`On-chain report ${report} generated — includes native MT tx proofs from our core node`);
      setTimeout(() => closeFlow(), 1600);
    }

    // New: NFT designer - "mint" the previewed design
    if (activeFlow === 'nft-designer') {
      updateCurrentWallet({ nfts: currentWallet.nfts + 1 });
      showToast(`Minted new ${nftPreview.type} NFT (${nftPreview.color} with ${nftPreview.accessory}) — added to current vault`);
      setTimeout(() => closeFlow(), 900);
    }

    // New: Rockets staking preview
    if (activeFlow === 'rockets-staking') {
      const stakeAmt = flowData.stakeAmt || 200;
      const duration = flowData.duration || 30;
      if (currentWallet.rockets >= stakeAmt) {
        setStakedRockets(prev => prev + stakeAmt);
        updateCurrentWallet({ rockets: currentWallet.rockets - stakeAmt });
        showToast(`Staked ${stakeAmt} Rockets for ${duration} days • Projected +${Math.floor(stakeAmt * 0.015 * (duration/30))} extra Rockets (demo APY)`);
      } else {
        showToast('Not enough Rockets to stake');
      }
      setTimeout(() => closeFlow(), 1100);
    }

    // New: Multi-wallet switcher - just a confirmation since switching is instant via cards
    if (activeFlow === 'multi-wallet') {
      showToast('Wallet switched. All balances, NFTs, and flows now reflect the selected vault.');
      setTimeout(() => closeFlow(), 600);
    }

    // Constellation is visual, no "complete" needed but can close
    if (activeFlow === 'constellation') {
      setTimeout(() => closeFlow(), 400);
    }

  };

  const flows = [
    {
      key: 'bridge' as const,
      title: 'Cross-Chain Bridge',
      desc: 'Native MT ↔ Solana SPL. Burn + proof. Self-verified. No third parties.',
      icon: '🔗',
    },

    {
      key: 'harvest' as const,
      title: 'Harvest TAP Earnings',
      desc: 'Play Cosmic Dash or Neon Salvage → Rockets land directly in your vault.',
      icon: '🚀',
    },
    {
      key: 'swap' as const,
      title: 'In-Wallet Swap',
      desc: 'Jupiter powered routing available. Your keys sign locally. Full control.',
      icon: '↔',
    },
    {
      key: 'report' as const,
      title: 'On-Chain Reports',
      desc: 'On-chain verified reports. Native + SPL + Rockets + NFTs with proofs.',
      icon: '📊',
    },
    {
      key: 'nft-designer' as const,
      title: 'NFT Designer',
      desc: 'Design custom MT Companions / Rockets NFTs live. Pick traits, preview, mint directly to vault.',
      icon: '🎨',
    },
    {
      key: 'rockets-staking' as const,
      title: 'Rockets Staking Preview',
      desc: 'Stake Rockets for boosted TAP yields. Real utility management flow (demo APY & projections).',
      icon: '📈',
    },
    {
      key: 'multi-wallet' as const,
      title: 'Multi-Wallet Switcher',
      desc: 'Switch between vaults (Primary, Trading, Games, NFT). See isolated balances — strict separation.',
      icon: '👛',
    },
    {
      key: 'constellation' as const,
      title: 'Ecosystem Constellation',
      desc: 'Interactive visual map of the entire MT-ECO SYSTEM — nodes for wallet, core, TAP, bridges & more.',
      icon: '✨',
    },
  ];

  return (
    <section id="management" className="py-20 border-t border-white/10 bg-black/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs tracking-[3px] text-emerald-400 mb-2">MANAGEMENT, NOT JUST TRACKING</div>
            <div className="text-4xl md:text-5xl font-semibold tracking-[-1.6px]">Infinite Portfolio.<br />Real flows. Real ownership.</div>
            <p className="mt-3 max-w-xl text-lg opacity-70">
              Real command-center flows that actually move your assets, earn utility, and prove everything on-chain — all inside INFINITE WALLET.
            </p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs opacity-60">LIVE DEMO • SELF-CUSTODIAL</div>
            <div className="text-emerald-400 font-mono text-sm mt-1">No seed ever leaves your device</div>
          </div>
        </div>

        {/* Live summary bar */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.015] p-6 mb-8">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-60">Unified Value</div>
              <div className="text-4xl font-semibold tabular-nums tracking-tight">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="text-sm opacity-70">
              {nativeMT.balance.toLocaleString()} Native MT (PRIMARY)<br />
              + {splMT.balance.toLocaleString()} SPL • {assets.find(a => a.symbol === 'ROCKET')!.balance} Rockets • {assets.find(a => a.symbol === 'NFT')!.balance} NFTs
            </div>
            <div className="flex-1" />
            <button
              onClick={() => {
                // Switch to a "top holder" style wallet (multi-wallet demo)
                setCurrentWalletId('main');
                updateCurrentWallet({ balanceMT: 215818000, balanceSPL: 89000000, rockets: 2840, nfts: 19 });
                showToast('Switched to Top Holder sample vault. All flows work on it.');
              }}
              className="px-5 py-2 rounded-xl border border-white/20 text-sm hover:bg-white/5 active:bg-white/10"
            >
              Load Top Holder Sample
            </button>
            <button
              onClick={() => {
                const newBal = currentWallet.balanceMT + 25000000;
                updateCurrentWallet({ balanceMT: newBal });
                showToast('Received 25M Native MT from faucet (demo)');
              }}
              className="px-5 py-2 rounded-xl border border-emerald-400/40 text-sm text-emerald-400 hover:bg-emerald-400/5"
            >
              + Receive Native MT
            </button>
          </div>
        </div>

        {/* Multi-wallet switcher — cool feature: strict isolation like real accounts */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[3px] opacity-60 mb-2">MULTI-WALLET SWITCHER (STRICT ISOLATION)</div>
          <div className="flex flex-wrap gap-3">
            {wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setCurrentWalletId(w.id);
                  setStakedRockets(0); // reset demo stake per wallet
                  showToast(`Switched to ${w.name}`);
                }}
                className={`px-4 py-2 rounded-2xl border text-sm transition ${currentWalletId === w.id ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' : 'border-white/15 hover:bg-white/5'}`}
              >
                {w.name} <span className="opacity-50 text-xs">({w.rockets + stakedRockets} R)</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] mt-1 opacity-50">Each vault is completely isolated (no cross-account leakage). Matches real INFINITE WALLET behavior.</div>
        </div>

        {/* Asset breakdown — clean management view */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {assets.map((asset, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              className="rounded-3xl border border-white/10 bg-white/[0.015] p-6 flex flex-col"
            >
              <div className="flex items-center gap-3">
                {asset.logo ? (
                  <img src={asset.logo} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full" style={{ background: asset.color }} />
                )}
                <div>
                  <div className="font-semibold tracking-tight">{asset.name}</div>
                  <div className="text-[10px] opacity-60">{asset.chain}</div>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <div className="font-mono text-3xl tracking-[-1.2px] tabular-nums">
                  {asset.balance.toLocaleString()}
                </div>
                <div className="text-xs opacity-60 mt-1">
                  {asset.symbol === 'MT' || asset.symbol === '$MT'
                    ? `$${(asset.balance * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : asset.symbol === 'ROCKET' ? `$${(asset.balance * 0.008).toFixed(0)} est.` : 'Collectibles'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Constellation visual of the ecosystem — cool interactive feature */}
        <div className="mb-10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-2">THE MT-ECO SYSTEM CONSTELLATION</div>
          <div className="text-2xl font-semibold tracking-tight mb-4">Everything connected. Tap a node.</div>

          <div className="relative h-[240px] sm:h-[220px] rounded-3xl border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center">
            <svg width="100%" height="100%" className="absolute inset-0" viewBox="0 0 800 220">
              {/* Connections (lines between nodes) */}
              <g stroke="#10b981" strokeOpacity="0.25" strokeWidth="1">
                <line x1="120" y1="110" x2="260" y2="70" />
                <line x1="260" y1="70" x2="400" y2="110" />
                <line x1="400" y1="110" x2="540" y2="55" />
                <line x1="400" y1="110" x2="540" y2="165" />
                <line x1="540" y1="55" x2="680" y2="110" />
                <line x1="540" y1="165" x2="680" y2="110" />
                <line x1="260" y1="70" x2="400" y2="170" />
                <line x1="120" y1="110" x2="400" y2="170" />
              </g>

              {/* Nodes - clickable via foreignObject or overlay buttons for simplicity */}
            </svg>

            {/* Animated nodes using motion.div positioned absolutely */}
            {[
              { id: 'core', label: 'MT Core\n(self-hosted)', x: '15%', y: '50%', delay: 0 },
              { id: 'wallet', label: 'INFINITE\nWALLET', x: '32%', y: '32%', delay: 0.2 },
              { id: 'token', label: '$MT +\nNative', x: '50%', y: '50%', delay: 0.4 },
              { id: 'tap', label: 'TAP\nShop/Match', x: '67%', y: '25%', delay: 0.1 },
              { id: 'games', label: 'Games &\nNFTs', x: '67%', y: '75%', delay: 0.3 },
              { id: 'bridges', label: '100+ Chain\nBridges', x: '85%', y: '50%', delay: 0.5 },
            ].map((node, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.15, transition: { duration: 0.1 } }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.5 + idx * 0.3, repeat: Infinity, ease: 'easeInOut', delay: node.delay }}
                onClick={() => {
                  showToast(`${node.label.replace('\n', ' ')} — ${node.id === 'core' ? 'Our self-hosted node powering everything' : node.id === 'wallet' ? 'The gateway to all flows' : 'Connected in the constellation'}`);
                  // Bonus: clicking can "select" in a real version
                }}
                className="absolute cursor-pointer text-center px-3 py-1 rounded-full bg-white/5 border border-emerald-400/30 text-xs font-mono tracking-tight leading-tight"
                style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
              >
                {node.label.split('\n').map((l, i) => <div key={i}>{l}</div>)}
              </motion.div>
            ))}

            <div className="absolute bottom-3 right-3 text-[10px] opacity-40">Tap nodes • Self-built universe • Infinite connections</div>
          </div>
        </div>

        {/* Tokenomics — restored full from old site https://memetorrent.futuret3ch.com.au/token.html */}
        <div id="tokenomics" className="mb-10">
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-2">TOKENOMICS $MT</div>
          <div className="text-3xl font-semibold tracking-tight mb-4">1,000,000,000 TOTAL SUPPLY</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: '🚀', pct: '18%', label: 'PRESALE', amt: '180 Million Tokens', note: '🎯' },
              { icon: '💰', pct: '10%', label: 'LIQUIDITY', amt: '100 Million Tokens', note: 'Released over 12 Months' },
              { icon: '💎', pct: '20%', label: 'STAKING', amt: '200 Million Tokens', note: 'Vested Over 2 Years' },
              { icon: '⛏️', pct: '45%', label: 'MINING', amt: '450 Million Tokens', note: '🎮 Interact to Earn' },
              { icon: '🎁', pct: '4%', label: 'AIRDROPS', amt: '40 Million Tokens', note: '🌐' },
              { icon: '🛠️', pct: '2.5%', label: 'DEVELOPMENT', amt: '25 Million Tokens', note: 'Released Over 2 Years' },
              { icon: '👥', pct: '0.5%', label: 'TEAM', amt: '5 Million Tokens', note: '⏳ Locked for 5 Years' },
            ].map((a, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.015] p-4 flex gap-3 items-start">
                <div className="text-2xl mt-0.5">{a.icon}</div>
                <div className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-emerald-400 text-lg">{a.pct}</span>
                    <span className="font-semibold tracking-tight">{a.label}</span>
                  </div>
                  <div className="mt-0.5">{a.amt}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{a.note}</div>
                </div>
              </div>
            ))}
          </div>
          <a href={LINKS.whitepaper || 'https://memetorrent.futuret3ch.com.au/whitepaper.pdf'} target="_blank" className="inline-block mt-3 text-xs text-emerald-400 hover:underline">📄 READ $MT WHITEPAPER</a>
        </div>

        {/* The good stuff: actual management flows */}
        <div>
          <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">ONE-PLACE MANAGEMENT FLOWS</div>
          <div className="text-2xl font-semibold tracking-tight mb-6">Command-center actions. Real ownership.</div>

          {/* Interactive flip whitepaper - flip the card to view the PDF */}
          <div className="mb-8">
            <div className="uppercase text-xs tracking-[3px] opacity-60 mb-2">WHITEPAPER</div>
            <div 
              className="relative w-full max-w-md mx-auto h-72 cursor-pointer" 
              style={{ perspective: '1000px' }}
              onClick={() => setWhitepaperFlipped(!whitepaperFlipped)}
            >
              <div 
                className="relative w-full h-full transition-transform duration-700" 
                style={{ 
                  transformStyle: 'preserve-3d', 
                  transform: whitepaperFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
                }}
              >
                {/* Front - Cover */}
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-black border border-white/20 rounded-3xl flex flex-col items-center justify-center p-6 text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="text-4xl mb-3">📖</div>
                  <div className="text-xl font-semibold tracking-tight">MT ECO SYSTEM</div>
                  <div className="text-lg">WHITEPAPER</div>
                  <div className="mt-3 text-xs opacity-70">Click to flip and read</div>
                </div>

                {/* Back - PDF Viewer */}
                <div 
                  className="absolute inset-0 bg-black border border-white/20 rounded-3xl overflow-hidden"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <iframe 
                    src="https://memetorrent.futuret3ch.com.au/whitepaper.pdf" 
                    className="w-full h-full" 
                    title="MT Whitepaper"
                  />
                  <div className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1.5 py-0.5 rounded">
                    <a href="https://memetorrent.futuret3ch.com.au/whitepaper.pdf" target="_blank" className="underline">Open full</a>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center text-[10px] opacity-50 mt-1">Tap to flip the whitepaper</div>
          </div>

          {/* Direct $MT purchase section - triggered by top BUY $MT NOW */}
          <div id="direct-buy" className="mb-8 p-6 rounded-3xl border border-emerald-400/30 bg-emerald-400/5">
            {/* THE WALLET IS THE GATEWAY placed just above the buy form */}
            <div className="mb-4 text-center">
              <div className="text-emerald-400 text-xs tracking-[4px]">THE WALLET IS THE GATEWAY</div>
              <div className="text-xl font-semibold tracking-tight mt-1">INFINITE WALLET<br />For infinite possibilities.<br />Truly ours.</div>
            </div>

            {/* Wallet Connection - clean form */}
            {!walletAddress ? (
              <div>
                <div className="text-sm font-medium mb-3">Connect your wallet to buy</div>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => connectWallet('phantom')} 
                    className="px-5 py-2.5 rounded-2xl border border-white/20 hover:bg-white/5 flex items-center gap-2"
                  >
                    👻 Phantom
                  </button>
                  <button 
                    onClick={() => connectWallet('solflare')} 
                    className="px-5 py-2.5 rounded-2xl border border-white/20 hover:bg-white/5 flex items-center gap-2"
                  >
                    ☀️ Solflare
                  </button>
                  <button 
                    onClick={() => connectWallet('backpack')} 
                    className="px-5 py-2.5 rounded-2xl border border-white/20 hover:bg-white/5 flex items-center gap-2"
                  >
                    🎒 Backpack
                  </button>
                </div>
                <div className="text-[10px] mt-2 opacity-60">Works best on desktop or when this page is opened inside your wallet app's browser on mobile.</div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-emerald-400/30 bg-black/40 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs opacity-60">Connected</div>
                    <div className="font-mono text-sm">{connectedWallet} • {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</div>
                  </div>
                  <button onClick={disconnectWallet} className="text-xs px-3 py-1 border border-white/20 rounded-xl hover:bg-white/5">Disconnect</button>
                </div>
              </div>
            )}

            {/* Buy Controls */}
            {walletAddress && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs opacity-60 mb-1">Amount to spend (SOL)</div>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="10" 
                    step="0.01" 
                    value={buySolAmount} 
                    onChange={(e) => { setBuySolAmount(parseFloat(e.target.value)); setJupQuote(null); }} 
                    className="w-full accent-emerald-400" 
                  />
                  <div className="font-mono text-lg mt-1">{buySolAmount} SOL</div>
                </div>

                <button 
                  onClick={getJupiterQuote} 
                  disabled={isLoadingQuote}
                  className="w-full py-3 rounded-2xl border border-white/20 hover:bg-white/5 disabled:opacity-50"
                >
                  {isLoadingQuote ? 'Getting best price from Jupiter...' : 'Get Quote (Jupiter)'}
                </button>

                {jupQuote && (
                  <div className="p-4 bg-black/40 rounded-2xl text-sm">
                    You will receive approximately <span className="font-mono text-emerald-400">{(Number(jupQuote.outAmount) / 1_000_000).toFixed(0)} $MT</span><br />
                    <span className="text-[10px] opacity-60">Price impact &amp; fees included • Slippage 1%</span>
                  </div>
                )}

                <button 
                  onClick={executeRealBuy} 
                  disabled={!jupQuote || isExecutingSwap}
                  className="w-full py-4 rounded-2xl bg-emerald-400 text-black font-semibold tracking-wider disabled:opacity-40"
                >
                  {isExecutingSwap ? 'Signing &amp; Sending Swap...' : `BUY $MT WITH ${connectedWallet?.toUpperCase() || 'WALLET'} (REAL ON-CHAIN)`}
                </button>

                <div className="text-center text-xs">
                  <a 
                    href={`https://raydium.io/swap/?inputMint=sol&outputMint=${MT_MINT}`} 
                    target="_blank" 
                    className="text-emerald-400 hover:underline"
                  >
                    Or buy on Raydium instead →
                  </a>
                </div>
              </div>
            )}

            {/* Fallback always available */}
            <div className="text-[10px] opacity-50 text-center pt-3 mt-3 border-t border-white/10">
              Prefer to buy outside? <a href={`https://raydium.io/swap/?inputMint=sol&outputMint=${MT_MINT}`} target="_blank" className="underline">Open Raydium Swap</a>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {flows.map((f) => {
              const isActive = activeFlow === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => startFlow(f.key)}
                  className={`group text-left rounded-3xl border bg-white/[0.015] p-6 hover:border-emerald-400/40 hover:bg-white/[0.025] transition-all active:scale-[0.985] ${isActive ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/10'}`}
                >
                  <div className="text-2xl mb-4">{f.icon}</div>
                  <div className="font-semibold tracking-tight text-lg mb-1.5 group-hover:text-emerald-400 transition">{f.title}</div>
                  <p className="text-sm opacity-70 leading-relaxed">{f.desc}</p>
                  <div className={`mt-4 text-[10px] tracking-widest ${isActive ? 'text-emerald-400' : 'text-emerald-400/70 group-hover:text-emerald-400'}`}>
                    {isActive ? 'DETAILS BELOW ↓' : 'RUN FLOW →'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active flow simulator — real management flows */}
          <AnimatePresence>
            {activeFlow && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 rounded-3xl border border-white/10 bg-zinc-950/70 p-8 overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-emerald-400 text-xs tracking-[2px]">LIVE FLOW SIMULATOR</div>
                    <div className="text-2xl font-semibold tracking-tight mt-1">
                      {flows.find(f => f.key === activeFlow)?.title}
                    </div>
                  </div>
                  <button onClick={closeFlow} className="text-xs opacity-60 hover:opacity-100">CLOSE</button>
                </div>

                {/* Bridge flow */}
                {activeFlow === 'bridge' && (
                  <div className="mt-6 space-y-6">
                    <div className="flex gap-4">
                      <button onClick={() => setFlowData({ direction: 'native-to-spl' })} className={`flex-1 rounded-2xl p-4 border ${flowData.direction === 'native-to-spl' ? 'border-emerald-400 bg-emerald-400/5' : 'border-white/10'}`}>
                        Native MT → SPL $MT
                      </button>
                      <button onClick={() => setFlowData({ direction: 'spl-to-native' })} className={`flex-1 rounded-2xl p-4 border ${flowData.direction === 'spl-to-native' ? 'border-emerald-400 bg-emerald-400/5' : 'border-white/10'}`}>
                        SPL $MT → Native MT
                      </button>
                    </div>

                    <div>
                      <div className="text-xs opacity-60 mb-2">AMOUNT (smallest units)</div>
                      <input
                        type="range"
                        min="1000000"
                        max={flowData.direction === 'native-to-spl' ? nativeMT.balance : splMT.balance}
                        step="1000000"
                        value={flowData.amount || 5000000}
                        onChange={(e) => setFlowData({ ...flowData, amount: parseInt(e.target.value) })}
                        className="w-full accent-emerald-400"
                      />
                      <div className="font-mono text-xl mt-2 tabular-nums">{(flowData.amount || 5000000).toLocaleString()}</div>
                    </div>

                    <button
                      onClick={() => completeStep({ amount: flowData.amount || 5000000 })}
                      disabled={!flowData.direction}
                      className="w-full py-4 rounded-2xl bg-white text-black font-semibold tracking-wider disabled:opacity-40"
                    >
                      SIGN &amp; EXECUTE BRIDGE (local keys • demo)
                    </button>
                    <div className="text-[10px] opacity-50 text-center">Real version uses our mt-core burn + verifier. No Wormhole. Your seed never touches a server.</div>
                  </div>
                )}

                {/* Harvest flow */}
                {activeFlow === 'harvest' && (
                  <div className="mt-6">
                    <div className="mb-4">Choose TAP experience</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {['Cosmic Dash (Rockets)', 'Neon Salvage', 'MT Companions (NFT boost)'].map((g, i) => (
                        <button key={i} onClick={() => completeStep({ earned: 140 + i * 60 + Math.floor(Math.random() * 80) })} className="rounded-2xl border border-white/10 p-4 text-left hover:bg-white/5">
                          {g}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs mt-4 opacity-60">Rockets are auto-deposited to your INFINITE WALLET vault. Real utility across the ecosystem.</div>
                  </div>
                )}

                {/* Swap flow (lighter) */}
                {activeFlow === 'swap' && (
                  <div className="mt-6 space-y-4">
                    <p className="opacity-80">Swap any supported asset inside the wallet using Jupiter routing. You sign. We never see keys.</p>
                    <button onClick={() => completeStep()} className="mt-2 w-full py-4 rounded-2xl bg-emerald-400 text-black font-semibold">EXECUTE DEMO SWAP • SIGN LOCALLY</button>
                  </div>
                )}

                {/* Report flow — the "better" part */}
                {activeFlow === 'report' && (
                  <div className="mt-6">
                    <p className="opacity-80 mb-4">Generate a cryptographically verifiable report that includes Native MT transactions (from our node), SPL activity, Rockets earnings, and NFT provenance. All on-chain proofs included.</p>
                    <button onClick={() => completeStep()} className="w-full py-4 rounded-2xl border border-white/30 font-medium">GENERATE ON-CHAIN VERIFIED REPORT</button>
                    <div className="text-[10px] mt-3 opacity-50">Includes merkle-style proofs from mt-core. Exportable. Future: direct tax filing connectors.</div>
                  </div>
                )}

                {/* NEW: NFT Designer */}
                {activeFlow === 'nft-designer' && (
                  <div className="mt-6">
                    <div className="mb-4 text-sm opacity-80">Live NFT designer for MT Companions / Cosmic Rockets. Changes update the preview instantly.</div>

                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      {/* Live preview */}
                      <div className="w-48 h-48 rounded-3xl border border-white/10 flex items-center justify-center text-6xl relative overflow-hidden" style={{ background: nftPreview.color + '22' }}>
                        <div style={{ color: nftPreview.color }} className="text-[120px] drop-shadow">🚀</div>
                        <div className="absolute text-xs tracking-widest opacity-70 bottom-4">{nftPreview.type} • {nftPreview.accessory}</div>
                      </div>

                      {/* Controls */}
                      <div className="space-y-4 flex-1">
                        <div>
                          <div className="text-xs opacity-60 mb-1">COLOR / THEME</div>
                          <div className="flex gap-2">
                            {['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'].map(c => (
                              <button key={c} onClick={() => setNftPreview(p => ({...p, color: c}))} className="w-8 h-8 rounded-full border border-white/20" style={{background: c}} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs opacity-60 mb-1">TYPE</div>
                          <div className="flex gap-2 flex-wrap">
                            {['Rocket', 'Companion', 'Starship', 'Artifact'].map(t => (
                              <button key={t} onClick={() => setNftPreview(p => ({...p, type: t}))} className={`px-3 py-1 rounded-xl border text-sm ${nftPreview.type === t ? 'border-emerald-400' : 'border-white/10'}`}>{t}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs opacity-60 mb-1">ACCESSORY</div>
                          <div className="flex gap-2 flex-wrap">
                            {['Wings', 'Crown', 'Shield', 'Laser', 'Jetpack'].map(a => (
                              <button key={a} onClick={() => setNftPreview(p => ({...p, accessory: a}))} className={`px-3 py-1 rounded-xl border text-sm ${nftPreview.accessory === a ? 'border-emerald-400' : 'border-white/10'}`}>{a}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => completeStep()} className="mt-6 w-full py-4 rounded-2xl bg-white text-black font-semibold tracking-wider">MINT THIS DESIGN TO CURRENT WALLET (demo)</button>
                    <div className="text-[10px] text-center mt-2 opacity-50">Real mint uses INFINITE WALLET + our native NFT layer at 1¢ fees. Design saved on-chain forever.</div>
                  </div>
                )}

                {/* NEW: Rockets Staking Preview */}
                {activeFlow === 'rockets-staking' && (
                  <div className="mt-6 space-y-5">
                    <div>Stake Rockets to boost future TAP earnings and NFT rewards.</div>
                    <div>
                      <div className="flex justify-between text-xs mb-1 opacity-60"><span>Amount to stake</span><span>{flowData.stakeAmt || 200} Rockets</span></div>
                      <input type="range" min="50" max={Math.min(3000, currentWallet.rockets)} step="10" value={flowData.stakeAmt || 200} onChange={e => setFlowData({...flowData, stakeAmt: parseInt(e.target.value)})} className="w-full accent-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs opacity-60 mb-1">Lock duration (days)</div>
                      <div className="flex gap-2">
                        {[7, 30, 90, 180].map(d => <button key={d} onClick={() => setFlowData({...flowData, duration: d})} className={`px-4 py-1 rounded-xl border text-sm ${ (flowData.duration||30) === d ? 'border-emerald-400' : 'border-white/10'}`}>{d}d</button>)}
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl text-sm">
                      Projected yield: +{Math.floor( (flowData.stakeAmt||200) * 0.015 * ((flowData.duration||30)/30) )} Rockets<br />
                      <span className="text-xs opacity-60">15% APY (demo) • Auto-compounds in TAP games • Unstake anytime</span>
                    </div>
                    <button onClick={() => completeStep({ stakeAmt: flowData.stakeAmt || 200, duration: flowData.duration || 30 })} className="w-full py-4 rounded-2xl bg-emerald-400 text-black font-semibold">STAKE ROCKETS (preview — affects demo balance)</button>
                  </div>
                )}

                {/* NEW: Multi-wallet switcher (enhanced in flow) */}
                {activeFlow === 'multi-wallet' && (
                  <div className="mt-6">
                    <p className="opacity-80 mb-4">All wallets are strictly isolated (Jason's vaults never visible to other accounts). Click any to switch the entire management view.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {wallets.map(w => (
                        <button key={w.id} onClick={() => { setCurrentWalletId(w.id); completeStep(); }} className="text-left p-4 rounded-2xl border border-white/10 hover:border-emerald-400/50">
                          <div className="font-semibold">{w.name}</div>
                          <div className="text-xs opacity-70 mt-1">{w.balanceMT.toLocaleString()} MT • {w.rockets} R • {w.nfts} NFTs</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* NEW: Constellation (opens enhanced view) */}
                {activeFlow === 'constellation' && (
                  <div className="mt-6 text-center">
                    <p className="opacity-80 mb-4">The full self-built constellation. Every node is connected without third parties.</p>
                    <div className="inline-block text-6xl mb-3">✨ 🌌 🔗</div>
                    <p className="text-sm">MT Core • INFINITE WALLET • TAP (Shop • Match • Transport • Studio) • 100+ Bridges • Native NFTs • Rockets Economy • Safety Layer</p>
                    <button onClick={() => completeStep()} className="mt-4 px-8 py-3 rounded-2xl border border-white/30">CLOSE VISUAL</button>
                  </div>
                )}


              </motion.div>
            )}
          </AnimatePresence>

          {/* Utility items now displayed statically under the ONE-PLACE MANAGEMENT FLOWS (not as individual flow cards) */}
          <div id="utilities" className="mt-10 pt-8 border-t border-white/10">
            <div className="uppercase text-xs tracking-[3px] opacity-60 mb-3">CORE UTILITIES POWERED BY $MT</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {[
                { icon: '🔑', title: 'Token Exclusivity', desc: '$MT is the universal key. Every feature, game, marketplace, login & identity runs with $MT.' },
                { icon: '⛏️', title: 'P2E Mining', desc: 'Earn real $MT by gaming, raiding socials, or completing MemeTorrent missions.' },
                { icon: '🖼️', title: 'NFT Digital Identity', desc: 'Burn $MT → Mint your 1/1 NFT identity. Required for premium areas & exclusive utilities.' },
                { icon: '🛒', title: 'Physical / Digital Store', desc: 'Buy hardware, software, tech services, AI tools, dev work — ONLY with $MT.' },
                { icon: '⛓️', title: 'MT-CHAIN (Soon)', desc: 'Our blockchain is coming. Validators, nodes, staking, governance, gas-less features.' },
                { icon: '📦', title: 'Weekly Drops', desc: 'New utilities roll out constantly. New apps, bots, tools, games and protocols.' },
                { icon: '🛡️', title: 'Safety & Security', desc: 'Anti-rug tech, secure ecosystem, wallet protection, community guardians.' },
                { icon: '🚀', title: 'Launchpad Access', desc: 'Exclusive early access to future tokens, NFTs, dApps & partner projects.' },
                { icon: '🏦', title: 'Vault & Rewards', desc: 'Lock $MT → earn yield, XP, badges, NFT rank-ups & weekly reward distributions.' },
              ].map((u, i) => (
                <div key={i} className="group rounded-2xl border border-white/10 bg-white/[0.015] p-4 hover:border-emerald-400/30 transition flex gap-3">
                  <div className="text-2xl mt-0.5 group-hover:scale-110 transition">{u.icon}</div>
                  <div>
                    <div className="font-semibold tracking-tight">{u.title}</div>
                    <p className="text-xs opacity-70 leading-snug mt-1">{u.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] mt-3 opacity-50">These utilities are unlocked and managed through the flows above — all inside your self-custodial INFINITE WALLET.</div>
          </div>
        </div>

        {/* Promote specialty wallets: Couples & Business (first-class in INFINITE WALLET) */}
        <div className="mt-10 pt-8 border-t border-white/10">
          <div className="text-xs uppercase tracking-[3px] opacity-60 mb-2">SPECIALTY WALLETS</div>
          <div className="text-2xl font-semibold tracking-tight mb-2">Built for life &amp; business.</div>
          <p className="text-sm opacity-70 max-w-xl mb-6">The first Couples Wallet for shared secure access + Business Vaults with team flows, reporting, and branded management. All powered by the same self-custodial INFINITE WALLET — create in one click, backed up encrypted to your account.</p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-purple-400/30 bg-white/[0.01] p-6">
              <div className="text-purple-400 text-xs tracking-widest">FOR COUPLES</div>
              <div className="font-semibold text-xl mt-1">Our Couples Wallet</div>
              <p className="text-sm opacity-70 mt-2">Shared vault with dual control options, joint Rockets earnings, private NFTs, and seamless handoff. The first dedicated couples product in self-custody.</p>
              <a href="https://wallet.futuret3ch.com.au/" target="_blank" className="mt-4 inline-block text-sm text-purple-400 hover:underline">Create in INFINITE WALLET →</a>
            </div>
            <div className="rounded-3xl border border-blue-400/30 bg-white/[0.01] p-6">
              <div className="text-blue-400 text-xs tracking-widest">FOR BUSINESSES</div>
              <div className="font-semibold text-xl mt-1">Business Vault</div>
              <p className="text-sm opacity-70 mt-2">Team-managed with role-based views, on-chain audit reports, bulk bridges/swaps, and dedicated support flows. Enterprise-ready self-custody.</p>
              <a href="https://wallet.futuret3ch.com.au/" target="_blank" className="mt-4 inline-block text-sm text-blue-400 hover:underline">Create in INFINITE WALLET →</a>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="https://wallet.futuret3ch.com.au/" target="_blank" className="inline-block text-sm px-8 py-3 rounded-2xl border border-white/30 hover:bg-white/5">LAUNCH INFINITE WALLET TO RUN THESE FLOWS FOR REAL →</a>
          <div className="text-[10px] mt-3 opacity-50">All balances, NFTs, and Rockets live forever in your self-custodial vault. No third parties. Infinite possibilities.</div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-400 text-black px-6 py-2 rounded-2xl text-sm font-medium shadow-xl z-50">
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
