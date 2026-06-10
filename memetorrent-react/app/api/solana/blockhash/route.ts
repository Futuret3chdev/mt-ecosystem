import { Connection } from '@solana/web3.js';

export async function GET() {
  const rpcUrl = process.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    return Response.json({ blockhash, lastValidBlockHeight });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
