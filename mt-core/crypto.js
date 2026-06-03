const nacl = require('tweetnacl');
const bs58 = require('bs58').default;

/**
 * =========================
 * Keypair Generation
 * =========================
 */
function generateKeypair() {
  const kp = nacl.sign.keyPair();
  return {
    publicKey: bs58.encode(kp.publicKey),
    secretKey: bs58.encode(kp.secretKey),
  };
}

/**
 * =========================
 * Sign Transaction (Single Sig)
 * =========================
 */
function signTx(tx, secretKey58) {
  const secretKey = bs58.decode(secretKey58);
  const message = Buffer.from(JSON.stringify(tx));
  const signature = nacl.sign.detached(message, secretKey);
  return bs58.encode(signature);
}

/**
 * =========================
 * Verify Transaction (Single Sig)
 * =========================
 */
function verifyTx(tx, signature58, publicKey58) {
  const message = Buffer.from(JSON.stringify(tx));

  return nacl.sign.detached.verify(
    message,
    bs58.decode(signature58),
    bs58.decode(publicKey58)
  );
}

/**
 * =========================
 * Verify Multisig (Genesis Only)
 * =========================
 */
function verifyMultisig(tx, signatures = []) {
  const message = Buffer.from(JSON.stringify(tx));
  const validSigners = new Set();

  for (const entry of signatures) {
    const { signature, pubKey } = entry;
    if (!signature || !pubKey) continue;

    const ok = nacl.sign.detached.verify(
      message,
      bs58.decode(signature),
      bs58.decode(pubKey)
    );

    if (ok) {
      validSigners.add(pubKey);
    }
  }

  return [...validSigners];
}

module.exports = {
  generateKeypair,
  signTx,
  verifyTx,
  verifyMultisig,
};
