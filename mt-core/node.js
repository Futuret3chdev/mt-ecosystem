const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { verifyTx, verifyMultisig } = require('./crypto');
const { applyTransaction, getAccount, accounts } = require('./ledger');
const { nfts, getNFTsByOwner, loadNFTs, getInternalNFTs } = require('./nfts');
const {
  getAllTxs,
  getTxByHash,
  getTxsByAddress,
  loadTxLog,
  getInternalTxLog,
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
 * CONFIG - Perfect for Contabo / self-hosted VPS
 * =========================
 */
const PORT = process.env.PORT || 4001;
const rawCors = process.env.CORS_ORIGINS || 'http://localhost:5173,https://wallet.futuret3ch.com.au,https://infinite-wallet.vercel.app,https://api.futuret3ch.com.au,https://auth.futuret3ch.com.au,https://*.vercel.app';
const CORS_ORIGINS = rawCors.split(',').map(s => s.trim()).filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true; // allow curl, health checks, non-browser, same-origin etc.
  if (CORS_ORIGINS.includes(origin)) return true;
  // Support any Vercel preview or custom domain ending in vercel.app (so new hashes like -msue3u5bt- work without editing .env every time)
  if (/^https?:\/\/[a-z0-9.-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const NFTS_FILE = path.join(DATA_DIR, 'nfts.json');
const TXLOG_FILE = path.join(DATA_DIR, 'txlog.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * =========================
 * SIMPLE PERSISTENCE (JSON files)
 * Load on boot, save every 30s + on shutdown.
 * This is the minimum you need before launching on Contabo.
 * Later you can swap to SQLite/Postgres.
 * =========================
 */
function loadState() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
      Object.assign(accounts, saved);
      console.log(`[mt-core] Loaded ${Object.keys(accounts).length} accounts from ${ACCOUNTS_FILE}`);
    }
  } catch (e) {
    console.warn('[mt-core] Could not load accounts:', e.message);
  }

  try {
    if (fs.existsSync(NFTS_FILE)) {
      const savedNFTs = JSON.parse(fs.readFileSync(NFTS_FILE, 'utf8'));
      loadNFTs(savedNFTs);
      console.log(`[mt-core] Loaded NFTs from ${NFTS_FILE}`);
    }
  } catch (e) {
    console.warn('[mt-core] Could not load NFTs:', e.message);
  }

  try {
    if (fs.existsSync(TXLOG_FILE)) {
      const savedTxLog = JSON.parse(fs.readFileSync(TXLOG_FILE, 'utf8'));
      loadTxLog(savedTxLog);
      console.log(`[mt-core] Loaded ${getAllTxs().length} txs from ${TXLOG_FILE}`);
    }
  } catch (e) {
    console.warn('[mt-core] Could not load txlog:', e.message);
  }
}

function saveState() {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  } catch (e) {
    console.error('[mt-core] Failed to persist accounts:', e.message);
  }

  try {
    fs.writeFileSync(NFTS_FILE, JSON.stringify(getInternalNFTs(), null, 2));
  } catch (e) {
    console.error('[mt-core] Failed to persist NFTs:', e.message);
  }

  try {
    fs.writeFileSync(TXLOG_FILE, JSON.stringify(getInternalTxLog(), null, 2));
  } catch (e) {
    console.error('[mt-core] Failed to persist txlog:', e.message);
  }
}

function setupPersistence() {
  loadState();

  setInterval(saveState, 30000); // every 30 seconds

  const shutdown = () => {
    console.log('[mt-core] Shutting down, saving state...');
    saveState();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

setupPersistence();

/**
 * =========================
 * NETWORK IDENTITY
 * =========================
 */
const NETWORK_NAME = process.env.NETWORK_NAME || 'MT Private Network';
const NETWORK_ID = process.env.NETWORK_ID || 'mt-private-1';

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
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(bodyParser.json({ limit: '10mb' })); // must be >= nginx client_max_body_size for NFT image data URLs in /tx mints

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
app.post('/tx', async (req, res) => {
  const { signature, signatures, ...unsignedTx } = req.body;

  /**
   * ===== PROOF-BASED MINT =====
   * (NO WALLET SIGNATURES)
   */
  if (unsignedTx.type === 'MINT_FROM_PROOF') {
    try {
      await applyTransaction(req.body);
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
    await applyTransaction(req.body);
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
const server = app.listen(PORT, () => {
  console.log(`🟢 MT Node running at http://0.0.0.0:${PORT}`);
  console.log(`🌐 Network: ${NETWORK_NAME} (${NETWORK_ID})`);
  console.log(`💰 Total Supply: ${TOTAL_SUPPLY.toLocaleString()} MT`);
  console.log(
    `🔐 Genesis: ${GENESIS_SIGNERS.length}-key multisig (${GENESIS_THRESHOLD} required)`
  );
  console.log(`🔒 Genesis Locked: ${GENESIS_LOCKED}`);
  console.log(`💸 Fixed TX Fee: ${TX_FEE} MT`);
  console.log(`💾 Persistence: ${ACCOUNTS_FILE}`);
  console.log(`🚰 Dev faucet: POST /faucet { "address": "..." }  (gives 1000 test MT)`);
  console.log(`🔗 Health: GET /health`);
});

server.on('error', (err) => {
  console.error('[mt-core] Server error:', err);
  process.exit(1);
});
