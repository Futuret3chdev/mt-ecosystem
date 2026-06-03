const crypto = require('crypto');

const txLog = [];

/**
 * Create deterministic transaction hash
 */
function hashTx(tx) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(tx))
    .digest('hex');
}

/**
 * Append tx to log (immutable)
 */
function recordTx(tx, fee) {
  const entry = {
    hash: hashTx(tx),
    from: tx.from,
    to: tx.to,
    amount: tx.amount || 0,
    type: tx.type || 'TRANSFER',
    nonce: tx.nonce ?? null,
    fee,
    time: Date.now(),
  };

  txLog.push(entry);
  return entry;
}

/**
 * Read helpers
 */
function getAllTxs() {
  return txLog;
}

function getTxByHash(hash) {
  return txLog.find(tx => tx.hash === hash);
}

function getTxsByAddress(address) {
  return txLog.filter(
    tx => tx.from === address || tx.to === address
  );
}

module.exports = {
  recordTx,
  getAllTxs,
  getTxByHash,
  getTxsByAddress,
};
