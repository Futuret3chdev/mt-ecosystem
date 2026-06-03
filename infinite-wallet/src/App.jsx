import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Unlock, Copy, Check, ArrowUpRight, ArrowDownLeft, QrCode, Send, Download,
  Image, Zap, RefreshCw, Settings, Shield, ExternalLink, Plus, X, Eye, EyeOff
} from 'lucide-react';
import QRCode from 'qrcode';

import {
  generateMTWallet,
  importMTWalletFromMnemonic,
  unlockVault,
  saveVault,
  hasVault,
  deleteVault,
  fetchMTBalance,
  fetchMTNFTs,
  fetchMTTxs,
  sendMT,
  signMTTx,
  submitMTTx,
  requestTestFunds,
  MT_TX_FEE,
  MT_NODE,
  fetchSolanaMTBalance,
  fetchSolanaSOLBalance,
  deriveSolanaKeypairFromSeed,
} from './lib/mt-wallet';

const TABS = [
  { id: 'portfolio', label: 'Portfolio', icon: Zap },
  { id: 'send-receive', label: 'Send / Receive', icon: Send },
  { id: 'nfts', label: 'NFTs', icon: Image },
  { id: 'rockets', label: 'Rockets', icon: Zap },
  { id: 'activity', label: 'Activity', icon: RefreshCw },
  { id: 'bridge', label: 'Bridge', icon: ExternalLink },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MTWalletApp() {
  // Vault / Auth state (100% local, no third party)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [wallet, setWallet] = useState(null); // { mnemonic, publicKey, secretKey, solanaSeed }
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [seedRevealed, setSeedRevealed] = useState(false);

  // App state
  const [activeTab, setActiveTab] = useState('portfolio');
  const [status, setStatus] = useState('MT Wallet ready • Self-custodial • Ultra-low fees');
  const [copied, setCopied] = useState('');

  // Balances
  const [mtBalance, setMtBalance] = useState(0);
  const [mtNonce, setMtNonce] = useState(0);
  const [solMTBalance, setSolMTBalance] = useState(0);
  const [solSOLBalance, setSolSOLBalance] = useState(0);
  const [nfts, setNfts] = useState([]);
  const [txs, setTxs] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Send form
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending] = useState(false);

  // Receive QR
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [mintName, setMintName] = useState('');
  const [minting, setMinting] = useState(false);

  const mtAddress = wallet?.publicKey || '';
  const solAddress = wallet?.solanaSeed ? deriveSolanaKeypairFromSeed(wallet.solanaSeed).publicKey : '';

  // Short address helper
  const shortAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  // Copy helper
  const copy = async (text, label = '') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label || text);
      setTimeout(() => setCopied(''), 1600);
      setStatus(`Copied ${label || 'address'} to clipboard`);
    } catch (e) {
      setStatus('Copy failed');
    }
  };

  // Generate QR for current MT address
  const generateQR = async (addr) => {
    if (!addr) return;
    try {
      const url = await QRCode.toDataURL(addr, {
        color: { dark: '#10b981', background: '#0a0a0a' },
        margin: 1,
        width: 220,
      });
      setQrDataUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  // Refresh all on-chain data for current wallet
  const refreshAll = async () => {
    if (!wallet) return;
    setLoadingBalances(true);
    setStatus('Syncing balances from MT node and Solana...');

    try {
      // MT native
      const mt = await fetchMTBalance(mtAddress);
      setMtBalance(mt.balance);
      setMtNonce(mt.nonce);

      // NFTs on MT
      const ownedNfts = await fetchMTNFTs(mtAddress);
      setNfts(ownedNfts);

      // Activity
      const history = await fetchMTTxs(mtAddress);
      setTxs(history.sort((a, b) => (b.time || 0) - (a.time || 0)));

      // Solana $MT + SOL (for fees / bridge context)
      if (solAddress) {
        const [smt, ssol] = await Promise.all([
          fetchSolanaMTBalance(solAddress),
          fetchSolanaSOLBalance(solAddress),
        ]);
        setSolMTBalance(smt);
        setSolSOLBalance(ssol);
      }

      setStatus('Balances synced • All data from on-chain sources');
    } catch (e) {
      setStatus(`Sync partial: ${e.message}`);
    } finally {
      setLoadingBalances(false);
    }
  };

  // Unlock existing vault
  const handleUnlock = async (e) => {
    e?.preventDefault();
    setAuthError('');
    if (!password) {
      setAuthError('Password required');
      return;
    }
    try {
      const w = await unlockVault(password);
      setWallet(w);
      setIsUnlocked(true);
      setPassword('');
      setStatus('Vault unlocked • Keys decrypted in memory only');
      // Generate QR + load data
      setTimeout(() => {
        generateQR(w.publicKey);
        refreshAll();
      }, 50);
    } catch (err) {
      setAuthError('Incorrect password or corrupted vault');
    }
  };

  // Create new vault + wallet
  const handleCreateWallet = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    try {
      const w = generateMTWallet();
      await saveVault(w.mnemonic, password);
      setWallet(w);
      setIsUnlocked(true);
      setPassword('');
      setConfirmPassword('');
      setShowCreate(false);
      setStatus('New wallet created and encrypted locally. BACK UP YOUR SEED PHRASE NOW.');
      setTimeout(() => {
        generateQR(w.publicKey);
        refreshAll();
      }, 50);
    } catch (err) {
      setAuthError(`Failed to create vault: ${err.message}`);
    }
  };

  // Import mnemonic into new vault
  const handleImportWallet = async (e) => {
    e.preventDefault();
    setAuthError('');
    const clean = importMnemonic.trim();
    if (!clean || clean.split(/\s+/).length < 12) {
      setAuthError('Enter a valid 12 or 24 word recovery phrase');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    try {
      const w = importMTWalletFromMnemonic(clean);
      await saveVault(w.mnemonic, password);
      setWallet(w);
      setIsUnlocked(true);
      setImportMnemonic('');
      setPassword('');
      setConfirmPassword('');
      setShowImport(false);
      setStatus('Wallet imported and encrypted. Verify your seed phrase is correct.');
      setTimeout(() => {
        generateQR(w.publicKey);
        refreshAll();
      }, 50);
    } catch (err) {
      setAuthError(`Import failed: ${err.message}`);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setWallet(null);
    setMtBalance(0);
    setNfts([]);
    setTxs([]);
    setQrDataUrl('');
    setActiveTab('portfolio');
    setStatus('Wallet locked. All keys cleared from memory.');
  };

  const handleDeleteVault = () => {
    if (!confirm('Permanently delete encrypted vault from this browser? You will lose access unless you have your seed phrase backed up.')) return;
    deleteVault();
    handleLock();
    setStatus('Vault deleted from this device.');
  };

  // SEND TRANSACTION (native MT)
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!wallet || !sendTo || !sendAmount) return;

    setSending(true);
    setStatus('Signing transaction locally...');

    try {
      const amt = parseFloat(sendAmount);
      const res = await sendMT(wallet, sendTo, amt, mtNonce);

      setStatus(`Success! TX broadcasted. Fee: ${MT_TX_FEE} MT (~1¢)`);
      setSendTo('');
      setSendAmount('');
      setShowSendModal(false);

      // Optimistic + refresh
      setMtBalance((prev) => Math.max(0, prev - amt - MT_TX_FEE));
      setTimeout(refreshAll, 800);
    } catch (err) {
      setStatus(`Send failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // MINT NFT (on MT chain) - unique feature
  const handleMintNFT = async () => {
    if (!wallet || !mintName.trim()) return;
    setMinting(true);
    setStatus('Minting NFT on MT chain...');

    const tokenId = `mt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const metadata = {
      name: mintName.trim(),
      description: 'Minted via MT Wallet • MT ECO SYSTEM',
      image: '', // future: support upload or ipfs
      attributes: [{ trait_type: 'Origin', value: 'MT Wallet' }],
      created: new Date().toISOString(),
    };

    const nftTx = {
      from: wallet.publicKey,
      to: wallet.publicKey,
      type: 'NFT_MINT',
      payload: {
        tokenId,
        owner: wallet.publicKey,
        metadata,
      },
      nonce: mtNonce,
      timestamp: Date.now(),
    };

    try {
      const signature = signMTTx(nftTx, wallet.secretKey);
      await submitMTTx(nftTx, signature);

      setStatus(`NFT minted: ${tokenId}`);
      setMintName('');
      setShowMintModal(false);
      setTimeout(refreshAll, 600);
    } catch (err) {
      setStatus(`Mint failed: ${err.message}`);
    } finally {
      setMinting(false);
    }
  };

  // Auto refresh QR when address ready
  useEffect(() => {
    if (mtAddress) generateQR(mtAddress);
  }, [mtAddress]);

  // Keyboard escape for modals
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowSendModal(false);
        setShowReceiveModal(false);
        setShowMintModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ========== LOCKED / SETUP SCREEN ==========
  if (!isUnlocked) {
    const hasExisting = typeof window !== 'undefined' && localStorage.getItem('mt_vault_v1');

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 selection:bg-emerald-500 selection:text-black">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-4">
              <span className="font-black text-3xl text-black tracking-[-2px]">MT</span>
            </div>
            <div className="text-3xl font-black tracking-[-1.5px]">MT Wallet</div>
            <div className="text-emerald-400 text-sm tracking-[3px] mt-1 font-mono">MT ECO SYSTEM</div>
            <div className="text-[10px] text-zinc-500 mt-2">SELF-CUSTODIAL • NO THIRD PARTIES • 1¢ FEES</div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-xl">
            {!hasExisting && !showCreate && !showImport && (
              <div className="text-center space-y-6">
                <div>
                  <div className="text-lg font-semibold">Welcome to the future of on-chain.</div>
                  <p className="text-sm text-zinc-400 mt-2">Your keys. Your assets. Your rockets.<br />Everything built in-house for the MT network.</p>
                </div>
                <div className="space-y-3 pt-2">
                  <button onClick={() => setShowCreate(true)} className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-sm tracking-widest transition flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> CREATE NEW WALLET
                  </button>
                  <button onClick={() => setShowImport(true)} className="w-full py-3.5 rounded-2xl border border-zinc-700 hover:bg-zinc-900 text-sm font-semibold tracking-widest transition">
                    IMPORT RECOVERY PHRASE
                  </button>
                </div>
                <div className="text-[10px] text-emerald-400/70 pt-3">100% client-side encryption • Ed25519 keys • Compatible with MT node</div>
              </div>
            )}

            {/* CREATE FORM */}
            {showCreate && (
              <form onSubmit={handleCreateWallet} className="space-y-5">
                <div className="text-center mb-2">
                  <div className="font-semibold text-lg">Create Secure Vault</div>
                  <div className="text-xs text-zinc-500">Password encrypts your seed phrase locally</div>
                </div>
                <input type="password" required minLength={6} placeholder="Create password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-mono placeholder:text-zinc-600" />
                <input type="password" required placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-mono placeholder:text-zinc-600" />
                {authError && <div className="text-red-400 text-xs">{authError}</div>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowCreate(false); setAuthError(''); }} className="flex-1 py-3 rounded-2xl border border-zinc-700 text-sm">Cancel</button>
                  <button type="submit" className="flex-1 py-3 rounded-2xl bg-emerald-500 text-black font-bold text-sm tracking-wider">CREATE &amp; ENCRYPT</button>
                </div>
              </form>
            )}

            {/* IMPORT FORM */}
            {showImport && (
              <form onSubmit={handleImportWallet} className="space-y-5">
                <div className="text-center mb-1">
                  <div className="font-semibold text-lg">Import Existing Wallet</div>
                  <div className="text-xs text-zinc-500">Enter your 12-word recovery phrase</div>
                </div>
                <textarea value={importMnemonic} onChange={(e) => setImportMnemonic(e.target.value)} placeholder="word1 word2 word3 ..." className="w-full h-24 bg-black border border-zinc-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-mono placeholder:text-zinc-600 resize-y" />
                <input type="password" required minLength={6} placeholder="New vault password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-mono" />
                <input type="password" required placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-mono" />
                {authError && <div className="text-red-400 text-xs">{authError}</div>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setShowImport(false); setAuthError(''); }} className="flex-1 py-3 rounded-2xl border border-zinc-700 text-sm">Cancel</button>
                  <button type="submit" className="flex-1 py-3 rounded-2xl bg-emerald-500 text-black font-bold text-sm tracking-wider">IMPORT &amp; SECURE</button>
                </div>
              </form>
            )}

            {/* UNLOCK (existing vault) */}
            {hasExisting && !showCreate && !showImport && (
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="text-center">
                  <div className="font-semibold">Unlock MT Wallet</div>
                  <div className="text-xs text-zinc-500 mt-1">Enter the password you used to encrypt this vault</div>
                </div>
                <div className="relative">
                  <input type="password" autoFocus required placeholder="Vault password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-sm font-mono" />
                </div>
                {authError && <div className="text-red-400 text-xs -mt-1">{authError}</div>}
                <button type="submit" className="w-full py-3.5 mt-2 rounded-2xl bg-white text-black font-bold text-sm tracking-[1.5px] flex items-center justify-center gap-2 active:opacity-90">
                  <Unlock className="w-4 h-4" /> UNLOCK VAULT
                </button>
                <div className="text-center pt-1">
                  <button type="button" onClick={() => setShowImport(true)} className="text-xs text-emerald-400 hover:underline">Import different seed instead</button>
                </div>
              </form>
            )}
          </div>

          <div className="text-center mt-6 text-[10px] text-zinc-500 font-mono tracking-widest">NO KEYS SENT • NO FIREBASE • NO PHANTOM • BUILT FOR MT</div>
        </div>
      </div>
    );
  }

  // ========== UNLOCKED MAIN WALLET UI ==========
  const currentFeeLabel = `${MT_TX_FEE} MT (~1¢ SOL equivalent)`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col selection:bg-emerald-400 selection:text-black">
      {/* TOP NAV */}
      <nav className="border-b border-zinc-800 bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <span className="font-black text-lg text-black tracking-[-1.5px]">MT</span>
              </div>
              <div>
                <div className="font-bold tracking-tight text-xl leading-none">MT Wallet</div>
                <div className="text-[10px] text-emerald-400/90 -mt-0.5 font-mono tracking-[1px]">MT ECO SYSTEM</div>
              </div>
            </div>
            <div className="ml-3 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-900">LIVE • SELF BUILT</div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs font-mono text-zinc-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {MT_NODE.replace('http://', '')}
            </div>

            {mtAddress && (
              <button onClick={() => copy(mtAddress, 'MT address')} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-mono transition">
                {shortAddr(mtAddress)}
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            <button onClick={handleLock} className="flex items-center gap-2 px-4 py-1.5 text-xs rounded-2xl border border-zinc-700 hover:bg-zinc-950 transition">
              <Lock className="w-3.5 h-3.5" /> LOCK
            </button>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="border-t border-zinc-800">
          <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto py-2 text-sm">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-2xl whitespace-nowrap transition font-medium text-sm ${active ? 'bg-white text-black' : 'hover:bg-zinc-900 text-zinc-400 hover:text-white'}`}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* BODY */}
      <div className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
        {/* Status bar */}
        <div className="mb-6 flex items-center justify-between text-xs">
          <div className="font-mono text-emerald-400/80 flex items-center gap-2">
            <div className="w-px h-3 bg-emerald-400/40" /> {status}
          </div>
          <button onClick={refreshAll} disabled={loadingBalances} className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 text-xs font-medium">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBalances ? 'animate-spin' : ''}`} /> REFRESH ON-CHAIN
          </button>
        </div>

        {/* PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* MT Native Balance - Primary */}
              <div className="col-span-1 md:col-span-2 rounded-3xl bg-zinc-950 border border-zinc-800 p-8">
                <div className="flex justify-between">
                  <div>
                    <div className="uppercase tracking-[2px] text-xs text-emerald-400 font-semibold">Native MT • On MT Chain</div>
                    <div className="mt-3 text-6xl font-black tabular-nums tracking-[-2.5px]">{mtBalance.toFixed(2)}</div>
                    <div className="text-emerald-400 text-xl font-semibold -mt-1">$MT</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">Your primary asset on the MT network</div>
                    <div className="mt-6 flex gap-3">
                      <button onClick={() => { setActiveTab('send-receive'); setShowSendModal(true); }} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-white transition rounded-2xl text-black font-semibold text-sm flex items-center gap-2">
                        <Send className="w-4 h-4" /> SEND
                      </button>
                      <button onClick={() => { setActiveTab('send-receive'); setShowReceiveModal(true); }} className="px-5 py-2 border border-zinc-700 hover:bg-zinc-900 rounded-2xl text-sm flex items-center gap-2">
                        <QrCode className="w-4 h-4" /> RECEIVE
                      </button>
                    </div>
                    { (MT_NODE.includes('localhost') || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) && (
                      <button
                        onClick={async () => {
                          try {
                            setStatus('Requesting test MT from local faucet...');
                            const r = await requestTestFunds(mtAddress);
                            setStatus(`Faucet success: +${r.credited} test MT`);
                            await refreshAll();
                          } catch (e) {
                            setStatus(`Faucet error: ${e.message}`);
                          }
                        }}
                        className="mt-3 w-full text-xs py-1.5 rounded-xl border border-dashed border-emerald-800/60 text-emerald-400 hover:bg-emerald-950/40 transition"
                      >
                        🚰 Get 1000 Test $MT (dev faucet)
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-zinc-900 text-xs flex gap-6 text-zinc-400 font-mono">
                  <div>NETWORK FEE: <span className="text-emerald-400">{currentFeeLabel}</span></div>
                  <div>NONCE: {mtNonce}</div>
                  <div>ADDRESS: <button onClick={() => copy(mtAddress)} className="underline decoration-dotted hover:text-white">{shortAddr(mtAddress)}</button></div>
                </div>
              </div>

              {/* Side assets */}
              <div className="space-y-5">
                <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6">
                  <div className="text-xs text-zinc-400">SOLANA $MT (SPL)</div>
                  <div className="text-4xl font-semibold tabular-nums mt-1">{solMTBalance.toFixed(2)}</div>
                  <div className="text-xs text-emerald-400/70">Bridge coming soon • 1:1</div>
                </div>
                <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6">
                  <div className="text-xs text-zinc-400">SOL (for bridging / fees)</div>
                  <div className="text-4xl font-semibold tabular-nums mt-1">{solSOLBalance.toFixed(4)}</div>
                  <div className="text-xs text-zinc-500">Solana mainnet • {shortAddr(solAddress)}</div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowSendModal(true)} className="px-6 py-3 bg-white text-black rounded-2xl font-semibold flex items-center gap-2 text-sm active:scale-[0.985]"><Send className="w-4 h-4" /> SEND MT</button>
              <button onClick={() => { setActiveTab('send-receive'); setShowReceiveModal(true); }} className="px-6 py-3 border border-zinc-700 rounded-2xl font-semibold flex items-center gap-2 text-sm"><QrCode className="w-4 h-4" /> SHOW QR / ADDRESS</button>
              <button onClick={() => setShowMintModal(true)} className="px-6 py-3 border border-emerald-800 hover:bg-emerald-950 text-emerald-400 rounded-2xl font-semibold flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> MINT NFT ON MT</button>
              <button onClick={refreshAll} className="px-5 py-3 text-sm border border-zinc-800 rounded-2xl flex items-center gap-2 hover:bg-zinc-950"><RefreshCw className="w-4 h-4" /> SYNC ALL</button>
            </div>
          </div>
        )}

        {/* SEND / RECEIVE */}
        {activeTab === 'send-receive' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Send card */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8">
              <div className="flex items-center gap-3 text-emerald-400 mb-6">
                <ArrowUpRight className="w-5 h-5" />
                <div className="font-semibold tracking-wide">SEND NATIVE $MT</div>
              </div>

              <form onSubmit={handleSend} className="space-y-5">
                <div>
                  <div className="text-xs text-zinc-400 mb-1.5 font-medium">RECIPIENT MT ADDRESS (bs58)</div>
                  <input value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="5x... or your friend's MT pubkey" className="font-mono text-sm w-full bg-black border border-zinc-800 focus:border-emerald-600 rounded-2xl px-4 py-3" required />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                    <div>AMOUNT</div>
                    <button type="button" onClick={() => setSendAmount(String(Math.max(0, mtBalance - MT_TX_FEE - 0.01)))} className="text-emerald-400">MAX (minus fee)</button>
                  </div>
                  <div className="relative">
                    <input type="number" step="any" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.00" className="font-mono text-xl w-full bg-black border border-zinc-800 focus:border-emerald-600 rounded-2xl px-4 py-3 pr-16" required />
                    <div className="absolute right-5 top-3.5 text-sm text-zinc-400 font-semibold">$MT</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/60 border border-zinc-900 p-4 text-xs font-mono space-y-1 text-zinc-400">
                  <div className="flex justify-between"><span>Amount</span><span>{sendAmount || '0'} MT</span></div>
                  <div className="flex justify-between text-emerald-400"><span>Network fee (fixed)</span><span>{currentFeeLabel}</span></div>
                  <div className="pt-1 border-t border-zinc-900 flex justify-between font-semibold text-white"><span>Total deduction</span><span>{(parseFloat(sendAmount || 0) + MT_TX_FEE).toFixed(2)} MT</span></div>
                </div>

                <button disabled={sending || !sendTo || !sendAmount} type="submit" className="w-full py-4 rounded-2xl bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold tracking-widest text-sm mt-2 flex items-center justify-center gap-2">
                  {sending ? 'SIGNING & BROADCASTING...' : 'SIGN WITH LOCAL KEY & SEND'}
                </button>
                <div className="text-center text-[10px] text-emerald-400/60">Signature happens 100% in your browser. Never sent to any server.</div>
              </form>
            </div>

            {/* Receive */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 flex flex-col">
              <div className="flex items-center gap-3 text-emerald-400 mb-6">
                <ArrowDownLeft className="w-5 h-5" />
                <div className="font-semibold tracking-wide">RECEIVE</div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="MT Address QR" className="rounded-2xl border border-zinc-800 p-3 bg-black" />
                ) : (
                  <div className="w-56 h-56 bg-zinc-900 rounded-2xl animate-pulse" />
                )}

                <div className="mt-6 text-center">
                  <div className="text-xs text-zinc-500">YOUR MT ADDRESS</div>
                  <button onClick={() => copy(mtAddress)} className="mt-1 font-mono text-sm break-all hover:text-emerald-400 transition">{mtAddress}</button>
                </div>
              </div>

              <button onClick={() => copy(mtAddress)} className="mt-4 py-3 rounded-2xl border border-zinc-700 flex items-center justify-center gap-2 text-sm">
                <Copy className="w-4 h-4" /> COPY ADDRESS
              </button>
            </div>
          </div>
        )}

        {/* NFTs */}
        {activeTab === 'nfts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-xl">Your On-Chain NFTs</div>
              <button onClick={() => setShowMintModal(true)} className="px-5 py-2 rounded-2xl bg-emerald-500 text-black text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> MINT NEW NFT</button>
            </div>
            {nfts.length === 0 ? (
              <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-800 rounded-3xl">No NFTs yet. Mint your first companion or game asset above — stored forever on the MT chain.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {nfts.map((nft, i) => (
                  <div key={i} className="border border-zinc-800 bg-zinc-950 rounded-3xl p-5">
                    <div className="font-mono text-xs text-emerald-400 mb-2">{nft.tokenId}</div>
                    <div className="font-semibold text-lg">{nft.metadata?.name || 'Unnamed Asset'}</div>
                    <div className="text-sm text-zinc-400 mt-1 line-clamp-2">{nft.metadata?.description}</div>
                    <div className="text-[10px] text-zinc-500 mt-4 font-mono">OWNER: {shortAddr(nft.owner)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ROCKETS - Unique platform currency earned in games */}
        {activeTab === 'rockets' && (
          <div className="max-w-2xl">
            <div className="text-2xl font-bold mb-2">Rockets</div>
            <p className="text-zinc-400">Platform-native utility points earned exclusively in MT Games. Store, transfer, and spend them anywhere in the ecosystem (games, services, future marketplace).</p>

            <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
              <div className="text-7xl font-black tabular-nums text-orange-400">128</div>
              <div className="uppercase tracking-[3px] mt-1 text-sm text-orange-400/70">ROCKETS</div>
              <div className="text-xs mt-6 text-zinc-400">Earned in: <span className="text-white">Cosmic Dash (demo game)</span> • Usable in future titles and services</div>
            </div>

            <div className="mt-6 text-xs text-center text-emerald-400/60">Rockets live as on-chain assets. Transfer via wallet. No third-party points systems.</div>
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === 'activity' && (
          <div>
            <div className="font-semibold mb-4">On-Chain Activity</div>
            {txs.length === 0 ? (
              <div className="text-zinc-400 py-12 text-center border border-dashed border-zinc-800 rounded-3xl">No transactions yet. Your first send or NFT mint will appear here.</div>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                {txs.map((tx, idx) => (
                  <div key={idx} className="flex justify-between bg-zinc-950 border border-zinc-800 px-5 py-3 rounded-2xl">
                    <div className="flex gap-4 items-center">
                      <div className="text-emerald-400 text-xs px-2 py-0.5 rounded bg-emerald-950">{tx.type || 'TRANSFER'}</div>
                      <div>{shortAddr(tx.from)} → {shortAddr(tx.to)}</div>
                    </div>
                    <div className="text-right">
                      <span className="tabular-nums">{tx.amount} MT</span>
                      <span className="text-xs text-zinc-500 ml-2">fee {tx.fee}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BRIDGE (unique self-built, no 3rd party) */}
        {activeTab === 'bridge' && (
          <div className="max-w-3xl">
            <div className="uppercase text-xs tracking-widest text-emerald-400 mb-1">CROSS-CHAIN • BUILT IN-HOUSE</div>
            <div className="text-3xl font-semibold tracking-tight mb-6">Bridge to any chain (starting with Solana)</div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
              <div className="text-sm">Current flow (live on MT node + Solana verifier):</div>
              <ol className="list-decimal ml-5 mt-4 space-y-2 text-sm text-zinc-300">
                <li>Hold $MT on Solana (the pump.fun token)</li>
                <li>Burn / send to bridge program address on Solana (we verify on-chain)</li>
                <li>Submit proof in this wallet → native MT is minted 1:1 to your MT address</li>
              </ol>
              <div className="mt-8 text-xs bg-black p-4 rounded-2xl font-mono border border-zinc-900">Solana burn verification + MT mint proof is implemented in mt-core. Full UI + two-way coming next.</div>
            </div>

            <div className="text-xs mt-6 text-center text-zinc-500">Future: direct bridges to ETH, Base, Solana (bi-directional), and any chain we add verifier modules for. Zero reliance on third-party bridges.</div>
          </div>
        )}

        {/* SETTINGS + SECURITY */}
        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-8">
            <div>
              <div className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> SECURITY — NO COMPROMISE</div>
              <ul className="space-y-2 text-sm text-zinc-300 list-disc ml-5">
                <li>All private keys &amp; seed generated and stored only in this browser.</li>
                <li>Mnemonic encrypted with AES-GCM + strong PBKDF2 using your password.</li>
                <li>Signing happens locally. The MT node only ever sees a signature + public data.</li>
                <li>No Firebase, no external auth, no analytics, no third-party key custody.</li>
                <li>Locking the wallet clears decrypted keys from memory instantly.</li>
              </ul>
            </div>

            <div className="border border-zinc-800 rounded-3xl p-6 bg-zinc-950">
              <div className="font-semibold mb-3">Recovery Phrase (SEED)</div>
              <div className="text-xs text-orange-400 mb-3">Write this down on paper. Never screenshot. Never share.</div>

              {!seedRevealed ? (
                <button onClick={() => setSeedRevealed(true)} className="px-5 py-2 rounded-2xl border border-orange-900 text-orange-400 text-sm flex items-center gap-2"><Eye className="w-4 h-4" /> REVEAL SEED PHRASE</button>
              ) : (
                <div>
                  <div className="p-4 bg-black font-mono text-sm rounded-2xl border border-orange-900/50 break-words select-all">{wallet.mnemonic}</div>
                  <button onClick={() => copy(wallet.mnemonic, 'seed')} className="mt-2 text-xs flex items-center gap-1 text-orange-400"><Copy className="w-3 h-3" /> COPY TO CLIPBOARD (clear after)</button>
                  <div className="text-[10px] text-orange-400/60 mt-3">Hide again after use. Consider deleting the vault after you have safely backed it up.</div>
                </div>
              )}
            </div>

            <button onClick={handleDeleteVault} className="text-red-400 text-sm underline underline-offset-4">Permanently delete vault from this browser</button>

            <div className="text-xs text-zinc-500 pt-4">MT Node: {MT_NODE} • All fees ultra-low and fixed. Future developer APIs + social connect endpoints will be self-hosted.</div>
          </div>
        )}
      </div>

      {/* FOOTER BAR */}
      <div className="border-t border-zinc-800 py-3 text-center text-[10px] text-zinc-500 font-mono tracking-widest">MT ECO SYSTEM — EVERYTHING BUILT IN-HOUSE • 1 CENT FEES • YOUR ASSETS, YOUR RULES</div>

      {/* SEND MODAL */}
      <AnimatePresence>
        {showSendModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setShowSendModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} onClick={(e) => e.stopPropagation()} className="bg-zinc-950 border border-zinc-700 w-full max-w-md rounded-3xl p-8">
              <div className="flex justify-between mb-6">
                <div className="font-semibold">Send Native $MT</div>
                <button onClick={() => setShowSendModal(false)}><X /></button>
              </div>
              <form onSubmit={handleSend} className="space-y-4">
                <input value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="Recipient MT address" className="w-full font-mono bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-sm" required />
                <input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="Amount" className="w-full font-mono bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-xl" required />
                <div className="text-xs text-emerald-400">Fee: {currentFeeLabel}</div>
                <button disabled={sending} className="w-full py-4 bg-emerald-500 rounded-2xl text-black font-bold text-sm tracking-widest mt-2">{sending ? 'BROADCASTING...' : 'SIGN & BROADCAST'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIVE MODAL */}
      <AnimatePresence>
        {showReceiveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setShowReceiveModal(false)}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-zinc-950 border border-zinc-700 rounded-3xl p-8 max-w-sm w-full text-center">
              <div className="font-semibold mb-4">Receive $MT</div>
              {qrDataUrl && <img src={qrDataUrl} className="mx-auto mb-4 rounded-2xl border border-zinc-800 p-4 bg-black" alt="QR" />}
              <div onClick={() => copy(mtAddress)} className="font-mono text-xs break-all cursor-pointer hover:text-emerald-400 active:text-white">{mtAddress}</div>
              <button onClick={() => copy(mtAddress)} className="mt-6 w-full py-3 text-sm border border-zinc-700 rounded-2xl">COPY ADDRESS</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MINT NFT MODAL - unique creator experience */}
      <AnimatePresence>
        {showMintModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setShowMintModal(false)}>
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} className="bg-zinc-950 border border-zinc-700 w-full max-w-md rounded-3xl p-8">
              <div className="font-semibold mb-1">Mint NFT on MT Chain</div>
              <div className="text-xs text-zinc-400 mb-5">Creates a real on-chain NFT owned by your wallet. No third-party marketplace or minting service.</div>

              <input value={mintName} onChange={e => setMintName(e.target.value)} placeholder="NFT name (e.g. Cosmic Rocket #1)" className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-sm mb-4" />
              <button disabled={minting || !mintName.trim()} onClick={handleMintNFT} className="w-full py-3 bg-emerald-500 text-black font-bold rounded-2xl text-sm tracking-wider disabled:bg-zinc-800">{minting ? 'MINTING ON MT NODE...' : 'MINT NFT (costs 0.01 MT fee)'}</button>
              <div className="text-center text-[10px] text-zinc-500 mt-4">Your NFT will appear instantly in the NFTs tab once confirmed.</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
