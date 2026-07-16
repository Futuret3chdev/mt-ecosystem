import { NextRequest } from 'next/server';

/** Legacy endpoint — claims now use prepare + user sign + confirm. */
export async function POST(request: NextRequest) {
  return Response.json(
    {
      error: 'use_prepare_confirm',
      message:
        'Claims require wallet approval. Use /api/claimable-rewards/claim/prepare then sign in your wallet.',
    },
    { status: 400 }
  );
}