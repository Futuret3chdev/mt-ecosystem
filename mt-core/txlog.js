const crypto = require('crypto');

let txLog = [];

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

/**
 * Load tx log from array (for persistence)
 */
function loadTxLog(savedLog) {
  if (Array.isArray(savedLog)) {
    txLog = savedLog;
  }
}

/**
 * Get internal log for saving
 */
function getInternalTxLog() {
  return txLog;
}

module.exports = {
  recordTx,
  getAllTxs,
  getTxByHash,
  getTxsByAddress,
  loadTxLog,
  getInternalTxLog,
};
