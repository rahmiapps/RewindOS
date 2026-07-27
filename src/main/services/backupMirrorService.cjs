const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { nowIso, atomicWriteBuffer, atomicWriteJson, readJson } = require('../../shared/utils.cjs');
const { safeLocalPath, assertNoSymlinkComponents, isWithin } = require('../../shared/securityUtils.cjs');

class BackupMirrorService {
  constructor(paths, settingsStore, exportService, logger, cryptoService) {
    this.paths = paths;
    this.settingsStore = settingsStore;
    this.exportService = exportService;
    this.logger = logger;
    this.crypto = cryptoService;
    this.credentialFile = paths.mirrorCredentialFile || path.join(paths.configDir, 'mirror-credential.bin');
    this.stateFile = paths.mirrorStateFile || path.join(paths.configDir, 'mirror-state.json');
  }

  storePassphrase(passphrase) {
    const value = String(passphrase || '');
    if (value.length < 12 || value.length > 1024) throw new Error('Mirror passphrase must contain at least 12 characters');
    atomicWriteBuffer(this.credentialFile, this.crypto.encrypt(Buffer.from(value, 'utf8')), 0o600);
    return true;
  }

  storedPassphrase() {
    if (!fs.existsSync(this.credentialFile)) return null;
    try { return this.crypto.decrypt(fs.readFileSync(this.credentialFile)).toString('utf8'); }
    catch (error) {
      this.logger?.warn('Stored mirror credential is unreadable and was removed', { message: error.message });
      try { fs.rmSync(this.credentialFile, { force: true }); } catch {}
      return null;
    }
  }

  clearCredential() {
    fs.rmSync(this.credentialFile, { force: true });
    return true;
  }

  status() {
    const state = readJson(this.stateFile, {});
    return {
      enabled: Boolean(this.settingsStore.get().storage.mirrorEnabled),
      configured: Boolean(this.settingsStore.get().storage.mirrorPath),
      hasStoredPassphrase: fs.existsSync(this.credentialFile),
      lastMirrorAt: state.lastMirrorAt || null,
      lastDestination: state.lastDestination || null,
      lastError: state.lastError || null
    };
  }

  isDue(now = Date.now()) {
    const settings = this.settingsStore.get();
    if (!settings.storage.mirrorEnabled || !settings.storage.mirrorPath) return false;
    const state = readJson(this.stateFile, {});
    const last = new Date(state.lastMirrorAt || 0).getTime();
    return !Number.isFinite(last) || now - last >= Number(settings.storage.mirrorIntervalHours || 24) * 3600000;
  }

  async mirror(passphrase = '', { remember = false, reason = 'manual' } = {}) {
    const settings = this.settingsStore.get();
    if (!settings.storage.mirrorEnabled || !settings.storage.mirrorPath) return { skipped: true, reason: 'disabled' };
    let secret = String(passphrase || '');
    if (secret && remember) this.storePassphrase(secret);
    if (!secret) secret = this.storedPassphrase() || '';
    if (secret.length < 12) return { skipped: true, reason: 'passphrase-required' };
    const root = safeLocalPath(settings.storage.mirrorPath, { mustExist: true });
    assertNoSymlinkComponents(root);
    if (!fs.statSync(root).isDirectory()) throw new Error('Mirror destination is not a folder');
    if (isWithin(this.paths.baseDir, root) || isWithin(root, this.paths.baseDir)) throw new Error('Mirror destination must be outside the active RewindOS data folder');
    const parent = path.join(root, 'RewindOS-Mirrors');
    await fsp.mkdir(parent, { recursive: true, mode: 0o700 });
    try {
      const destination = await this.exportService.createRecoveryBundle(parent, secret, { type: 'external-backup-mirror' });
      const mirroredAt = nowIso();
      const current = path.join(parent, 'CURRENT.txt');
      await fsp.writeFile(current, `${path.basename(destination)}\n${mirroredAt}\n`, { encoding: 'utf8', mode: 0o600 });
      const entries = (await fsp.readdir(parent, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('RewindOS-Recovery-'))
        .sort((a, b) => b.name.localeCompare(a.name));
      for (const old of entries.slice(10)) await fsp.rm(path.join(parent, old.name), { recursive: true, force: true });
      atomicWriteJson(this.stateFile, { lastMirrorAt: mirroredAt, lastDestination: destination, lastError: null, reason });
      return { skipped: false, destination, mirroredAt, encrypted: true, restoreRequiresPassphrase: true, reason };
    } catch (error) {
      atomicWriteJson(this.stateFile, { ...readJson(this.stateFile, {}), lastError: error.message, lastAttemptAt: nowIso(), reason });
      throw error;
    }
  }
}

module.exports = { BackupMirrorService };
