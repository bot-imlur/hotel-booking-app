// Script to generate PBKDF2 hash for seed data
// Run: node scripts/generate-hash.mjs

const { webcrypto } = await import('node:crypto');
const crypto = webcrypto;

const password = 'admin123';
const salt = crypto.getRandomValues(new Uint8Array(16));

const keyMaterial = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(password),
  'PBKDF2',
  false,
  ['deriveBits']
);

const hashBuffer = await crypto.subtle.deriveBits(
  {
    name: 'PBKDF2',
    salt: salt,
    iterations: 100000,
    hash: 'SHA-256',
  },
  keyMaterial,
  256
);

const saltB64 = Buffer.from(salt).toString('base64');
const hashB64 = Buffer.from(hashBuffer).toString('base64');
const passwordHash = `${saltB64}:${hashB64}`;

console.log('Password hash for admin123:');
console.log(passwordHash);
console.log('\nSQL INSERT:');
console.log(`INSERT INTO users (username, password_hash) VALUES ('admin', '${passwordHash}');`);
