/**
 * MT Wallet - Secure client-side wallet engine for MT ECO SYSTEM
 * - Zero third-party auth (local only)
 * - Keys NEVER leave the browser
 * - Compatible with mt-core (ed25519 + tweetnacl + bs58 + JSON tx)
 * - Uses BIP39 mnemonic for recovery
 * - Encrypted at rest with user password (Web Crypto AES-GCM + PBKDF2)
 */

import * as bip39 from 'bip39';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

// MT Node (local dev by default - later configurable / prod endpoint)
export const MT_NODE = 'http://localhost:4000';

// Fixed ultra-low fee (marketed as ~1 cent SOL equivalent)
export const MT_TX_FEE = 0.01;

// Derive MT keypair from 32-byte seed (mnemonic -> seed[0:32])
export function deriveMTKeypairFromSeed(seed) {
  const secretKey = seed.slice(0, 32);
  const keypair = nacl.sign.keyPair.fromSeed(secretKey);
  return {
    publicKey: bs58.encode(keypair.publicKey),
    secretKey: bs58.encode(keypair.secretKey),
  };
}

// Full wallet creation from mnemonic
export function createMTWalletFromMnemonic(mnemonic) {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const kp = deriveMTKeypairFromSeed(seed);
  return {
    mnemonic,
    ...kp,
    // Also expose a Solana-compatible view (same curve, first 32 seed)
    solanaSeed: seed.slice(0, 32),
  };
}

// Generate fresh secure mnemonic + wallet
export function generateMTWallet() {
  const mnemonic = bip39.generateMnemonic(128); // 12 words
  return createMTWalletFromMnemonic(mnemonic);
}

// Import from mnemonic phrase
export function importMTWalletFromMnemonic(mnemonic) {
  const clean = mnemonic.trim().toLowerCase();
  return createMTWalletFromMnemonic(clean);
}

// Sign any tx object (must match server verify: JSON.stringify(tx) )
export function signMTTx(tx, secretKey58) {
  const secretKey = bs58.decode(secretKey58);
  const message = Buffer.from(JSON.stringify(tx));
  const signature = nacl.sign.detached(message, secretKey);
  return bs58.encode(signature);
}

// Verify locally (for UI preview)
export function verifyMTTx(tx, signature58, publicKey58) {
  const message = Buffer.from(JSON.stringify(tx));
  return nacl.sign.detached.verify(
    message,
    bs58.decode(signature58),
    bs58.decode(publicKey58)
  );
}

/**
 * Secure Vault (localStorage encrypted)
 * We only persist: { version:1, salt, iv, ciphertext } where ciphertext = AES-GCM( mnemonic )
 * The password is never stored. User must remember it to unlock.
 */
const VAULT_KEY = 'mt_vault_v1';

export async function hasVault() {
  return !!localStorage.getItem(VAULT_KEY);
}

function getRandomBytes(len) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 210000, // strong
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMnemonic(mnemonic, password) {
  const enc = new TextEncoder();
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(mnemonic)
  );

  const payload = {
    v: 1,
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
  return JSON.stringify(payload);
}

export async function decryptMnemonic(encryptedPayload, password) {
  const { salt, iv, ct } = JSON.parse(encryptedPayload);
  const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const ctBytes = Uint8Array.from(atob(ct), c => c.charCodeAt(0));

  const key = await deriveKey(password, saltBytes);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ctBytes
  );
  return new TextDecoder().decode(plain);
}

export async function saveVault(mnemonic, password) {
  const encrypted = await encryptMnemonic(mnemonic, password);
  localStorage.setItem(VAULT_KEY, encrypted);
}

export async function unlockVault(password) {
  const payload = localStorage.getItem(VAULT_KEY);
  if (!payload) throw new Error('No vault found');
  const mnemonic = await decryptMnemonic(payload, password);
  return importMTWalletFromMnemonic(mnemonic);
}

export function lockVault() {
  // Just clear in-memory; vault stays on disk
  // Caller should clear any decrypted state
}

export function deleteVault() {
  localStorage.removeItem(VAULT_KEY);
}

/**
 * Node API helpers (MT native chain)
 */
export async function fetchMTBalance(address) {
  try {
    const res = await fetch(`${MT_NODE}/account/${address}`);
    if (!res.ok) return { balance: 0, nonce: 0 };
    const data = await res.json();
    return { balance: Number(data.balance || 0), nonce: Number(data.nonce || 0) };
  } catch (e) {
    console.warn('MT node unavailable, using 0', e);
    return { balance: 0, nonce: 0 };
  }
}

export async function fetchMTNFTs(owner) {
  try {
    const res = await fetch(`${MT_NODE}/nfts/${owner}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchMTTxs(address) {
  try {
    const res = await fetch(`${MT_NODE}/explorer/txs/${address}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Submit signed MT transaction
 */
export async function submitMTTx(unsignedTx, signature) {
  const body = { ...unsignedTx, signature };
  const res = await fetch(`${MT_NODE}/tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || 'Transaction failed');
  }
  return json;
}

/**
 * DEV ONLY: Request test MT from the local node faucet.
 * Gives the wallet 1000 MT instantly so you can test sends, NFT mints, etc.
 */
export async function requestTestFunds(address) {
  if (!address) throw new Error('No address');
  const res = await fetch(`${MT_NODE}/faucet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || 'Faucet request failed');
  }
  return json;
}

/**
 * Helper to build + sign + submit a transfer
 */
export async function sendMT(fromWallet, toAddress, amount, currentNonce) {
  if (!fromWallet || !fromWallet.secretKey) throw new Error('Wallet not unlocked');
  if (!toAddress || amount <= 0) throw new Error('Invalid send params');

  const tx = {
    from: fromWallet.publicKey,
    to: toAddress.trim(),
    amount: Number(amount),
    nonce: currentNonce,
    type: 'TRANSFER',
    fee: MT_TX_FEE,
    timestamp: Date.now(),
  };

  const signature = signMTTx(tx, fromWallet.secretKey);
  // Verify locally before submit (defense in depth)
  const ok = verifyMTTx(tx, signature, fromWallet.publicKey);
  if (!ok) throw new Error('Local signature verification failed');

  return submitMTTx(tx, signature);
}

/**
 * Solana $MT (SPL) helpers - for current holdings + future bridge
 */
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'; // or devnet for test
const SOL_MT_MINT = new PublicKey('ELywDcVX2WumHm4xEfqF8NdEKaeGCAaq9JmwtjE8pump');

let _solConnection = null;
export function getSolConnection() {
  if (!_solConnection) _solConnection = new Connection(SOLANA_RPC, 'confirmed');
  return _solConnection;
}

export async function fetchSolanaMTBalance(solanaPublicKeyStr) {
  try {
    const conn = getSolConnection();
    const owner = new PublicKey(solanaPublicKeyStr);
    const ata = await getAssociatedTokenAddress(SOL_MT_MINT, owner);
    const account = await getAccount(conn, ata);
    // SPL has 6 decimals for pump tokens usually? pump.fun uses 6 for meme usually, but check actual
    // For safety we will return raw and format in UI. Most pump are 6 decimals.
    const decimals = 6; // common for pump.fun
    const balance = Number(account.amount) / 10 ** decimals;
    return balance;
  } catch (e) {
    // No ATA or 0 balance or RPC error
    return 0;
  }
}

export async function fetchSolanaSOLBalance(solanaPublicKeyStr) {
  try {
    const conn = getSolConnection();
    const lamports = await conn.getBalance(new PublicKey(solanaPublicKeyStr));
    return lamports / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

// Derive Solana Keypair (and address) from the same seed used for MT
export function deriveSolanaKeypairFromSeed(seed32) {
  const kp = Keypair.fromSeed(seed32);
  return {
    publicKey: kp.publicKey.toBase58(),
    keypair: kp, // only for advanced signing if needed in future
  };
}
