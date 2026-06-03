const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const { verifyTx, verifyMultisig } = require('./crypto');
const { applyTransaction, getAccount, accounts } = require('./ledger');
const { nfts, getNFTsByOwner } = require('./nfts');
const {
  getAllTxs,
  getTxByHash,
  getTxsByAddress,
} = require('./txlog');

const {
  TX_FEE,
  GENESIS_ADDRESS,
  GENESIS_SIGNERS,
  GENESIS_THRESHOLD,
  TOTAL_SUPPLY,
  GENESIS_LOCKED,
} = require('./constants');

const app = express();

/**
 * =========================
 * NETWORK IDENTITY
 * =========================
 */
const NETWORK_NAME = 'MT Private Network';
const NETWORK_ID = 'mt-private-1';

/**
 * =========================
 * GENESIS INITIALIZATION
 * =========================
 */
if (!accounts[GENESIS_ADDRESS]) {
  accounts[GENESIS_ADDRESS] = {
    balance: TOTAL_SUPPLY,
    nonce: 0,
  };
}

/**
 * =========================
 * Middleware
 * =========================
 */
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(bodyParser.json({ limit: '1mb' }));

/**
 * =========================
 * Health Check
 * =========================
 */
app.get('/health', (_, res) => {
  res.json({
    ok: true,
    network: NETWORK_NAME,
    networkId: NETWORK_ID,
    txFee: TX_FEE,
    totalSupply: TOTAL_SUPPLY,
    genesisLocked: GENESIS_LOCKED,
    time: Date.now(),
  });
});

/**
 * =========================
 * Submit Transaction
 * =========================
 */
app.post('/tx', (req, res) => {
  const { signature, signatures, ...unsignedTx } = req.body;

  /**
   * ===== PROOF-BASED MINT =====
   * (NO WALLET SIGNATURES)
   */
  if (unsignedTx.type === 'MINT_FROM_PROOF') {
    try {
      applyTransaction(req.body);
      return res.json({ ok: true, fee: 0 });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * ===== BASIC VALIDATION =====
   */
  if (!unsignedTx.from) {
    return res.status(400).json({ error: 'Missing sender' });
  }

  /**
   * ===== GENESIS MULTISIG =====
   */
  if (unsignedTx.from === GENESIS_ADDRESS) {
    const validSigners = verifyMultisig(unsignedTx, signatures || []);
    const approved = validSigners.filter(pk =>
      GENESIS_SIGNERS.includes(pk)
    );

    if (approved.length < GENESIS_THRESHOLD) {
      return res.status(400).json({
        error: 'Genesis multisig threshold not met',
      });
    }
  }

  /**
   * ===== NORMAL WALLET SIGNATURE =====
   */
  if (unsignedTx.from !== GENESIS_ADDRESS) {
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    const valid = verifyTx(unsignedTx, signature, unsignedTx.from);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
  }

  /**
   * ===== APPLY TRANSACTION =====
   */
  try {
    applyTransaction(req.body);
    res.json({ ok: true, fee: TX_FEE });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * =========================
 * Account State
 * =========================
 */
app.get('/account/:address', (req, res) => {
  res.json(getAccount(req.params.address));
});

/**
 * =========================
 * DEV FAUCET (localhost only for testing)
 * Gives new wallets instant test $MT so you can try sends, NFT mints, etc.
 * In production this would be removed or heavily rate-limited.
 * =========================
 */
app.post('/faucet', (req, res) => {
  const { address } = req.body || {};
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'address (string) is required' });
  }

  const account = getAccount(address);
  const FAUCET_AMOUNT = 1000; // generous for local dev & testing

  account.balance += FAUCET_AMOUNT;

  // Record as a faucet tx for explorer visibility
  try {
    const { recordTx } = require('./txlog');
    recordTx({
      from: 'MT_FAUCET',
      to: address,
      amount: FAUCET_AMOUNT,
      type: 'FAUCET',
      nonce: null,
      timestamp: Date.now(),
    }, 0);
  } catch (_) {
    // txlog is optional; don't fail faucet if something odd
  }

  res.json({ ok: true, address, credited: FAUCET_AMOUNT, balance: account.balance });
});

/**
 * =========================
 * Explorer API
 * =========================
 */
app.get('/explorer/status', (_, res) => {
  res.json({
    network: NETWORK_ID,
    totalSupply: TOTAL_SUPPLY,
    txFee: TX_FEE,
    genesisLocked: GENESIS_LOCKED,
    accounts: Object.keys(accounts).length,
  });
});

app.get('/explorer/account/:address', (req, res) => {
  res.json(getAccount(req.params.address));
});

app.get('/explorer/txs', (_, res) => {
  res.json(getAllTxs());
});

app.get('/explorer/txs/:address', (req, res) => {
  res.json(getTxsByAddress(req.params.address));
});

app.get('/explorer/tx/:hash', (req, res) => {
  const tx = getTxByHash(req.params.hash);
  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(tx);
});

/**
 * =========================
 * NFTs (READ ONLY)
 * =========================
 */
app.get('/nfts', (_, res) => {
  res.json(nfts);
});

app.get('/nfts/:owner', (req, res) => {
  res.json(getNFTsByOwner(req.params.owner));
});

/**
 * =========================
 * Start MT Node
 * =========================
 */
app.listen(4000, () => {
  console.log('🟢 MT Node running at http://localhost:4000');
  console.log(`🌐 Network: ${NETWORK_NAME} (${NETWORK_ID})`);
  console.log(`💰 Total Supply: ${TOTAL_SUPPLY.toLocaleString()} MT`);
  console.log(
    `🔐 Genesis: ${GENESIS_SIGNERS.length}-key multisig (${GENESIS_THRESHOLD} required)`
  );
  console.log(`🔒 Genesis Locked: ${GENESIS_LOCKED}`);
  console.log(`💸 Fixed TX Fee: ${TX_FEE} MT`);
  console.log(`🚰 Dev faucet: POST http://localhost:4000/faucet { "address": "..." }  (gives 1000 test MT)`);
});
