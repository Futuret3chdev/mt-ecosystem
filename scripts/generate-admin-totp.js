#!/usr/bin/env node
/** Generate ADMIN_TOTP_SECRET for Vercel / mt-admin-api .env */
const path = require('path');
let authenticator;
try {
  ({ authenticator } = require('otplib'));
} catch {
  ({ authenticator } = require(path.join(__dirname, '../memetorrent-react/node_modules/otplib')));
}

const secret = authenticator.generateSecret();
const label = encodeURIComponent(process.argv[2] || 'futuret3chdev@memetorrent');
const issuer = encodeURIComponent('MemeTorrent Admin');
const uri = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

console.log('Add to Vercel + mt-admin-api .env:\n');
console.log(`ADMIN_TOTP_SECRET=${secret}\n`);
console.log('Scan this URI in Google Authenticator / Authy:\n');
console.log(uri);
console.log('\nOr run: npx qrcode-terminal "' + uri + '"');