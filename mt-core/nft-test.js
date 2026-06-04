const axios = require('axios');
const { generateKeypair, signTx } = require('./crypto');

const NODE = 'http://localhost:4001';

async function run() {
  const user = generateKeypair();

  await axios.post(`${NODE}/faucet`, { address: user.publicKey });

  const tx = {
    type: 'NFT_MINT',
    from: user.publicKey,
    payload: {
      tokenId: 'companion_cat_001',
      owner: user.publicKey,
      metadata: {
        name: 'Pixel Cat',
        rarity: 'Common',
        emoji: '🐱',
      },
    },
    timestamp: Date.now(),
  };

  tx.signature = signTx(tx, user.secretKey);

  await axios.post(`${NODE}/tx`, tx);

  const nfts = await axios.get(`${NODE}/nfts/${user.publicKey}`);
  console.log(nfts.data);
}

run();
