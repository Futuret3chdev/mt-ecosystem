import { Transaction } from '@solana/web3.js';

export type WalletKind = 'phantom' | 'solflare' | 'backpack';

export type DirectWallet = {
  kind: WalletKind;
  provider: SolanaInjectedProvider;
};

type SolanaInjectedProvider = {
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  publicKey?: { toString(): string } | null;
  isPhantom?: boolean;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    phantom?: { solana?: SolanaInjectedProvider };
    solflare?: SolanaInjectedProvider;
    backpack?: SolanaInjectedProvider;
  }
}

function resolveProvider(kind: WalletKind): SolanaInjectedProvider {
  if (kind === 'phantom') {
    const provider = window.phantom?.solana;
    if (!provider && /iPhone|Android/i.test(navigator.userAgent)) {
      const url = window.location.href;
      window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(url)}`;
      throw new Error('Opening Phantom mobile…');
    }
    if (!provider?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      throw new Error('Phantom not installed');
    }
    return provider;
  }

  if (kind === 'solflare') {
    const provider = window.solflare;
    if (!provider && /iPhone|Android/i.test(navigator.userAgent)) {
      const url = window.location.href;
      window.location.href = `https://solflare.com/ul/browse/${encodeURIComponent(url)}`;
      throw new Error('Opening Solflare mobile…');
    }
    if (!provider) {
      window.open('https://solflare.com/', '_blank');
      throw new Error('Solflare not installed');
    }
    return provider;
  }

  const provider = window.backpack;
  if (!provider) {
    window.open('https://backpack.app/', '_blank');
    throw new Error('Backpack not installed');
  }
  return provider;
}

async function readPublicKey(provider: SolanaInjectedProvider, kind: WalletKind): Promise<string> {
  let pk = provider.publicKey;
  for (let i = 0; i < 5 && !pk; i++) {
    await new Promise((r) => setTimeout(r, 250));
    pk = provider.publicKey;
  }
  if (!pk) {
    const label = kind.charAt(0).toUpperCase() + kind.slice(1);
    throw new Error(`Failed to get public key from ${label}. Click Connect again.`);
  }
  return pk.toString();
}

/** Same connect flow as Lucky Reels — direct injected wallet, no wallet-adapter. */
export async function connectDirectWallet(kind: WalletKind): Promise<{ address: string; wallet: DirectWallet }> {
  const provider = resolveProvider(kind);
  try {
    await provider.connect();
  } catch (e) {
    console.warn('wallet connect retry', e);
  }
  const address = await readPublicKey(provider, kind);
  return { address, wallet: { kind, provider } };
}

export async function disconnectDirectWallet(wallet: DirectWallet | null) {
  if (!wallet?.provider?.disconnect) return;
  try {
    await wallet.provider.disconnect();
  } catch {}
}

export async function signWithDirectWallet(
  wallet: DirectWallet,
  transaction: Transaction
): Promise<Transaction> {
  if (!wallet.provider.signTransaction) {
    throw new Error('Wallet does not support signTransaction');
  }
  return wallet.provider.signTransaction(transaction);
}

export function onDirectWalletAccountChange(
  wallet: DirectWallet | null,
  onAddress: (address: string | null) => void
) {
  if (!wallet?.provider?.on) return () => {};
  const handler = (...args: unknown[]) => {
    const pk = args[0] as { toString(): string } | null | undefined;
    onAddress(pk ? pk.toString() : null);
  };
  wallet.provider.on('accountChanged', handler);
  wallet.provider.on('disconnect', () => onAddress(null));
  return () => {};
}