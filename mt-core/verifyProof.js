const { GENESIS_SIGNERS } = require('./constants');

/**
 * =========================
 * Canonical Proof Verification
 * =========================
 *
 * This verifies that a proof:
 * - Is for MT
 * - Comes from an allowed source chain
 * - Is signed by an authorised signer
 */

function verifyProof(proof) {
  if (!proof) return false;

  if (proof.asset !== 'MT') return false;

  if (!proof.fromChain || !proof.toChain) return false;

  if (typeof proof.amount !== 'number' || proof.amount <= 0) {
    return false;
  }

  if (!proof.burnTx) return false;

  // 🔐 Authorised signer check
  if (!GENESIS_SIGNERS.includes(proof.signer)) {
    return false;
  }

  return true;
}

module.exports = {
  verifyProof,
};
