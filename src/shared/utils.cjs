const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function id(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function nowIso() { return new Date().toISOString(); }

function ensureDir(dir, mode = 0o700) {
  fs.mkdirSync(dir, { recursive: true, mode });
  try { if (process.platform !== 'win32') fs.chmodSync(dir, mode); } catch {}
  return dir;
}

function atomicWriteBuffer(file, value, mode = 0o600) {
  ensureDir(path.dirname(file));
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`);
  const descriptor = fs.openSync(temp, 'wx', mode);
  try {
    fs.writeFileSync(descriptor, value);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try { fs.renameSync(temp, file); }
  catch (error) { try { fs.rmSync(temp, { force: true }); } catch {} throw error; }
  try { if (process.platform !== 'win32') fs.chmodSync(file, mode); } catch {}
}

function atomicWriteJson(file, value) {
  atomicWriteBuffer(file, Buffer.from(JSON.stringify(value, null, 2), 'utf8'));
}

function readJson(file, fallback, maxBytes = 16 * 1024 * 1024) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > maxBytes) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return fallback; }
}

function normalizePath(value) {
  return path.resolve(String(value || '')).replace(/[\\/]+$/, '') || path.parse(path.resolve(String(value || ''))).root;
}

function safeFileName(value) {
  return String(value || 'item').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/[. ]+$/g, '').slice(0, 180) || 'item';
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Number(bytes || 0); let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function within(parent, child) {
  const rel = path.relative(normalizePath(parent), normalizePath(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function copyTreeSafe(source, destination, { maxBytes = Number.MAX_SAFE_INTEGER, rejectSymlinks = true } = {}) {
  const root = path.resolve(source);
  let copiedBytes = 0;
  async function walk(current, target) {
    const stat = await fs.promises.lstat(current);
    if (stat.isSymbolicLink() && rejectSymlinks) throw new Error(`Symbolic link rejected: ${current}`);
    if (stat.isDirectory()) {
      ensureDir(target);
      const entries = await fs.promises.readdir(current, { withFileTypes: true });
      for (const entry of entries) await walk(path.join(current, entry.name), path.join(target, entry.name));
      return;
    }
    if (!stat.isFile()) return;
    copiedBytes += stat.size;
    if (copiedBytes > maxBytes) throw new Error('Copy exceeds the configured safety limit');
    ensureDir(path.dirname(target));
    await fs.promises.copyFile(current, target, fs.constants.COPYFILE_EXCL).catch(async (error) => {
      if (error.code !== 'EEXIST') throw error;
      await fs.promises.copyFile(current, target);
    });
  }
  await walk(root, path.resolve(destination));
  return { copiedBytes };
}

module.exports = { id, nowIso, ensureDir, atomicWriteBuffer, atomicWriteJson, readJson, normalizePath, safeFileName, formatBytes, within, sleep, copyTreeSafe };
