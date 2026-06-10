import { Connection, PublicKey } from '@solana/web3.js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  if (!address) {
    return Response.json({ error: 'address required' }, { status: 400 });
  }
  const rpcUrl = process.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  try {
    const lamports = await connection.getBalance(new PublicKey(address));
    return Response.json({ lamports });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
