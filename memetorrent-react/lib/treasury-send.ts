import {
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
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

const HELIUS_RPC =
  'https://mainnet.helius-rpc.com/?api-key=61a3cb76-ffd8-4dde-bb49-35cae29566c8';

function rpcCandidates(): string[] {
  return [
    process.env.VITE_SOLANA_RPC_URL,
    process.env.SOLANA_RPC_URL,
    HELIUS_RPC,
    'https://api.mainnet-beta.solana.com',
  ].filter((u): u is string => !!u && u.trim().length > 0);
}

async function getConnection(): Promise<Connection> {
  for (const url of rpcCandidates()) {
    try {
      const conn = new Connection(url, 'confirmed');
      await conn.getLatestBlockhash('confirmed');
      return conn;
    } catch (e) {
      console.warn('treasury RPC skip', url, (e as Error)?.message);
    }
  }
  return new Connection(HELIUS_RPC, 'confirmed');
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

export async function getTreasurySolBalance(): Promise<number> {
  const kp = await getTreasuryKeypair();
  if (!kp) return 0;
  const connection = await getConnection();
  const lamports = await connection.getBalance(kp.publicKey);
  return lamports / 1e9;
}

async function accountExists(connection: Connection, address: PublicKey): Promise<boolean> {
  const info = await connection.getAccountInfo(address);
  return info !== null;
}

async function formatSendError(connection: Connection, err: unknown): Promise<string> {
  if (err instanceof SendTransactionError) {
    try {
      const logs = await err.getLogs(connection);
      if (logs?.length) return `Transaction failed: ${logs.join(' | ')}`;
    } catch {}
    return err.message || 'Transaction send failed';
  }
  if (err instanceof Error) return err.message;
  return 'On-chain send failed';
}

export type PreparedClaimTx = {
  transactionBase64: string;
  blockhash: string;
  lastValidBlockHeight: number;
  needsAta: boolean;
  estimatedUserSol: number;
  senderWallet: string;
  amountMt: number;
};

/** User wallet pays network + ATA fees; treasury only authorizes the $MT transfer. */
export async function buildUserPaidClaimTransaction(
  recipientWallet: string,
  amountMt: number
): Promise<PreparedClaimTx> {
  const treasury = await getTreasuryKeypair();
  if (!treasury) {
    throw new Error('Rewards treasury wallet is not configured on the server.');
  }
  if (amountMt <= 0) {
    throw new Error('Invalid claim amount.');
  }

  const connection = await getConnection();
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

  const recipientHasAta = await accountExists(connection, recipientAta);
  if (!recipientHasAta) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        recipient,
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
  transaction.feePayer = recipient;
  transaction.partialSign(treasury);

  const simulation = await connection.simulateTransaction(transaction);
  if (simulation.value.err) {
    const logs = simulation.value.logs?.join(' | ') || JSON.stringify(simulation.value.err);
    throw new Error(`Simulation failed: ${logs}`);
  }

  return {
    transactionBase64: Buffer.from(
      transaction.serialize({ requireAllSignatures: false })
    ).toString('base64'),
    blockhash,
    lastValidBlockHeight,
    needsAta: !recipientHasAta,
    estimatedUserSol: recipientHasAta ? 0.000015 : 0.00205,
    senderWallet: sender.toBase58(),
    amountMt,
  };
}

export async function verifyClaimTransaction(
  signature: string,
  recipientWallet: string,
  amountMt: number
): Promise<boolean> {
  const connection = await getConnection();
  const treasury = await getTreasuryKeypair();
  if (!treasury) return false;

  const parsed = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });
  if (!parsed?.meta || parsed.meta.err) return false;

  const expectedRaw = BigInt(Math.round(amountMt * Math.pow(10, MT_DECIMALS)));
  const recipient = new PublicKey(recipientWallet);
  const recipientAta = await getAssociatedTokenAddress(
    MT_MINT,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  for (const inner of parsed.meta.innerInstructions || []) {
    for (const ix of inner.instructions) {
      if (
        'parsed' in ix &&
        ix.parsed?.type === 'transfer' &&
        ix.parsed?.info?.destination === recipientAta.toBase58()
      ) {
        const amt = BigInt(ix.parsed.info.amount || 0);
        if (amt === expectedRaw) return true;
      }
    }
  }

  const topLevel = parsed.transaction.message.instructions;
  for (const ix of topLevel) {
    if (
      'parsed' in ix &&
      ix.parsed?.type === 'transfer' &&
      ix.parsed?.info?.destination === recipientAta.toBase58()
    ) {
      const amt = BigInt(ix.parsed.info.amount || 0);
      if (amt === expectedRaw) return true;
    }
  }

  return false;
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

  const connection = await getConnection();
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

  const recipientHasAta = await accountExists(connection, recipientAta);
  if (!recipientHasAta) {
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

  const solBal = await connection.getBalance(sender);
  const minLamports = recipientHasAta ? 5000 : 2_500_000;
  if (solBal < minLamports) {
    throw new Error(
      `Treasury has ${(solBal / 1e9).toFixed(4)} SOL but needs ~${(minLamports / 1e9).toFixed(3)} SOL for fees` +
        (recipientHasAta ? '' : ' (includes creating recipient token account)') +
        `. Send SOL to ${sender.toBase58()} then try again.`
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

  const simulation = await connection.simulateTransaction(transaction);
  if (simulation.value.err) {
    const logs = simulation.value.logs?.join(' | ') || JSON.stringify(simulation.value.err);
    throw new Error(`Simulation failed: ${logs}`);
  }

  try {
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    return { signature, senderWallet: sender.toBase58() };
  } catch (err) {
    throw new Error(await formatSendError(connection, err));
  }
}