const {
  TX_FEE,
  GENESIS_ADDRESS,
  GENESIS_SIGNERS,
  GENESIS_THRESHOLD,
  GENESIS_LOCKED,
} = require('./constants');

const { mintNFT, transferNFT } = require('./nfts');
const { recordTx } = require('./txlog');

/**
 * =========================
 * In-memory ledger
 * =========================
 */
const accounts = {};

/**
 * Get or create account
 */
function getAccount(address) {
  if (!accounts[address]) {
    accounts[address] = {
      balance: 0,
      nonce: 0,
    };
  }
  return accounts[address];
}

/**
 * =========================
 * VALUE TRANSFER
 * =========================
 */
function applyValueTransaction(tx) {
  const sender = getAccount(tx.from);
  const receiver = getAccount(tx.to);

  // Enforce nonce (non-genesis only)
  if (tx.from !== GENESIS_ADDRESS) {
    if (tx.nonce !== sender.nonce) {
      throw new Error('Invalid nonce');
    }
  }

  const totalCost = tx.amount + TX_FEE;

  if (sender.balance < totalCost) {
    throw new Error('Insufficient balance');
  }

  sender.balance -= totalCost;
  receiver.balance += tx.amount;
  sender.nonce += 1;
}

/**
 * =========================
 * NFT TRANSACTIONS
 * =========================
 */
function applyNFTTransaction(tx) {
  if (!tx.payload) {
    throw new Error('Missing NFT payload');
  }

  if (tx.type === 'NFT_MINT') {
    mintNFT({
      tokenId: tx.payload.tokenId,
      owner: tx.payload.owner,
      metadata: tx.payload.metadata,
    });
    return;
  }

  if (tx.type === 'NFT_TRANSFER') {
    transferNFT({
      tokenId: tx.payload.tokenId,
      from: tx.from,
      to: tx.to,
    });
    return;
  }

  throw new Error('Unknown NFT transaction type');
}

/**
 * =========================
 * PROOF-BASED MINT
 * =========================
 * 🚫 TEMPORARILY DISABLED
 * =========================
 */
async function applyProofMint() {
  throw new Error(
    'Bridge minting disabled: Solana burn verification not implemented'
  );
}

/**
 * =========================
 * MAIN ENTRY POINT
 * =========================
 */
async function applyTransaction(tx) {
  const { from, type, signatures = [] } = tx;

  /**
   * 🔒 PERMANENT GENESIS LOCK
   */
  if (from === GENESIS_ADDRESS && GENESIS_LOCKED) {
    throw new Error('Genesis is permanently locked');
  }

  /**
   * 🚫 BLOCK PROOF MINT UNTIL VERIFIED
   */
  if (type === 'MINT_FROM_PROOF') {
    await applyProofMint(tx);
    return;
  }

  /**
   * 🚫 BLOCK ALL OTHER MINTS
   */
  if (type === 'MINT' || type === 'FAUCET') {
    throw new Error('Direct minting is disabled');
  }

  /**
   * ===== GENESIS MULTISIG (TRANSFERS ONLY) =====
   */
  if (from === GENESIS_ADDRESS) {
    if (!Array.isArray(signatures)) {
      throw new Error('Genesis tx requires multisig signatures');
    }

    const approved = new Set();

    for (const sig of signatures) {
      if (sig && GENESIS_SIGNERS.includes(sig.pubKey)) {
        approved.add(sig.pubKey);
      }
    }

    if (approved.size < GENESIS_THRESHOLD) {
      throw new Error('Insufficient genesis signatures');
    }
  }

  /**
   * ===== NFT TRANSACTIONS =====
   */
  if (type && type.startsWith('NFT_')) {
    applyNFTTransaction(tx);
    recordTx(tx, 0);
    return;
  }

  /**
   * ===== VALUE TRANSFER =====
   */
  applyValueTransaction(tx);
  recordTx(tx, TX_FEE);
}

module.exports = {
  getAccount,
  applyTransaction,
  accounts,
};
