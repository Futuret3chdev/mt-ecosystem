/**
 * =====================================================
 * MT BRIDGE PROOF VERIFIER (SOLANA → MT)
 * =====================================================
 */

const { verifySolanaBurn } = require('./solanaVerify');

// In-memory replay protection (replace with DB later)
const usedProofs = new Set();

/**
 * Verify bridge proof
 * @param {Object} proof
 * @param {string[]} authorisedSigners
 */
async function verifyBridgeProof(proof, authorisedSigners) {
  if (!proof) {
    throw new Error('Missing bridge proof');
  }

  const {
    asset,
    fromChain,
    toChain,
    amount,
    burnTx,
    signer,
    timestamp,
    mintAddress,
  } = proof;

  /**
   * =========================
   * ROUTE VALIDATION
   * =========================
   */
  if (asset !== 'MT') {
    throw new Error('Invalid asset');
  }

  if (fromChain !== 'solana' || toChain !== 'mt-chain') {
    throw new Error('Invalid bridge route');
  }

  /**
   * =========================
   * BASIC SANITY CHECKS
   * =========================
   */
  if (!burnTx || typeof burnTx !== 'string') {
    throw new Error('Invalid burn transaction');
  }

  if (!mintAddress || typeof mintAddress !== 'string') {
    throw new Error('Invalid mint address');
  }

  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }

  /**
   * =========================
   * AUTHORISED SIGNER
   * =========================
   */
  if (!authorisedSigners.includes(signer)) {
    throw new Error('Unauthorised bridge signer');
  }

  /**
   * =========================
   * REPLAY PROTECTION
   * =========================
   */
  if (usedProofs.has(burnTx)) {
    throw new Error('Bridge proof already consumed');
  }

  /**
   * =========================
   * SOLANA BURN VERIFICATION
   * =========================
   * This MUST throw if:
   * - tx not found
   * - not a burn
   * - wrong mint
   * - wrong amount
   */
  await verifySolanaBurn({
    burnTx,
    mintAddress,
    amount,
  });

  /**
   * =========================
   * MARK AS CONSUMED
   * =========================
   */
  usedProofs.add(burnTx);

  return true;
}

module.exports = {
  verifyBridgeProof,
};
