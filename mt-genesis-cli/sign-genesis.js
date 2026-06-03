/**
 * MT Genesis Offline Signer
 * =========================
 * Usage:
 *   node sign-genesis.js tx.json SECRET_KEY_BASE58
 */

const fs = require('fs');
const nacl = require('tweetnacl');
const bs58 = require('bs58').default;

const [, , txFile, secretKey58] = process.argv;

if (!txFile || !secretKey58) {
  console.error('Usage: node sign-genesis.js tx.json SECRET_KEY');
  process.exit(1);
}

const tx = JSON.parse(fs.readFileSync(txFile, 'utf8'));

if (tx.from !== 'MT_GENESIS') {
  throw new Error('Only genesis transactions allowed');
}

const secretKey = bs58.decode(secretKey58);
const message = Buffer.from(JSON.stringify(tx));

const signature = nacl.sign.detached(message, secretKey);

const result = {
  pubKey: bs58.encode(secretKey.slice(32)),
  signature: bs58.encode(signature),
};

console.log(JSON.stringify(result, null, 2));
