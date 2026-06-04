/**
 * MT Auth Service
 * Self-built account system for MT ECO SYSTEM.
 * - Email + Phone signup & login
 * - Password hashed (bcrypt)
 * - Encrypted wallet backups (NEVER decrypt on server)
 * - Supports multiple wallets per account
 * - Cross-device access: login anywhere, restore your encrypted wallets
 *
 * Security: Seeds/mnemonics are encrypted client-side before backup.
 * We only store ciphertext + user profile.
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4002;

const rawCors = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://wallet.futuret3ch.com.au,https://infinite-wallet.vercel.app,https://api.futuret3ch.com.au,https://auth.futuret3ch.com.au,https://*.vercel.app';
const CORS_ORIGINS = rawCors.split(',').map(s => s.trim()).filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true; // allow curl, health checks, non-browser, same-origin etc.
  if (CORS_ORIGINS.includes(origin)) return true;
  // Support any Vercel preview or custom domain ending in vercel.app (so new hashes like -msue3u5bt- work without editing .env every time)
  if (/^https?:\/\/[a-z0-9.-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BACKUPS_FILE = path.join(DATA_DIR, 'backups.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json({ limit: '1mb' }));

// In-memory stores (will be persisted to JSON)
const users = new Map(); // email -> user
const phoneToEmail = new Map(); // phone -> email for lookup
const sessions = new Map(); // token -> { userId, email }
const backups = new Map(); // userId -> array of {id, name, encryptedData, address, createdAt }

// Demo verification codes (for live demo without real email/SMS yet)
const pendingVerifications = new Map(); // email -> { code, userData }

/**
 * Simple file persistence for auth (good for small VPS deployments like Contabo)
 */
function loadAuthData() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const u = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      for (const [k, v] of Object.entries(u)) users.set(k, v);
    }
    if (fs.existsSync(BACKUPS_FILE)) {
      const b = JSON.parse(fs.readFileSync(BACKUPS_FILE, 'utf8'));
      for (const [k, v] of Object.entries(b)) backups.set(k, v);
    }
    // Rebuild phoneToEmail
    for (const user of users.values()) {
      if (user.phone) phoneToEmail.set(user.phone, user.email);
    }
    console.log(`[mt-auth] Loaded ${users.size} users from disk`);
  } catch (e) {
    console.warn('[mt-auth] Could not load persisted data:', e.message);
  }
}

function saveAuthData() {
  try {
    const uObj = {};
    for (const [k, v] of users) uObj[k] = v;
    fs.writeFileSync(USERS_FILE, JSON.stringify(uObj, null, 2));

    const bObj = {};
    for (const [k, v] of backups) bObj[k] = v;
    fs.writeFileSync(BACKUPS_FILE, JSON.stringify(bObj, null, 2));
  } catch (e) {
    console.error('[mt-auth] Failed to save data:', e.message);
  }
}

function setupAuthPersistence() {
  loadAuthData();
  setInterval(saveAuthData, 30000);
  const shutdown = () => { saveAuthData(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

setupAuthPersistence();

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

function verifyPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash);
}

function generateDemoCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Health
 */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'MT Auth',
    users: users.size,
    time: Date.now(),
  });
});

/**
 * SIGNUP
 * email, phone, password required.
 * Returns demoVerificationCode for this live demo.
 * In production: send real email/SMS with code.
 */
app.post('/signup', async (req, res) => {
  const { email, phone, password } = req.body;

  if (!email || !phone || !password) {
    return res.status(400).json({ error: 'email, phone and password required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = phone.trim();

  if (users.has(normalizedEmail) || phoneToEmail.has(normalizedPhone)) {
    return res.status(409).json({ error: 'Account already exists with this email or phone' });
  }

  const code = generateDemoCode();
  pendingVerifications.set(normalizedEmail, {
    code,
    userData: { email: normalizedEmail, phone: normalizedPhone, passwordHash: hashPassword(password) },
  });

  // For live demo: we return the code so the UI can show it.
  // Real version would email/SMS it.
  console.log(`[MT-AUTH DEMO] Verification code for ${normalizedEmail} / ${normalizedPhone}: ${code}`);

  res.json({
    ok: true,
    message: 'Account created. Verify with the code sent to your email/phone.',
    demoVerificationCode: code, // REMOVE IN PRODUCTION - for live demo only
    needsVerification: true,
  });
});

/**
 * VERIFY
 * email + code
 */
app.post('/verify', (req, res) => {
  const { email, code } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();

  const pending = pendingVerifications.get(normalizedEmail);
  if (!pending || pending.code !== code) {
    return res.status(400).json({ error: 'Invalid or expired verification code' });
  }

  const { userData } = pending;
  const userId = uuidv4();

  const user = {
    id: userId,
    email: userData.email,
    phone: userData.phone,
    passwordHash: userData.passwordHash,
    createdAt: Date.now(),
    verified: true,
  };

  users.set(userData.email, user);
  phoneToEmail.set(userData.phone, userData.email);
  pendingVerifications.delete(normalizedEmail);

  // Auto login
  const token = uuidv4();
  sessions.set(token, { userId, email: userData.email });

  res.json({
    ok: true,
    message: 'Account verified and activated.',
    token,
    user: { id: user.id, email: user.email, phone: user.phone },
  });
});

/**
 * LOGIN
 */
app.post('/login', (req, res) => {
  const { emailOrPhone, password } = req.body;
  if (!emailOrPhone || !password) {
    return res.status(400).json({ error: 'email/phone and password required' });
  }

  let email = emailOrPhone.toLowerCase().trim();
  if (phoneToEmail.has(emailOrPhone.trim())) {
    email = phoneToEmail.get(emailOrPhone.trim());
  }

  const user = users.get(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = uuidv4();
  sessions.set(token, { userId: user.id, email });

  res.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, phone: user.phone },
  });
});

/**
 * GET current user (from token)
 */
function getUserFromToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  return sessions.get(token);
}

app.get('/me', (req, res) => {
  const sess = getUserFromToken(req);
  if (!sess) return res.status(401).json({ error: 'Unauthorized' });

  const user = users.get(sess.email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ id: user.id, email: user.email, phone: user.phone });
});

/**
 * BACKUP / STORE encrypted wallet(s)
 * Client sends the already-encrypted vault data + a friendly name.
 */
app.post('/wallets/backup', (req, res) => {
  const sess = getUserFromToken(req);
  if (!sess) return res.status(401).json({ error: 'Unauthorized' });

  const { name, encryptedData, address } = req.body;
  if (!name || !encryptedData) {
    return res.status(400).json({ error: 'name and encryptedData required' });
  }

  if (!backups.has(sess.userId)) backups.set(sess.userId, []);

  const userBackups = backups.get(sess.userId);

  // Prevent exact duplicates by name
  const existing = userBackups.findIndex(w => w.name === name);
  const entry = {
    id: uuidv4(),
    name,
    encryptedData,
    address: address || null,
    createdAt: Date.now(),
  };

  if (existing >= 0) {
    userBackups[existing] = entry;
  } else {
    userBackups.push(entry);
  }

  res.json({ ok: true, wallet: entry });
});

/**
 * LIST user's backed up wallets
 */
app.get('/wallets', (req, res) => {
  const sess = getUserFromToken(req);
  if (!sess) return res.status(401).json({ error: 'Unauthorized' });

  const userBackups = backups.get(sess.userId) || [];
  // Return without the heavy encryptedData for list view? Or full.
  // For restore we need the encryptedData.
  res.json(userBackups.map(w => ({
    id: w.id,
    name: w.name,
    address: w.address,
    createdAt: w.createdAt,
    // encryptedData is included so client can restore immediately
    encryptedData: w.encryptedData,
  })));
});

/**
 * DELETE a backed up wallet
 */
app.delete('/wallets/:id', (req, res) => {
  const sess = getUserFromToken(req);
  if (!sess) return res.status(401).json({ error: 'Unauthorized' });

  const userBackups = backups.get(sess.userId) || [];
  const idx = userBackups.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Wallet not found' });

  userBackups.splice(idx, 1);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`🔐 MT Auth service running on http://0.0.0.0:${PORT}`);
  console.log('Supports email + phone signup, multiple wallets per user, encrypted cross-device backup.');
  console.log('💾 Persistence: using JSON files in', DATA_DIR);
  console.log('DEMO MODE: verification codes are returned in /signup response for testing. (Remove for real prod)');
});
