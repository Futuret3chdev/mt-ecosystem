// mt-protocol/proof.js
const crypto = require('crypto');

/**
 * =========================
 * In-memory used proof set
 * (later: DB / Merkle root)
 * =========================
 */
const usedProofs = new Set();

/**
 * =========================
 * Validate bridge proof
 * =========================
 */
function verifyBridgeProof(proof, authorisedSigners) {
  if (!proof) {
    throw new Error('Missing proof');
  }

  const {
    asset,
    fromChain,
    toChain,
    amount,
    burnTx,
    signer,
    timestamp,
    signature,
  } = proof;

  // Basic structure checks
  if (
    asset !== 'MT' ||
    fromChain !== 'solana' ||
    toChain !== 'mt-chain'
  ) {
    throw new Error('Invalid bridge asset or chain');
  }

  if (!burnTx || !signer || !signature) {
    throw new Error('Incomplete bridge proof');
  }

  // Prevent replay
  if (usedProofs.has(burnTx)) {
    throw new Error('Proof already used');
  }

  // Check signer is authorised
  if (!authorisedSigners.includes(signer)) {
    throw new Error('Unauthorised bridge signer');
  }

  /**
   * =========================
   * Signature verification
   * (TEMP: stubbed for now)
   * =========================
   *
   * In Step 5 we will replace
   * this with real Solana
   * signature verification.
   */
  const hash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        asset,
        fromChain,
        toChain,
        amount,
        burnTx,
        timestamp,
      })
    )
    .digest('hex');

  if (signature !== hash) {
    throw new Error('Invalid bridge signature');
  }

  // Mark proof as used
  usedProofs.add(burnTx);

  return true;
}

module.exports = {
  verifyBridgeProof,
};
