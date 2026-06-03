const axios = require('axios');

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

/**
 * Verify a burn transaction on Solana
 */
async function verifySolanaBurn({
  burnTx,
  mintAddress,
  amount,
  burner,
}) {
  const res = await axios.post(SOLANA_RPC, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getTransaction',
    params: [
      burnTx,
      { encoding: 'jsonParsed' },
    ],
  });

  const tx = res.data.result;
  if (!tx) {
    throw new Error('Solana tx not found');
  }

  // TODO (Step 6.2):
  // - check token mint
  // - check burn instruction
  // - check amount
  // - check signer

  return true; // temporary pass-through
}

module.exports = { verifySolanaBurn };
