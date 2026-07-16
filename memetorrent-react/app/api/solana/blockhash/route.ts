import { Connection } from '@solana/web3.js';
import { getSolanaRpcUrl } from '@/lib/solana-rpc';

export async function GET() {
  const connection = new Connection(getSolanaRpcUrl(), 'confirmed');
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    return Response.json({ blockhash, lastValidBlockHeight });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
