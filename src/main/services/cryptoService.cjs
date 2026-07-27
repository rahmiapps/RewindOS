const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { ensureDir, atomicWriteBuffer } = require('../../shared/utils.cjs');

class CryptoService {
  constructor(paths, settingsStore, logger, safeStorage = null) {
    this.paths = paths;
    this.settingsStore = settingsStore;
    this.logger = logger;
    this.safeStorage = safeStorage;
    this.protection = { mode: 'file-permissions', available: false, backend: 'none', weakBackend: false };
    this.key = this.loadOrCreateKey();
  }

  safeStorageStatus() {
    try {
      const available = Boolean(this.safeStorage?.isEncryptionAvailable?.());
      const backend = this.safeStorage?.getSelectedStorageBackend?.() || (available ? 'platform' : 'none');
      const weakBackend = backend === 'basic_text';
      return { available, backend, weakBackend };
    } catch { return { available: false, backend: 'none', weakBackend: false }; }
  }

  loadExistingKey(raw) {
    if (raw.length === 32) return { key: raw, legacy: true };
    try {
      const payload = JSON.parse(raw.toString('utf8'));
      if (payload.format !== 'rewindos-key-v2') throw new Error('Unknown key format');
      if (payload.protection === 'safe-storage') {
        if (!this.safeStorage?.isEncryptionAvailable?.()) throw new Error('Operating-system secure storage is unavailable');
        const decrypted = this.safeStorage.decryptString(Buffer.from(payload.payload, 'base64'));
        return { key: Buffer.from(decrypted, 'base64'), legacy: false };
      }
      if (payload.protection === 'file-permissions') return { key: Buffer.from(payload.payload, 'base64'), legacy: false };
      throw new Error('Unknown key protection mode');
    } catch (error) {
      this.logger.error('Unable to decode encryption key', { message: error.message });
      throw new Error('The RewindOS encryption key is unreadable or belongs to another operating-system account');
    }
  }

  persistKey(key) {
    if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Invalid master key');
    const status = this.safeStorageStatus();
    let payload;
    if (status.available && !status.weakBackend) {
      payload = {
        format: 'rewindos-key-v2',
        protection: 'safe-storage',
        backend: status.backend,
        payload: this.safeStorage.encryptString(key.toString('base64')).toString('base64')
      };
      this.protection = { mode: 'safe-storage', ...status };
    } else {
      payload = {
        format: 'rewindos-key-v2',
        protection: 'file-permissions',
        backend: status.backend,
        payload: key.toString('base64')
      };
      this.protection = { mode: 'file-permissions', ...status };
    }
    ensureDir(path.dirname(this.paths.masterKeyFile));
    atomicWriteBuffer(this.paths.masterKeyFile, Buffer.from(JSON.stringify(payload), 'utf8'), 0o600);
  }

  loadOrCreateKey() {
    try {
      if (fs.existsSync(this.paths.masterKeyFile)) {
        const loaded = this.loadExistingKey(fs.readFileSync(this.paths.masterKeyFile));
        if (!Buffer.isBuffer(loaded.key) || loaded.key.length !== 32) throw new Error('Invalid master key length');
        if (loaded.legacy) this.persistKey(loaded.key);
        else {
          const status = this.safeStorageStatus();
          this.protection = {
            mode: fs.readFileSync(this.paths.masterKeyFile, 'utf8').includes('safe-storage') ? 'safe-storage' : 'file-permissions',
            ...status
          };
        }
        return loaded.key;
      }
      const key = crypto.randomBytes(32);
      this.persistKey(key);
      return key;
    } catch (error) {
      this.logger.error('Unable to load encryption key', { message: error.message });
      throw error;
    }
  }

  exportMasterKey() { return Buffer.from(this.key); }

  importMasterKey(key) {
    const value = Buffer.from(key);
    if (value.length !== 32) throw new Error('Invalid recovery key');
    this.persistKey(value);
    this.key = value;
    return this.getProtectionStatus();
  }

  getProtectionStatus() { return structuredClone(this.protection); }

  hashBuffer(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

  encrypt(buffer) {
    const storage = this.settingsStore.get().storage;
    const compressed = storage.compression ? zlib.gzipSync(buffer, { level: 6 }) : buffer;
    if (!storage.encryptionEnabled) return Buffer.concat([Buffer.from(storage.compression ? 'RW3' : 'RW0'), compressed]);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
    return Buffer.concat([Buffer.from(storage.compression ? 'RW2' : 'RW1'), iv, cipher.getAuthTag(), encrypted]);
  }

  decrypt(buffer, options = {}) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 3) throw new Error('Invalid RewindOS object');
    const configuredMax = Number(this.settingsStore.get()?.monitoring?.maxFileBytes || 2 * 1024 * 1024 * 1024);
    const requestedMax = Number(options.maxOutputBytes || configuredMax);
    const maxOutputBytes = Math.max(1, Math.min(Number.isFinite(requestedMax) ? requestedMax : configuredMax, 8 * 1024 * 1024 * 1024));
    const marker = buffer.subarray(0, 3).toString('utf8');
    if (marker === 'RW0') {
      const plain = buffer.subarray(3);
      if (plain.length > maxOutputBytes) throw new Error('RewindOS object exceeds the permitted output size');
      return plain;
    }
    if (marker === 'RW3') return zlib.gunzipSync(buffer.subarray(3), { maxOutputLength: maxOutputBytes });
    if (marker !== 'RW1' && marker !== 'RW2') throw new Error('Unknown RewindOS object format');
    if (buffer.length < 31) throw new Error('Truncated RewindOS object');
    const iv = buffer.subarray(3, 15);
    const tag = buffer.subarray(15, 31);
    const payload = buffer.subarray(31);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(payload), decipher.final()]);
    if (marker === 'RW2') return zlib.gunzipSync(plain, { maxOutputLength: maxOutputBytes });
    if (plain.length > maxOutputBytes) throw new Error('RewindOS object exceeds the permitted output size');
    return plain;
  }
}

module.exports = { CryptoService };
