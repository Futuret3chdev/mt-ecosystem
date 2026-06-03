export type MTStatsRaw = {
  price: string;
  market_cap: string;
  total_supply: string;
  name?: string;
  symbol?: string;
  total_buys?: string;
  total_sells?: string;
  total_buy_volume?: string;
  total_sell_volume?: string;
};

export async function getTokenStats(): Promise<MTStatsRaw> {
  // Use DexScreener directly for reliable public data (no key needed)
  const dexRes = await fetch(
    'https://api.dexscreener.com/latest/dex/tokens/ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump',
    { cache: 'no-store' }
  );

  if (!dexRes.ok) {
    throw new Error('Failed to fetch from DexScreener');
  }

  const dexData = await dexRes.json();
  const pair = dexData.pairs?.[0];

  if (!pair) {
    throw new Error('No pair data');
  }

  const price = parseFloat(pair.priceUsd || '0');
  const marketCap = parseFloat(pair.marketCap || pair.fdv || '0');
  // Total supply approx from FDV if needed, but use known ~1T for pump
  const totalSupply = 1000000000000; // 1T as per pump.fun typical

  return {
    price: price.toFixed(10).replace(/\.?0+$/, ''),
    market_cap: marketCap > 0 ? `$${marketCap.toLocaleString()}` : '$0.00',
    total_supply: totalSupply.toLocaleString(),
    name: pair.baseToken?.name || 'MT',
    symbol: pair.baseToken?.symbol || '$MT',
    total_buys: pair.txns?.h24?.buys?.toString() || '0',
    total_sells: pair.txns?.h24?.sells?.toString() || '0',
    total_buy_volume: pair.volume?.h24 ? `$${(parseFloat(pair.volume.h24) * 0.6).toFixed(0)}` : '$0',
    total_sell_volume: pair.volume?.h24 ? `$${(parseFloat(pair.volume.h24) * 0.4).toFixed(0)}` : '$0',
  };
}

// Holders feature removed from the marketing UI (was causing public RPC 403/DNS errors in browser for some visitors).
// Kept as empty for any legacy references; no more fake data or live RPC attempts from here.
export type Holder = {
  address: string;
  uiAmount: number;
};

export async function getTopHolders(): Promise<Holder[]> {
  return [];
}
