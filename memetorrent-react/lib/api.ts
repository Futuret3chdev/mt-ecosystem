export type MTStatsRaw = {
  price: string;
  market_cap: string;
  total_supply: string;
};

export async function getTokenStats(): Promise<MTStatsRaw> {
  const res = await fetch(
    'https://futuret3ch.pythonanywhere.com/api/token-data',
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch token stats');
  }

  return res.json();
}
