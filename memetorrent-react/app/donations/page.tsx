'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOL_ADDRESS = '2apinmLPU1myd4aeM6ZdZNLkhqBBUfGSMrxy7xkRBsZu';
const BTC_ADDRESS = 'bc1qtuyjn27ggdu080rlrpf90tn239hgcxc2h295rv';
const ETH_ADDRESS = '0x47c3F0388fDcF30156Bd98bcc370828d022E18f6';
const MT_MINT = 'ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump';

export default function DonationsPage() {
  const { publicKey, sendTransaction, connected, connect, disconnect, select } = useWallet();
  const { connection: adapterConnection } = useConnection();

  // Use a dedicated public RPC for client-side submission (sendRawTransaction).
  // Blockhash and balance are fetched via our API routes (server-side) to avoid 403 from client-side RPC calls.
  const donationConnection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  const [selectedAsset, setSelectedAsset] = useState<'SOL' | 'BTC' | 'ETH'>('SOL');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string>('');

  // MT Cards counter state
  const [totalCards, setTotalCards] = useState(10);
  const [totalValueAUD, setTotalValueAUD] = useState(0);

  const addresses = {
    SOL: SOL_ADDRESS,
    BTC: BTC_ADDRESS,
    ETH: ETH_ADDRESS,
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} address copied!`);
  };

  // Live calculation for MT Cards based on donation wallet values in AUD
  useEffect(() => {
    const fetchDonationValue = async () => {
      try {
        // SOL balance via our server-side proxy (avoids client-side 403 on RPC)
        const solRes = await fetch(`/api/solana/balance?address=${SOL_ADDRESS}`);
        const solData = await solRes.json();
        if (solData.error) throw new Error(solData.error);
        const solBal = solData.lamports / LAMPORTS_PER_SOL;

        // BTC balance via Blockstream (public, no key needed)
        const btcRes = await fetch(`https://blockstream.info/api/address/${BTC_ADDRESS}`);
        const btcData = await btcRes.json();
        const btcBal = (btcData.chain_stats.funded_txo_sum - btcData.chain_stats.spent_txo_sum) / 1e8;

        // ETH balance via Blockscout (public)
        const ethRes = await fetch(`https://eth.blockscout.com/api?module=account&action=balance&address=${ETH_ADDRESS}`);
        const ethData = await ethRes.json();
        const ethBal = parseInt(ethData.result || '0') / 1e18;

        // Prices in AUD from CoinGecko
        const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=aud');
        const prices = await priceRes.json();

        const solAud = solBal * (prices.solana?.aud || 0);
        const btcAud = btcBal * (prices.bitcoin?.aud || 0);
        const ethAud = ethBal * (prices.ethereum?.aud || 0);

        const combinedAUD = solAud + btcAud + ethAud;
        setTotalValueAUD(combinedAUD);

        const cardsFromDonations = Math.floor(combinedAUD / 100);
        setTotalCards(10 + Math.max(0, cardsFromDonations));
      } catch (e) {
        console.error('Failed to calculate live donation value for MT Cards counter', e);
        // fallback to minimum 10
        setTotalCards(10);
        setTotalValueAUD(0);
      }
    };

    fetchDonationValue();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDonationValue, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [donationConnection]);

  const handleTransfer = async () => {
    if (!connected || !publicKey || !sendTransaction) {
      alert('Please connect your Solana wallet first.');
      return;
    }

    if (selectedAsset !== 'SOL') {
      alert(`For ${selectedAsset}, please copy the address above and send from your external wallet.`);
      copyToClipboard(addresses[selectedAsset], selectedAsset);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setStatus('Preparing transaction...');
    setTxSignature('');

    try {
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
      const toPubkey = new PublicKey(SOL_ADDRESS);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey,
          lamports,
        })
      );

      // Get blockhash from our server-side proxy to avoid client 403 on RPC
      const blockhashRes = await fetch('/api/solana/blockhash');
      const blockhashData = await blockhashRes.json();
      if (blockhashData.error) throw new Error(blockhashData.error);
      const { blockhash, lastValidBlockHeight } = blockhashData;

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      setStatus('Please approve the transaction in your wallet...');

      const signature = await sendTransaction(transaction, donationConnection);
      setTxSignature(signature);

      setStatus('Confirming transaction...');

      await donationConnection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      }, 'confirmed');

      setStatus(`Success! Transferred ${amount} SOL to the donation address.`);
    } catch (err: any) {
      console.error(err);
      setStatus(`Transfer failed: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <main className="min-h-screen bg-black text-[#eef6ff] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="uppercase text-xs tracking-[3px] text-emerald-400 mb-3">SUPPORT THE ECOSYSTEM</div>
        <h1 className="text-4xl font-semibold tracking-[-1.5px] mb-4">Donations</h1>
        <p className="text-[#97a7c6] max-w-2xl mb-10">
          Help keep the MT Ecosystem fully self-built and self-hosted. All contributions go directly to infrastructure and development. 
          You can send directly or buy $MT as an alternative.
        </p>

        {/* MT Cards for those in need - new section with live counter */}
        <div className="bg-white/[0.015] border border-white/10 rounded-2xl p-8 mb-10">
          <div className="text-emerald-400 text-sm mb-2">MT CARDS FOR THOSE IN NEED</div>
          <p className="mb-4">
            For every $100 donated (combined AUD value across the SOL, BTC, and ETH donation wallets), we will give away one free MT Card later this year to people in need — pre-loaded with $MT tokens and exclusive NFT goodies.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div>
              <div className="text-5xl font-semibold text-emerald-400">{totalCards}</div>
              <div className="text-sm">MT Cards distributed so far<br />(including 10 seeded by us)</div>
            </div>
            <div className="text-xs text-[#97a7c6] max-w-xs">
              Current combined value in the donation wallets: <span className="font-medium text-white">~${totalValueAUD.toFixed(0)} AUD</span><br />
              Counter updates live from on-chain balances (refreshes every few minutes).
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Addresses with copy */}
          <div>
            <div className="text-sm font-medium mb-4 text-[#19d37e]">Donation Addresses (click to copy)</div>
            
            <div className="space-y-4">
              {Object.entries(addresses).map(([asset, addr]) => (
                <div key={asset} className="bg-white/[0.015] border border-white/10 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold">{asset}</div>
                    <button
                      onClick={() => copyToClipboard(addr, asset)}
                      className="text-xs px-3 py-1 rounded-xl border border-white/20 hover:bg-white/5"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="font-mono text-emerald-400 text-xs break-all select-all cursor-pointer" onClick={() => copyToClipboard(addr, asset)}>
                    {addr}
                  </div>
                </div>
              ))}

              {/* $MT alternative */}
              <div className="bg-white/[0.015] border border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold">$MT (buy to donate)</div>
                  <button
                    onClick={() => copyToClipboard(MT_MINT, '$MT')}
                    className="text-xs px-3 py-1 rounded-xl border border-white/20 hover:bg-white/5"
                  >
                    Copy
                  </button>
                </div>
                <div className="font-mono text-emerald-400 text-xs break-all select-all cursor-pointer" onClick={() => copyToClipboard(MT_MINT, '$MT')}>
                  {MT_MINT}
                </div>
                <div className="text-[10px] text-[#97a7c6] mt-1">Buy on pump.fun or any DEX and hold — counts as donation.</div>
              </div>
            </div>
          </div>

          {/* Transfer form */}
          <div>
            <div className="text-sm font-medium mb-4 text-[#19d37e]">Transfer Directly from Wallet</div>

            {!connected ? (
              <div className="mb-4">
                <div className="text-xs mb-2 text-[#97a7c6]">Connect your wallet to send SOL:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { 
                      select('Phantom' as any); 
                      // select updates state async, connect in next tick to avoid WalletNotSelectedError
                      setTimeout(() => connect(), 0); 
                    }}
                    className="px-4 py-2 text-sm rounded-2xl border border-white/20 hover:bg-white/5"
                  >
                    Connect Phantom
                  </button>
                  <button
                    onClick={() => { 
                      select('Solflare' as any); 
                      setTimeout(() => connect(), 0); 
                    }}
                    className="px-4 py-2 text-sm rounded-2xl border border-white/20 hover:bg-white/5"
                  >
                    Connect Solflare
                  </button>
                  <button
                    onClick={() => { 
                      select('Backpack' as any); 
                      setTimeout(() => connect(), 0); 
                    }}
                    className="px-4 py-2 text-sm rounded-2xl border border-white/20 hover:bg-white/5"
                  >
                    Connect Backpack
                  </button>
                </div>
                <div className="text-[10px] text-[#97a7c6] mt-1">Use the buttons above (same as in the buy panel) for reliable connection.</div>
              </div>
            ) : (
              <div className="mb-4 text-xs flex justify-between items-center">
                <span>Connected: <span className="font-mono text-emerald-400">{publicKey?.toBase58().slice(0, 6)}...{publicKey?.toBase58().slice(-4)}</span></span>
                <button onClick={() => disconnect()} className="text-[#ff5d5d] underline">Disconnect</button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1 text-[#97a7c6]">Asset</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value as any)}
                  className="w-full bg-[#0f1728] border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none"
                >
                  <option value="SOL">SOL (Solana) — direct transfer supported</option>
                  <option value="BTC">BTC (Bitcoin) — copy address above</option>
                  <option value="ETH">ETH (Ethereum) — copy address above</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-[#97a7c6]">Amount</label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={selectedAsset === 'SOL' ? '0.01' : 'Enter amount'}
                  className="w-full bg-[#0f1728] border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none"
                  disabled={selectedAsset !== 'SOL'}
                />
              </div>

              <button
                onClick={handleTransfer}
                disabled={!connected || !amount || selectedAsset !== 'SOL'}
                className="w-full py-3 rounded-2xl bg-emerald-400 text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedAsset === 'SOL' ? 'Transfer SOL from Wallet' : `Copy ${selectedAsset} Address & Send Manually`}
              </button>

              {status && (
                <div className="text-xs p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  {status}
                  {txSignature && (
                    <div className="mt-1">
                      <a 
                        href={`https://solscan.io/tx/${txSignature}`} 
                        target="_blank" 
                        className="text-emerald-400 underline"
                      >
                        View on Solscan →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 text-[10px] text-[#97a7c6]">
              Only SOL transfers are executed directly on this page. For BTC and ETH, use the copied addresses with your preferred wallet.
              All donations help keep everything self-hosted and third-party free.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
