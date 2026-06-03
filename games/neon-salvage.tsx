"use client";
import { useEffect, useState, useRef } from "react";
import Reel from "../components/Reel"; // adjust path as needed for your project
import CoinBurst from "../components/CoinBurst";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction, 
  TOKEN_PROGRAM_ID, 
  getAccount, 
  createAssociatedTokenAccountInstruction, 
  ASSOCIATED_TOKEN_PROGRAM_ID 
} from "@solana/spl-token";

// $MT Mint
const MT_MINT_ADDRESS = new PublicKey("ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump");

// RELIABLE RPC - Use your Helius or QuickNode (from your list)
const connection = new Connection(
  "https://mainnet.helius-rpc.com/?api-key=61a3cb76-ffd8-4dde-bb49-35cae29566c8", 
  "confirmed"
);

// For even better reliability, add your Moralis key here or via env
// e.g. const MORALIS_KEY = process.env.NEXT_PUBLIC_MORALIS_API_KEY || "your-key-here";
const MORALIS_KEY = ""; // <-- Paste your Moralis key here for reliable balance (recommended to avoid any RPC issues)

const symbols = [
  "https://futuret3ch.com.au/token.jpg",
  "https://futuret3ch.com.au/mtlogo.png",
  "https://futuret3ch.com.au/rocket.gif",
  "https://futuret3ch.com.au/stockup.gif",
  "https://futuret3ch.com.au/red-candle.gif",
  "https://futuret3ch.com.au/mtlogo.png",
  "https://futuret3ch.com.au/mtspin.gif",
  "https://futuret3ch.com.au/mtlogo.png",
  "https://futuret3ch.com.au/t3x.jpg",
  "https://futuret3ch.com.au/mtlogo.png"
];

function calculateWin(reels: string[], betAmount: number) {
  const counts = reels.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<string, number>);
  const maxCount = Math.max(...Object.values(counts));
  
  if (counts[symbols[0]] >= 3) return Math.floor(betAmount * 10);
  if (maxCount >= 6) return Math.floor(betAmount * 5);
  if (maxCount >= 4) return Math.floor(betAmount * 2.8);
  if (maxCount >= 3) return Math.floor(betAmount * 1.6);
  if (Math.random() < 0.35) return 0;
  return Math.floor(betAmount * 0.4);
}

export default function NeonSalvageGame() {
  const [energy, setEnergy] = useState(5);
  const [mtBalance, setMtBalance] = useState(0);
  const [coins, setCoins] = useState(1250);
  const [useMTMode, setUseMTMode] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(Array(9).fill(symbols[0]));
  const [burst, setBurst] = useState(0);
  const [showRewardFlash, setShowRewardFlash] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [timeToNextEnergy, setTimeToNextEnergy] = useState(300);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const RECIPIENT = new PublicKey("BYT4VtK6QQWuBFJA9gS7j9H1VPqfAimMp9JzfPGfC8r2");

  const [showShopModal, setShowShopModal] = useState(false);
  const [showDailyCalendar, setShowDailyCalendar] = useState(false);
  const [hasClaimedToday, setHasClaimedToday] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adWatched, setAdWatched] = useState(false);
  const [topBarHidden, setTopBarHidden] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const energyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const maxEnergy = 9;
  const noResource = useMTMode ? mtBalance < betAmount : energy <= 0;

  // Reliable Moralis + RPC balance fetch (from our proven wallet logic)
  const fetchMTBalance = async (address: string) => {
    // 1. Try Moralis first (most reliable, avoids RPC cert issues entirely)
    if (MORALIS_KEY && MORALIS_KEY.length > 50) {
      try {
        const url = `https://solana-gateway.moralis.io/account/mainnet/${address}/tokens?tokenAddresses=${MT_MINT_ADDRESS.toBase58()}`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json', 'X-Api-Key': MORALIS_KEY }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const token = data[0];
            const raw = token.balance || '0';
            const dec = token.decimals || 6;
            setMtBalance(Number(raw) / Math.pow(10, dec));
            return;
          }
        }
      } catch (e) {
        console.warn("Moralis balance fetch failed, falling back to RPC:", e);
      }
    }

    // 2. Fallback to reliable RPC (Helius/QuickNode via our connection)
    try {
      const publicKey = new PublicKey(address);
      const res = await connection.getTokenAccountsByOwner(publicKey, { mint: MT_MINT_ADDRESS });
      if (res.value.length > 0) {
        const pubkey = res.value[0].pubkey;
        const account = await getAccount(connection, pubkey);
        const realBalance = Number(account.amount) / Math.pow(10, 6);
        setMtBalance(realBalance);
      } else {
        setMtBalance(0);
      }
    } catch (err) {
      console.error("MT balance fetch error (using robust getTokenAccountsByOwner):", err);
      setMtBalance(0);
    }
  };

  useEffect(() => {
    const last = localStorage.getItem("lastDailyClaim");
    if (last === new Date().toDateString()) setHasClaimedToday(true);

    spinSoundRef.current = new Audio("https://futuret3ch.com.au/slotspin.wav");
    spinSoundRef.current.volume = 0.85;

    energyTimerRef.current = setInterval(() => {
      setTimeToNextEnergy((prev) => {
        if (prev <= 1) {
          setEnergy(e => Math.min(maxEnergy, e + 1));
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (energyTimerRef.current) clearInterval(energyTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const connectPhantom = async () => {
    try {
      const provider = (window as any).phantom?.solana;
      if (!provider) {
        window.open("https://phantom.app/", "_blank");
        return false;
      }
      const resp = await provider.connect();
      const addr = resp.publicKey.toString();
      setWalletAddress(addr);
      await fetchMTBalance(addr);
      return true;
    } catch {
      alert("❌ Connection failed");
      return false;
    }
  };

  // Auto-connect
  useEffect(() => {
    const provider = (window as any).phantom?.solana;
    if (provider?.isPhantom) {
      provider.connect({ onlyIfTrusted: true })
        .then((resp: any) => {
          setWalletAddress(resp.publicKey.toString());
        })
        .catch(() => {});
    }
  }, []);

  // Refetch balance when wallet changes
  useEffect(() => {
    if (walletAddress) {
      fetchMTBalance(walletAddress);
    }
  }, [walletAddress]);

  // Buy MT - transfers real $MT (updated for reliability)
  const buyMT = async (amountMT: number) => {
    const connected = await connectPhantom();
    if (!connected || !walletAddress) return;

    try {
      const provider = (window as any).phantom?.solana;
      const buyerPublicKey = new PublicKey(walletAddress);
      const transaction = new Transaction();

      const buyerATA = await getAssociatedTokenAddress(MT_MINT_ADDRESS, buyerPublicKey);
      const recipientATA = await getAssociatedTokenAddress(MT_MINT_ADDRESS, RECIPIENT);

      try {
        await getAccount(connection, recipientATA);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            buyerPublicKey, recipientATA, RECIPIENT, MT_MINT_ADDRESS
          )
        );
      }

      const decimals = 6;
      const transferAmount = amountMT * Math.pow(10, decimals);
      
      transaction.add(
        createTransferInstruction(buyerATA, recipientATA, buyerPublicKey, transferAmount)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = buyerPublicKey;

      const signed = await provider.signTransaction(transaction);
      const txId = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      try {
        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: txId }, "confirmed");
      } catch (confErr: any) {
        const status = await connection.getSignatureStatus(txId);
        const confirmed = status.value?.confirmationStatus === "confirmed" || status.value?.confirmationStatus === "finalized";
        if (!confirmed) throw confErr;
      }

      setMtBalance(m => m + amountMT);
      alert(`✅ Success! ${amountMT} $MT transferred.`);
      setShowShopModal(false);

    } catch (err: any) {
      if (err.code === 4001 || err.message?.includes("User rejected")) return;
      console.error("Transaction Error:", err);
      if (err.logs) console.log("— SOLANA LOGS —", err.logs);

      if (err.name === 'TransactionExpiredBlockheightExceededError') {
        alert("⏱️ Network lag. Check your wallet in a moment — it likely succeeded.");
      } else {
        alert("❌ Purchase failed: " + (err.message || "Unknown error"));
      }
    }
  };

  const claimDaily = (day: number) => {
    localStorage.setItem("lastDailyClaim", new Date().toDateString());
    setHasClaimedToday(true);
    const powerReward = day % 7 === 0 ? 8 : 4;
    const coinReward = day % 5 === 0 ? 25 : 10;
    setEnergy(e => Math.min(maxEnergy, e + powerReward));
    setCoins(c => c + coinReward);
    setBurst(12);
    setShowDailyCalendar(false);
  };

  const watchAd = () => {
    setShowAdModal(true);
    setAdWatched(false);
  };

  const awardReward = () => {
    setEnergy(e => Math.min(maxEnergy, e + 3));
    setBurst(8);
    setAdWatched(true);

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setShowAdModal(false);
      setAdWatched(false);
    }, 3200);
  };

  const closeAd = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setShowAdModal(false);
    setAdWatched(false);
  };

  const handleVideoEnd = () => awardReward();

  const buyItem = (type: string, cost: number, amount: number) => {
    if (coins >= cost) {
      setCoins(c => c - cost);
      if (type === "mt") setMtBalance(m => m + amount);
      if (type === "energy") setEnergy(e => Math.min(maxEnergy, e + amount));
    }
  };

  // Deduct real $MT for bet (reliable version)
  const deductMTTransaction = async (amount: number): Promise<boolean> => {
    if (!walletAddress) {
      const ok = await connectPhantom();
      if (!ok) return false;
    }

    try {
      const provider = (window as any).phantom?.solana;
      const buyerPublicKey = new PublicKey(walletAddress!);
      const transaction = new Transaction();

      const buyerATA = await getAssociatedTokenAddress(MT_MINT_ADDRESS, buyerPublicKey);
      const recipientATA = await getAssociatedTokenAddress(MT_MINT_ADDRESS, RECIPIENT);

      const decimals = 6;
      const transferAmount = amount * Math.pow(10, decimals);

      transaction.add(
        createTransferInstruction(buyerATA, recipientATA, buyerPublicKey, transferAmount)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = buyerPublicKey;

      const signed = await provider.signTransaction(transaction);
      const txId = await connection.sendRawTransaction(signed.serialize());

      // Background confirmation + refresh
      connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: txId }, "confirmed")
        .then(() => fetchMTBalance(walletAddress!))
        .catch(() => {});

      return true;
    } catch (err) {
      console.error("Bet deduct failed:", err);
      return false;
    }
  };

  async function extract() {
    if (spinning || noResource) return;

    if (useMTMode) {
      setSpinning(true);
      const success = await deductMTTransaction(betAmount);
      if (!success) {
        setSpinning(false);
        alert("❌ $MT bet failed or was cancelled in wallet.");
        return;
      }
      setMtBalance(prev => Math.max(0, prev - betAmount));
    } else {
      setSpinning(true);
      setEnergy(e => Math.max(0, e - 1));
    }

    if (spinSoundRef.current) {
      spinSoundRef.current.currentTime = 0;
      spinSoundRef.current.play().catch(() => {});
    }

    const newReels = Array(9).fill(0).map(() => symbols[Math.floor(Math.random() * symbols.length)]);
    const reward = calculateWin(newReels, betAmount);

    newReels.forEach((symbol, i) => {
      setTimeout(() => {
        setReels(prev => {
          const updated = [...prev];
          updated[i] = symbol;
          return updated;
        });
      }, 60 + i * 55);
    });

    setTimeout(() => {
      if (reward > 0) {
        setCoins(c => c + reward);
        setRewardAmount(reward);
        setShowRewardFlash(true);
        setTimeout(() => setShowRewardFlash(false), 2200);
        setBurst(Math.floor(reward / 2));
      }
      setSpinning(false);
    }, 3000);
  }

  const formatTime = (seconds: number) => `${Math.floor(seconds/60)}:${(seconds%60).toString().padStart(2,'0')}`;

  return (
    <main className="h-screen bg-[#0a1428] flex flex-col items-center overflow-hidden relative px-3">
      {burst > 0 && <CoinBurst count={burst} onDone={() => setBurst(0)} />}

      {/* Top Bar */}
      <div className={`h-[110px] w-full max-w-[380px] bg-black/90 backdrop-blur-md border-b border-white/10 px-4 py-2.5 fixed top-0 z-50 shadow-xl transition-all duration-300 ${topBarHidden ? '-translate-y-[calc(100%-48px)]' : ''}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="font-black tracking-[3px] text-orange-400 text-xl">NEON SALVAGE</div>
          </div>
          <button onClick={() => setShowShopModal(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1 rounded-xl text-sm active:scale-95">SHOP</button>
        </div>

        <div className="flex justify-between items-center text-sm mt-1">
          <div className="flex items-center gap-4">
            <div onClick={!walletAddress ? connectPhantom : undefined} className={`cursor-pointer ${!walletAddress ? 'animate-pulse text-red-400' : ''}`}>
              <span className="text-emerald-400 font-bold">$MT</span>{" "}
              <span className="font-bold">{walletAddress ? mtBalance.toFixed(2) : "CONNECT"}</span>
            </div>
            <div><span className="text-amber-400 font-bold">{coins}</span></div>
          </div>
          <div className="flex items-center gap-1">
            ⚡ {energy}/{maxEnergy}
            {energy < maxEnergy && <span className="text-emerald-400 text-xs">({formatTime(timeToNextEnergy)})</span>}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {!hasClaimedToday && (
            <button onClick={() => setShowDailyCalendar(true)} className="flex-1 py-2 text-xs bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold rounded-2xl active:scale-95">DAILY</button>
          )}
          <button onClick={watchAd} className="flex-1 py-2 text-xs bg-violet-600 rounded-2xl font-bold active:scale-95">+3 ENERGY</button>
          <button onClick={() => setUseMTMode(!useMTMode)} className={`flex-1 py-2 text-xs rounded-2xl font-bold active:scale-95 ${useMTMode ? 'bg-amber-500 text-black' : 'bg-zinc-800'}`}>
            {useMTMode ? "$MT MODE" : "ENERGY MODE"}
          </button>
        </div>
      </div>

      {/* Slot Machine */}
      <div className={`pt-4 w-full max-w-[380px] px-2 transition-all ${topBarHidden ? 'pt-4' : 'pt-[125px]'}`}>
        <div className="relative bg-gradient-to-b from-amber-900 to-amber-950 border-[10px] border-amber-700 rounded-3xl shadow-2xl overflow-hidden scale-[0.88] origin-top">
          <div className="bg-[#1a2333] p-4 grid grid-cols-3 gap-3">
            {reels.map((value, i) => (
              <Reel key={i} value={value} spinning={spinning} delay={i * 0.04} />
            ))}
          </div>

          <div className="p-4 bg-black/70 border-t-4 border-amber-600">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="bg-violet-600 text-white px-5 py-1 rounded-2xl font-black text-lg tracking-widest">WIN {rewardAmount}</div>
              <div className="bg-blue-600 text-white px-5 py-1 rounded-2xl font-black text-lg tracking-widest">BET {betAmount}</div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setBetAmount(b => Math.max(5, b-5))} className="flex-1 py-5 bg-blue-700 hover:bg-blue-600 rounded-2xl font-black text-3xl active:scale-95">-</button>
              <button onClick={() => setBetAmount(b => Math.min(500, b+5))} className="flex-1 py-5 bg-blue-700 hover:bg-blue-600 rounded-2xl font-black text-3xl active:scale-95">+</button>
              <button onClick={() => setBetAmount(100)} className="px-8 bg-yellow-400 text-black font-black rounded-2xl text-xl active:scale-95">MAX</button>
              <button onClick={extract} disabled={spinning || noResource} className="flex-1 py-5 bg-red-600 hover:bg-red-500 text-white font-black text-3xl rounded-3xl active:scale-95 shadow-lg disabled:opacity-60">SPIN</button>
            </div>
          </div>

          {showRewardFlash && rewardAmount > 0 && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 pointer-events-none">
              <div className="text-center animate-[pop_0.8s_ease-out_forwards]">
                <div className="text-8xl font-black text-emerald-400 tracking-widest drop-shadow-[0_0_40px_#10b981]">+{rewardAmount}</div>
                <div className="text-5xl font-black text-white tracking-widest -mt-3">COINS</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shop Modal - includes $MT packs that call buyMT */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4" onClick={() => setShowShopModal(false)}>
          <div className="bg-zinc-950 border border-purple-600 rounded-3xl w-full max-w-[340px] max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* ... (shop content same as before, $MT packs call buyMT(amt)) */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-emerald-400 font-black tracking-widest">$MT PACKS (real on-chain)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[10,20,50,100,1000].map(amt => (
                  <button key={amt} onClick={() => buyMT(amt)}
                    className="bg-gradient-to-br from-orange-500 to-amber-600 hover:brightness-110 py-4 rounded-2xl text-white font-bold text-sm active:scale-95">
                    {amt} $MT<br/><span className="text-xs opacity-75">via Phantom</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Coin and energy packs remain in-game only */}
            {/* ... rest of shop unchanged ... */}
          </div>
        </div>
      )}

      {/* Other modals (ad, daily) unchanged from your original */}
      {/* ... (keep the ad and daily calendar modals as-is) */}
    </main>
  );
}
