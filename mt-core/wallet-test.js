const axios = require('axios');
const { generateKeypair, signTx } = require('./crypto');

const NODE = 'http://localhost:4001';

async function run() {
  const alice = generateKeypair();
  const bob = generateKeypair();

  console.log('Alice:', alice.publicKey);
  console.log('Bob:', bob.publicKey);

  await axios.post(`${NODE}/faucet`, { address: alice.publicKey });

  const tx = {
    version: 1,
    from: alice.publicKey,
    to: bob.publicKey,
    amount: 50,
    nonce: 0,
    timestamp: Date.now(),
  };

  tx.signature = signTx(tx, alice.secretKey);

  await axios.post(`${NODE}/tx`, tx);

  console.log('Alice state:', (await axios.get(`${NODE}/account/${alice.publicKey}`)).data);
  console.log('Bob state:', (await axios.get(`${NODE}/account/${bob.publicKey}`)).data);
}

run();
