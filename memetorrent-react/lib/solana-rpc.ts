const HELIUS_RPC =
  'https://mainnet.helius-rpc.com/?api-key=61a3cb76-ffd8-4dde-bb49-35cae29566c8';

/** Server-side Solana RPC — prefers Helius, falls back to public mainnet. */
export function getSolanaRpcUrl(): string {
  return (
    process.env.VITE_SOLANA_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    HELIUS_RPC ||
    'https://api.mainnet-beta.solana.com'
  );
}