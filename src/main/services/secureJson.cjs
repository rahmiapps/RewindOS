const fs = require('node:fs');
const { atomicWriteBuffer } = require('../../shared/utils.cjs');

function readSecureJson(file, fallback, cryptoService, maxBytes = 128 * 1024 * 1024) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > maxBytes) return fallback;
    const raw = fs.readFileSync(file);
    if (!raw.length) return fallback;
    const first = String.fromCharCode(raw[0]);
    const plain = first === '{' || first === '[' ? raw : cryptoService.decrypt(raw, { maxOutputBytes: maxBytes });
    if (plain.length > maxBytes) return fallback;
    return JSON.parse(plain.toString('utf8'));
  } catch { return fallback; }
}

function writeSecureJson(file, value, cryptoService, encrypted = true) {
  const plain = Buffer.from(JSON.stringify(value, null, 2), 'utf8');
  const output = encrypted ? cryptoService.encrypt(plain) : plain;
  atomicWriteBuffer(file, output, 0o600);
}

module.exports = { readSecureJson, writeSecureJson };
