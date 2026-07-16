#!/usr/bin/env node
/**
 * Generate a TOTP secret for ONE admin. Run once per person.
 * Combine all secrets in Vercel / mt-admin-api .env (see output below).
 */
const path = require('path');
let authenticator;
try {
  ({ authenticator } = require('otplib'));
} catch {
  ({ authenticator } = require(path.join(__dirname, '../memetorrent-react/node_modules/otplib')));
}

const label = process.argv[2] || 'admin@memetorrent';
const secret = authenticator.generateSecret();
const issuer = encodeURIComponent('MemeTorrent Admin');
const labelEnc = encodeURIComponent(label);
const uri = `otpauth://totp/${issuer}:${labelEnc}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

console.log(`\n=== New admin: ${label} ===\n`);
console.log(`Secret: ${secret}\n`);

console.log('Option A — comma list (append to existing ADMIN_TOTP_SECRETS):');
console.log(`ADMIN_TOTP_SECRETS=EXISTING_SECRET_1,EXISTING_SECRET_2,${secret}\n`);

console.log('Option B — JSON map (recommended, one entry per admin):');
console.log('ADMIN_TOTP_ADMINS=' + JSON.stringify({ [label]: secret }, null, 0));
console.log('\n(Merge into one JSON object if you already have other admins.)\n');

console.log('Scan this URI in Google Authenticator / Authy:\n');
console.log(uri);
console.log('\nQR: npx qrcode-terminal "' + uri + '"\n');