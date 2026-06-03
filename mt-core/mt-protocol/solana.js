/**
 * =====================================================
 * REAL SOLANA BURN VERIFIER (RPC)
 * =====================================================
 */

const {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');

/**
 * ⚠️ IMPORTANT:
 * Use MAINNET for real burns later.
 * For now we allow DEVNET testing.
 */
const SOLANA_RPC =
  'https://api.devnet.solana.com'; // change to mainnet later

const connection = new Connection(SOLANA_RPC, 'confirmed');

/**
 * Verify an SPL-token burn transaction
 */
async function verifySolanaBurn({ burnTx, mintAddress, amount }) {
  if (!burnTx || !mintAddress || !amount) {
    throw new Error('Incomplete Solana burn proof');
  }

  // Fetch transaction
  const tx = await connection.getParsedTransaction(burnTx, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    throw new Error('Solana transaction not found');
  }

  if (tx.meta?.err) {
    throw new Error('Solana transaction failed');
  }

  // Convert amount (MT has 9 decimals like SOL/SPL standard)
  const expectedAmount = BigInt(amount) * BigInt(10 ** 9);

  let burnFound = false;

  // Inspect instructions
  for (const ix of tx.transaction.message.instructions) {
    if (!ix.parsed) continue;

    const parsed = ix.parsed;

    // Look for SPL Token burn
    if (
      parsed.type === 'burn' &&
      parsed.info?.mint === mintAddress
    ) {
      const burned = BigInt(parsed.info.amount);

      if (burned !== expectedAmount) {
        throw new Error(
          `Burn amount mismatch: expected ${expectedAmount}, got ${burned}`
        );
      }

      burnFound = true;
    }
  }

  if (!burnFound) {
    throw new Error('No valid SPL burn found in transaction');
  }

  return demonstrateSuccess(burnTx);
}

/**
 * Optional audit logging
 */
function demonstrateSuccess(tx) {
  console.log('🔥 Solana burn verified:', tx);
  return true;
}

module.exports = {
  verifySolanaBurn,
};
