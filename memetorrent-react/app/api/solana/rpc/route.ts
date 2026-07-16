import { getSolanaRpcUrl } from '@/lib/solana-rpc';

const ALLOWED_METHODS = new Set([
  'getAccountInfo',
  'getBalance',
  'getBlockHeight',
  'getEpochInfo',
  'getLatestBlockhash',
  'getMinimumBalanceForRentExemption',
  'getSignatureStatuses',
  'getSlot',
  'getTokenAccountBalance',
  'getVersion',
  'simulateTransaction',
]);

export async function POST(request: Request) {
  let payload: { method?: string; params?: unknown[]; id?: number | string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON-RPC body' }, { status: 400 });
  }

  const method = String(payload?.method || '');
  if (!method || !ALLOWED_METHODS.has(method)) {
    return Response.json({ error: `RPC method not allowed: ${method || '(missing)'}` }, { status: 403 });
  }

  const upstream = getSolanaRpcUrl();
  try {
    const res = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: payload.id ?? 1,
        method,
        params: payload.params ?? [],
      }),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'rpc_proxy_failed' }, { status: 502 });
  }
}