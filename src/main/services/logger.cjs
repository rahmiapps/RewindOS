const fs = require('node:fs');
const path = require('node:path');
const { ensureDir, nowIso } = require('../../shared/utils.cjs');

const SENSITIVE_KEYS = /pin|password|passphrase|secret|token|key|authorization|cookie/i;

function redact(value, depth = 0) {
  if (depth > 8) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redact(item, depth + 1));
  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value)) output[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : redact(item, depth + 1);
    return output;
  }
  if (typeof value === 'string' && value.length > 4096) return `${value.slice(0, 4096)}…`;
  return value;
}

class Logger {
  constructor(logsDir) {
    ensureDir(logsDir);
    this.file = path.join(logsDir, 'rewindos.log');
    this.maxBytes = 5 * 1024 * 1024;
  }

  rotate() {
    try {
      if (!fs.existsSync(this.file) || fs.statSync(this.file).size < this.maxBytes) return;
      const previous = `${this.file}.1`;
      fs.rmSync(previous, { force: true });
      fs.renameSync(this.file, previous);
    } catch {}
  }

  write(level, message, details) {
    this.rotate();
    const line = JSON.stringify({ timestamp: nowIso(), level, message: String(message).slice(0, 1000), details: redact(details || null) });
    try { fs.appendFileSync(this.file, `${line}\n`, { encoding: 'utf8', mode: 0o600 }); } catch {}
    if (process.env.REWINDOS_DEBUG === '1') console.log(`[${level}] ${message}`, redact(details || ''));
  }

  info(message, details) { this.write('info', message, details); }
  warn(message, details) { this.write('warn', message, details); }
  error(message, details) { this.write('error', message, details); }
}

module.exports = { Logger, redact };
