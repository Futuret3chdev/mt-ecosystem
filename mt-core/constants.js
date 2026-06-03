module.exports = {
  // Ultra-low fixed fee. Marketed to users as "~1 cent of SOL equivalent".
  // On the native MT chain this is paid in MT (or subsidized in future).
  TX_FEE: 0.01,

  // ===== GENESIS =====
  GENESIS_ADDRESS: 'MT_GENESIS',
  TOTAL_SUPPLY: 1_000_000_000,

  GENESIS_SIGNERS: [
    'GENESIS_PUBKEY_1',
    'GENESIS_PUBKEY_2',
    'GENESIS_PUBKEY_3',
  ],

  GENESIS_THRESHOLD: 2,

  // ===== PERMANENT LOCK =====
  GENESIS_LOCKED: false, // 🔥 SET TO TRUE AFTER DISTRIBUTION
};
