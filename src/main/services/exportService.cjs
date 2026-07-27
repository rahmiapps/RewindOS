const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { ensureDir, nowIso, atomicWriteJson, copyTreeSafe, id } = require('../../shared/utils.cjs');
const { stripDangerousKeys, safeLocalPath, assertNoSymlinkComponents, isWithin } = require('../../shared/securityUtils.cjs');

const MAX_IMPORT_BYTES = 2 * 1024 * 1024 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
const MAX_SETTINGS_BYTES = 4 * 1024 * 1024;
const MAX_RECOVERY_KEY_BYTES = 64 * 1024;
const MAX_MANIFEST_FILES = 2_000_000;

function readJsonLimited(file, maxBytes, label = 'JSON file') {
  assertNoSymlinkComponents(file);
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > maxBytes) throw new Error(`${label} is invalid or too large`);
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error(`${label} is not valid JSON`); }
  return stripDangerousKeys(value);
}

function sanitizedSettings(settings) {
  const copy = structuredClone(settings);
  if (copy.privacy) {
    delete copy.privacy.pinSalt;
    delete copy.privacy.pinHash;
    copy.privacy.appPinEnabled = false;
    copy.privacy.localOnly = true;
  }
  if (copy.storage) copy.storage.vaultPath = '';
  return copy;
}

function validatePassphrase(passphrase) {
  const value = String(passphrase || '');
  if (value.length < 12 || value.length > 1024) throw new Error('Recovery passphrase must contain at least 12 characters');
  return value;
}

function encryptRecoveryKey(masterKey, passphrase) {
  const secret = validatePassphrase(passphrase);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(secret, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(masterKey), cipher.final()]);
  return {
    format: 'rewindos-recovery-key-v2', kdf: 'scrypt', N: 32768, r: 8, p: 1,
    salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function decryptRecoveryKey(payload, passphrase) {
  const secret = validatePassphrase(passphrase);
  if (!payload || !['rewindos-recovery-key-v1', 'rewindos-recovery-key-v2'].includes(payload.format)) throw new Error('Unsupported recovery-key format');
  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const N = payload.format.endsWith('v2') ? 32768 : 16384;
  const key = crypto.scryptSync(secret, salt, 32, { N, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

async function moveTreeSafe(source, destination) {
  ensureDir(path.dirname(destination));
  try { await fsp.rename(source, destination); return; }
  catch (error) {
    if (error.code !== 'EXDEV') throw error;
  }
  await copyTreeSafe(source, destination, { maxBytes: MAX_IMPORT_BYTES });
  await fsp.rm(source, { recursive: true, force: true });
}

async function hashTree(root, { exclude = new Set() } = {}) {
  const entries = [];
  let totalBytes = 0;
  async function walk(current, relative = '') {
    const stat = await fsp.lstat(current);
    if (stat.isSymbolicLink()) throw new Error(`Recovery data contains a symbolic link: ${relative || '.'}`);
    if (stat.isDirectory()) {
      const children = await fsp.readdir(current, { withFileTypes: true });
      children.sort((a, b) => a.name.localeCompare(b.name));
      for (const child of children) await walk(path.join(current, child.name), path.join(relative, child.name));
      return;
    }
    if (!stat.isFile() || exclude.has(relative.replace(/\\/g, '/'))) return;
    totalBytes += stat.size;
    if (totalBytes > MAX_IMPORT_BYTES) throw new Error('Recovery bundle exceeds the maximum supported size');
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(current);
    for await (const chunk of stream) hash.update(chunk);
    entries.push({ path: relative.replace(/\\/g, '/'), bytes: stat.size, sha256: hash.digest('hex') });
  }
  await walk(path.resolve(root));
  return { entries, totalBytes };
}

async function verifyManifest(root, manifest) {
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.files)) throw new Error('Recovery bundle manifest is invalid');
  if (manifest.files.length > MAX_MANIFEST_FILES) throw new Error('Recovery bundle manifest contains too many entries');
  const expected = new Map();
  for (const entry of manifest.files) {
    if (!entry || typeof entry.path !== 'string' || !/^[a-f0-9]{64}$/i.test(String(entry.sha256 || '')) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) throw new Error('Recovery bundle manifest contains an invalid entry');
    const normalized = entry.path.replace(/\\/g, '/');
    if (!normalized || path.posix.isAbsolute(normalized) || normalized.split('/').includes('..') || expected.has(normalized)) throw new Error('Recovery bundle manifest contains an unsafe or duplicate path');
    expected.set(normalized, { ...entry, path: normalized });
  }
  const actual = await hashTree(root, { exclude: new Set(['manifest.json']) });
  if (actual.entries.length !== expected.size) throw new Error('Recovery bundle file count does not match its manifest');
  for (const file of actual.entries) {
    const match = expected.get(file.path);
    if (!match || match.bytes !== file.bytes || match.sha256 !== file.sha256) throw new Error(`Recovery bundle integrity check failed for ${file.path}`);
  }
  return actual;
}

class ExportService {
  constructor(paths, settingsStore, auditStore, vaultService, checkpointService, workspaceService, cryptoService, logger = null) {
    this.paths = paths;
    this.settings = settingsStore;
    this.audit = auditStore;
    this.vault = vaultService;
    this.checkpoints = checkpointService;
    this.workspaces = workspaceService;
    this.crypto = cryptoService || vaultService.crypto;
    this.logger = logger;
  }

  exportSettings(destination) {
    const target = safeLocalPath(destination);
    ensureDir(path.dirname(target));
    atomicWriteJson(target, sanitizedSettings(this.settings.get()));
    return target;
  }

  importSettings(source) {
    const target = safeLocalPath(source, { mustExist: true });
    assertNoSymlinkComponents(target);
    const data = readJsonLimited(target, MAX_SETTINGS_BYTES, 'Settings file');
    return this.importSettingsFromObject(data);
  }

  exportTimeline(destination, format = 'json') {
    const target = safeLocalPath(destination);
    const events = this.audit.list({ limit: 100000 });
    ensureDir(path.dirname(target));
    if (format === 'csv') {
      const header = ['id', 'timestamp', 'action', 'path', 'size', 'restorable', 'restored', 'operationGroup', 'program'];
      const rows = events.map((event) => header.map((key) => `"${String(event[key] ?? '').replace(/"/g, '""')}"`).join(','));
      fs.writeFileSync(target, `\uFEFF${[header.join(','), ...rows].join('\r\n')}`, { encoding: 'utf8', mode: 0o600 });
    } else atomicWriteJson(target, events);
    return target;
  }

  assertDestination(destinationFolder) {
    const target = safeLocalPath(destinationFolder, { mustExist: true });
    assertNoSymlinkComponents(target);
    if (!fs.statSync(target).isDirectory()) throw new Error('A destination folder is required');
    if (isWithin(this.paths.baseDir, target) || isWithin(target, this.paths.baseDir)) throw new Error('Recovery exports must be stored outside the active RewindOS data directory');
    return target;
  }

  async copyPayload(destination) {
    await copyTreeSafe(this.paths.dataDir, path.join(destination, 'data'), { maxBytes: MAX_IMPORT_BYTES });
    await copyTreeSafe(this.paths.vaultDir, path.join(destination, 'vault'), { maxBytes: MAX_IMPORT_BYTES });
    atomicWriteJson(path.join(destination, 'settings.json'), sanitizedSettings(this.settings.get()));
  }

  async finishManifest(destination, values) {
    const scan = await hashTree(destination, { exclude: new Set(['manifest.json']) });
    const manifest = { schemaVersion: 2, app: 'RewindOS', createdAt: nowIso(), totalBytes: scan.totalBytes, files: scan.entries, ...values };
    atomicWriteJson(path.join(destination, 'manifest.json'), manifest);
    return manifest;
  }

  async createPortableArchive(destinationFolder) {
    const root = this.assertDestination(destinationFolder);
    const destination = path.join(root, `RewindOS-Archive-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    ensureDir(destination);
    try {
      await this.copyPayload(destination);
      await this.finishManifest(destination, {
        type: 'same-installation-archive', encryptedObjects: true, restorableAfterReinstall: false,
        note: 'This archive deliberately excludes the master key. Use a passphrase-protected recovery bundle for full disaster recovery.'
      });
      return destination;
    } catch (error) { await fsp.rm(destination, { recursive: true, force: true }); throw error; }
  }

  async createRecoveryBundle(destinationFolder, passphrase, { type = 'password-protected-recovery-bundle' } = {}) {
    validatePassphrase(passphrase);
    const root = this.assertDestination(destinationFolder);
    const destination = path.join(root, `RewindOS-Recovery-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    ensureDir(destination);
    try {
      await this.copyPayload(destination);
      atomicWriteJson(path.join(destination, 'recovery-key.json'), encryptRecoveryKey(this.crypto.exportMasterKey(), passphrase));
      await this.finishManifest(destination, { type, restoreRequiresRestart: true, authenticatedEncryption: 'AES-256-GCM' });
      return destination;
    } catch (error) { await fsp.rm(destination, { recursive: true, force: true }); throw error; }
  }

  async restoreRecoveryBundle(sourceFolder, passphrase) {
    const root = safeLocalPath(sourceFolder, { mustExist: true });
    assertNoSymlinkComponents(root);
    if (!fs.statSync(root).isDirectory()) throw new Error('Recovery bundle must be a folder');
    if (isWithin(this.paths.baseDir, root)) throw new Error('An active data folder cannot be imported as a recovery bundle');

    const stage = path.join(this.paths.recoveryStagingDir, id('restore'));
    const stagedBundle = path.join(stage, 'bundle');
    const backup = path.join(this.paths.recoveryStagingDir, id('previous'));
    const previousKey = this.crypto.exportMasterKey();
    const previousSettings = this.settings.get();
    let dataBackedUp = false;
    let vaultBackedUp = false;
    let importedDataInstalled = false;
    let importedVaultInstalled = false;
    let keyPersisted = false;
    ensureDir(stage); ensureDir(backup);
    try {
      // Copy untrusted removable/network content into a private staging area first. All
      // validation and reads below use this local copy to close TOCTOU races.
      await copyTreeSafe(root, stagedBundle, { maxBytes: MAX_IMPORT_BYTES });
      const manifest = readJsonLimited(path.join(stagedBundle, 'manifest.json'), MAX_MANIFEST_BYTES, 'Recovery bundle manifest');
      if (manifest.app !== 'RewindOS' || !['password-protected-recovery-bundle', 'external-backup-mirror'].includes(manifest.type)) throw new Error('Invalid RewindOS recovery bundle');
      await verifyManifest(stagedBundle, manifest);
      for (const required of ['data', 'vault', 'settings.json', 'recovery-key.json']) if (!fs.existsSync(path.join(stagedBundle, required))) throw new Error(`Recovery bundle is missing ${required}`);

      const wrapped = readJsonLimited(path.join(stagedBundle, 'recovery-key.json'), MAX_RECOVERY_KEY_BYTES, 'Recovery key');
      const masterKey = decryptRecoveryKey(wrapped, passphrase);
      if (masterKey.length !== 32) throw new Error('Invalid recovery key');
      const importedSettings = readJsonLimited(path.join(stagedBundle, 'settings.json'), MAX_SETTINGS_BYTES, 'Recovery settings');

      // Validate at least one object with the candidate key before replacing live data.
      this.crypto.key = masterKey;
      const objectDirectory = path.join(stagedBundle, 'vault', 'objects');
      const objectFiles = fs.existsSync(objectDirectory) ? fs.readdirSync(objectDirectory).filter((name) => name.endsWith('.rwo')) : [];
      if (objectFiles.length) {
        const firstObject = path.join(objectDirectory, objectFiles[0]);
        const objectSize = fs.statSync(firstObject).size;
        this.crypto.decrypt(fs.readFileSync(firstObject), { maxOutputBytes: Math.max(objectSize * 100, 1024 * 1024) });
      }

      // Transaction: preserve the old installation, install both imported trees, then
      // persist key/settings. Any failure below removes partial imported data and restores
      // the previous data, vault, key and settings.
      if (fs.existsSync(this.paths.dataDir)) { await moveTreeSafe(this.paths.dataDir, path.join(backup, 'data')); dataBackedUp = true; }
      if (fs.existsSync(this.paths.vaultDir)) { await moveTreeSafe(this.paths.vaultDir, path.join(backup, 'vault')); vaultBackedUp = true; }
      await moveTreeSafe(path.join(stagedBundle, 'data'), this.paths.dataDir); importedDataInstalled = true;
      await moveTreeSafe(path.join(stagedBundle, 'vault'), this.paths.vaultDir); importedVaultInstalled = true;
      this.crypto.importMasterKey(masterKey); keyPersisted = true;
      importedSettings.storage = { ...(importedSettings.storage || {}), vaultPath: this.paths.vaultDir };
      this.importSettingsFromObject(importedSettings);
      await fsp.rm(stage, { recursive: true, force: true });
      return { restored: true, restartRequired: true, source: root, previousDataBackup: backup };
    } catch (error) {
      const rollbackErrors = [];
      const attempt = async (label, fn) => { try { await fn(); } catch (rollbackError) { rollbackErrors.push(`${label}: ${rollbackError.message}`); } };
      this.logger?.error('Recovery import failed', { message: error.message });

      if (importedDataInstalled && fs.existsSync(this.paths.dataDir)) await attempt('remove imported data', () => fsp.rm(this.paths.dataDir, { recursive: true, force: true }));
      if (importedVaultInstalled && fs.existsSync(this.paths.vaultDir)) await attempt('remove imported vault', () => fsp.rm(this.paths.vaultDir, { recursive: true, force: true }));
      if (dataBackedUp && fs.existsSync(path.join(backup, 'data'))) await attempt('restore previous data', () => moveTreeSafe(path.join(backup, 'data'), this.paths.dataDir));
      if (vaultBackedUp && fs.existsSync(path.join(backup, 'vault'))) await attempt('restore previous vault', () => moveTreeSafe(path.join(backup, 'vault'), this.paths.vaultDir));
      await attempt('restore previous master key', async () => { this.crypto.importMasterKey(previousKey); });
      await attempt('restore previous settings', async () => { this.settings.update(previousSettings); });
      this.crypto.key = previousKey;
      await fsp.rm(stage, { recursive: true, force: true }).catch(() => {});

      if (rollbackErrors.length) {
        this.logger?.error('Recovery rollback was incomplete', { errors: rollbackErrors });
        const wrappedError = new Error(`Recovery import failed and rollback needs attention: ${rollbackErrors.join('; ')}`);
        wrappedError.cause = error;
        wrappedError.code = 'RECOVERY_ROLLBACK_INCOMPLETE';
        wrappedError.backupPath = backup;
        throw wrappedError;
      }
      if (!dataBackedUp && !vaultBackedUp && !keyPersisted) await fsp.rm(backup, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  importSettingsFromObject(data) {
    const clean = stripDangerousKeys(data || {});
    if (clean.privacy) {
      delete clean.privacy.pinSalt; delete clean.privacy.pinHash;
      clean.privacy.appPinEnabled = false; clean.privacy.localOnly = true;
    }
    if (clean.storage) { delete clean.storage.vaultPath; clean.storage.mirrorPath = ''; clean.storage.mirrorEnabled = false; }
    if (clean.monitoring) { clean.monitoring.watchedFolders = []; clean.monitoring.excludedFolders = []; clean.monitoring.paused = true; }
    if (clean.privacy) clean.privacy.sensitiveFolders = [];
    if (Array.isArray(clean.projectSpaces)) clean.projectSpaces = clean.projectSpaces.map((space) => ({ ...space, folders: [] }));
    if (Array.isArray(clean.customTrashRules)) clean.customTrashRules = clean.customTrashRules.map((rule) => ({ ...rule, folder: '' })).filter((rule) => rule.extension);
    return this.settings.update(clean);
  }
}

module.exports = { ExportService, sanitizedSettings, encryptRecoveryKey, decryptRecoveryKey, hashTree, verifyManifest, readJsonLimited, moveTreeSafe, MAX_MANIFEST_BYTES, MAX_SETTINGS_BYTES, MAX_RECOVERY_KEY_BYTES };
