export const MT_CONTRACT =
  'ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump';

export const LINKS = {
  raydium: `https://raydium.io/swap/?inputMint=sol&outputMint=${MT_CONTRACT}`,
  jupiter: `https://jup.ag/swap/SOL-${MT_CONTRACT}`,
  pumpfun: `https://pump.fun/coin/${MT_CONTRACT}`,
  wallet: 'https://wallet.futuret3ch.com.au/', // custom domain for the infinite-wallet vercel project; falls back to vercel.app if needed
  whitepaper: '/whitepaper.pdf',
  // Future self-hosted
  docs: '#',
  api: '#',
};
