import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { getSettingValue } from '@/lib/rewards-db';

export const MT_MINT = new PublicKey('ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump');
export const MT_DECIMALS = 6;
export const TREASURY_PUBKEY = '35hMAzLD99oag1RUjBTNUoJuwqso4xvKEYsWHsvjskqD';

function rpcUrl() {
  return process.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
}

let cachedKeypair: Keypair | null | undefined;

function keypairFromRaw(raw: string): Keypair | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith('[')) {
      const arr = JSON.parse(trimmed) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    }
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch (e) {
    console.error('Invalid treasury private key material', e);
    return null;
  }
}

export async function getTreasuryKeypair(): Promise<Keypair | null> {
  if (cachedKeypair !== undefined) return cachedKeypair;

  const envRaw =
    process.env.REWARDS_TREASURY_PRIVATE_KEY ||
    process.env.REWARDS_TREASURY_SECRET_KEY ||
    '';
  if (envRaw.trim()) {
    cachedKeypair = keypairFromRaw(envRaw);
    return cachedKeypair;
  }

  const dbRaw = await getSettingValue('rewards_treasury_private_key');
  cachedKeypair = dbRaw ? keypairFromRaw(dbRaw) : null;
  return cachedKeypair;
}

export async function treasuryConfigured(): Promise<boolean> {
  const kp = await getTreasuryKeypair();
  return kp !== null;
}

async function accountExists(connection: Connection, address: PublicKey): Promise<boolean> {
  const info = await connection.getAccountInfo(address);
  return info !== null;
}

export async function sendMtFromTreasury(
  recipientWallet: string,
  amountMt: number
): Promise<{ signature: string; senderWallet: string }> {
  const treasury = await getTreasuryKeypair();
  if (!treasury) {
    throw new Error('Rewards treasury wallet is not configured on the server.');
  }
  if (amountMt <= 0) {
    throw new Error('Invalid claim amount.');
  }

  const connection = new Connection(rpcUrl(), 'confirmed');
  const sender = treasury.publicKey;
  const recipient = new PublicKey(recipientWallet);
  const transaction = new Transaction();

  const senderAta = await getAssociatedTokenAddress(
    MT_MINT,
    sender,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const recipientAta = await getAssociatedTokenAddress(
    MT_MINT,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  if (!(await accountExists(connection, recipientAta))) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        sender,
        recipientAta,
        recipient,
        MT_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const raw = BigInt(Math.round(amountMt * Math.pow(10, MT_DECIMALS)));
  if (raw <= BigInt(0)) throw new Error('Amount too small.');

  transaction.add(
    createTransferInstruction(senderAta, recipientAta, sender, raw, [], TOKEN_PROGRAM_ID)
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sender;
  transaction.sign(treasury);

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  });

  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

  return { signature, senderWallet: sender.toBase58() };
}