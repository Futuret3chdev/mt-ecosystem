import { NextRequest } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-security';

/** Team treasury pubkeys staff may pay rewards from (configure in Vercel env). */
const DEFAULT_WALLETS = [
  {
    id: 'rewards',
    label: 'Rewards treasury ($MT claims)',
    address: '35hMAzLD99oag1RUjBTNUoJuwqso4xvKEYsWHsvjskqD',
  },
  {
    id: 'community',
    label: 'Community / donations pool',
    address: '2apinmLPU1myd4aeM6ZdZNLkhqBBUfGSMrxy7xkRBsZu',
  },
];

function parseEnvWallets(): typeof DEFAULT_WALLETS {
  const raw = process.env.STAFF_REWARD_WALLETS;
  if (!raw) return DEFAULT_WALLETS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return DEFAULT_WALLETS;
}

export async function GET(request: NextRequest) {
  const denied = requireAdminApiAccess(request);
  if (denied) return denied;

  return Response.json({
    wallets: parseEnvWallets(),
    hint: 'Connect the wallet app that holds the private key for your chosen treasury address.'
  });
}