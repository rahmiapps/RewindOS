const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { id, nowIso, ensureDir, safeFileName, sleep, atomicWriteBuffer, within } = require('../../shared/utils.cjs');
const { assertNoSymlinkComponents, safeString } = require('../../shared/securityUtils.cjs');
const { readSecureJson, writeSecureJson } = require('./secureJson.cjs');

const TEXT_EXTENSIONS = new Set(['.txt','.md','.json','.xml','.yml','.yaml','.js','.ts','.tsx','.jsx','.css','.html','.htm','.cs','.java','.kt','.py','.rs','.go','.ini','.cfg','.log','.csv','.sql','.sh','.ps1']);
const IMAGE_EXTENSIONS = new Set(['.png','.jpg','.jpeg','.webp','.gif','.bmp']);

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const MAX_INDEX_FILES = 250000;
const MAX_TOTAL_VERSIONS = 1000000;
const MAX_VERSION_BYTES = 8 * 1024 * 1024 * 1024;

function validHash(value) { return HASH_PATTERN.test(String(value || '').toLowerCase()); }
function boundedString(value, maxLength, fallback = '') { try { return safeString(value ?? fallback, { maxLength }); } catch { return String(value ?? fallback).replace(/\0/g, '').slice(0, maxLength); } }
async function directoryIdentity(directory) {
  const [real, stat] = await Promise.all([fsp.realpath(directory), fsp.stat(directory)]);
  if (!stat.isDirectory()) throw new Error('Restore parent is not a directory');
  return { real: process.platform === 'win32' ? real.toLowerCase() : real, dev: String(stat.dev), ino: String(stat.ino) };
}
function sameDirectoryIdentity(left, right) { return left.real === right.real && left.dev === right.dev && left.ino === right.ino; }
function validIso(value, fallback = nowIso()) { const date = new Date(value || fallback); return Number.isFinite(date.getTime()) ? date.toISOString() : fallback; }
function safeRelative(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? '').replace(/\\/g, '/');
  if ((!normalized && !allowEmpty) || normalized.includes('\0') || path.posix.isAbsolute(normalized) || normalized.split('/').includes('..')) return null;
  return normalized;
}

function normalizeVaultIndex(loaded) {
  const output = { schemaVersion: 2, files: {}, objects: {} };
  const seenIds = new Set();
  let total = 0;
  const files = loaded && typeof loaded === 'object' && !Array.isArray(loaded) && loaded.files && typeof loaded.files === 'object' ? loaded.files : {};
  for (const [filePath, rawVersions] of Object.entries(files).slice(0, MAX_INDEX_FILES)) {
    if (!Array.isArray(rawVersions) || total >= MAX_TOTAL_VERSIONS) continue;
    let absolute;
    try { absolute = path.resolve(safeString(filePath, { maxLength: 32768, allowEmpty: false })); } catch { continue; }
    const versions = [];
    for (const raw of rawVersions.slice(0, Math.max(0, MAX_TOTAL_VERSIONS - total))) {
      if (!raw || typeof raw !== 'object' || !validHash(raw.hash)) continue;
      let versionId;
      try { versionId = safeString(raw.id, { maxLength: 200, allowEmpty: false }); } catch { continue; }
      if (seenIds.has(versionId)) continue;
      const size = Number(raw.size);
      if (!Number.isFinite(size) || size < 0 || size > MAX_VERSION_BYTES) continue;
      const hash = String(raw.hash).toLowerCase();
      const item = {
        id: versionId, path: absolute, hash, size,
        mode: Number.isInteger(Number(raw.mode)) ? Number(raw.mode) & 0o7777 : 0o600,
        mtimeMs: Number.isFinite(Number(raw.mtimeMs)) ? Number(raw.mtimeMs) : Date.now(),
        birthtimeMs: Number.isFinite(Number(raw.birthtimeMs)) ? Number(raw.birthtimeMs) : 0,
        createdAt: validIso(raw.createdAt), reason: boundedString(raw.reason, 2048, 'imported'),
        operationGroup: raw.operationGroup ? boundedString(raw.operationGroup, 200) : null,
        favorite: Boolean(raw.favorite), profileId: raw.profileId ? boundedString(raw.profileId, 200) : null,
        healthy: raw.healthy !== false
      };
      versions.push(item); seenIds.add(versionId); total += 1;
      const object = output.objects[hash] || { size, storedAt: item.createdAt, refCount: 0 };
      object.size = Math.max(Number(object.size || 0), size); object.refCount += 1; output.objects[hash] = object;
    }
    if (versions.length) output.files[absolute] = versions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return output;
}

function normalizeTrashIndex(loaded, index) {
  if (!Array.isArray(loaded)) return [];
  const versionIds = new Set(Object.values(index.files).flatMap((versions) => versions.map((version) => version.id)));
  const seen = new Set(); const output = [];
  for (const raw of loaded.slice(0, 250000)) {
    if (!raw || typeof raw !== 'object') continue;
    let itemId; let originalPath;
    try { itemId = safeString(raw.id, { maxLength: 200, allowEmpty: false }); originalPath = path.resolve(safeString(raw.originalPath, { maxLength: 32768, allowEmpty: false })); } catch { continue; }
    if (seen.has(itemId)) continue;
    const base = { id: itemId, originalPath, reason: boundedString(raw.reason, 2048, 'imported'), timestamp: validIso(raw.timestamp), favorite: Boolean(raw.favorite), encrypted: true, externalDeletion: Boolean(raw.externalDeletion) };
    if (raw.type === 'directory') {
      const entries = [];
      for (const entry of Array.isArray(raw.entries) ? raw.entries.slice(0, 250000) : []) {
        const relativePath = safeRelative(entry?.relativePath);
        if (!relativePath || !versionIds.has(entry?.versionId)) continue;
        entries.push({ relativePath, versionId: String(entry.versionId), size: Math.max(0, Number(entry.size || 0)) });
      }
      const emptyDirectories = [...new Set((Array.isArray(raw.emptyDirectories) ? raw.emptyDirectories : []).slice(0, 250000).map((value) => safeRelative(value, { allowEmpty: true })).filter((value) => value !== null))];
      output.push({ ...base, type: 'directory', entries, emptyDirectories });
    } else if (versionIds.has(raw.versionId)) output.push({ ...base, type: 'file', versionId: String(raw.versionId) });
    else continue;
    seen.add(itemId);
  }
  return output;
}

class VaultService {
  constructor(paths, settingsStore, cryptoService, auditStore, logger) {
    this.paths = paths;
    this.settingsStore = settingsStore;
    this.crypto = cryptoService;
    this.audit = auditStore;
    this.logger = logger;
    this.index = normalizeVaultIndex(readSecureJson(paths.versionsFile, { schemaVersion: 2, files: {}, objects: {} }, cryptoService));
    this.trashIndex = normalizeTrashIndex(readSecureJson(paths.trashFile, [], cryptoService), this.index);
    this.activeCopies = 0;
    this.copyWaiters = [];
  }

  async withCopySlot(task) {
    const limit = () => Math.max(1, Number(this.settingsStore.get().performance.maxConcurrentCopies || 2));
    while (this.activeCopies >= limit()) await new Promise((resolve) => this.copyWaiters.push(resolve));
    this.activeCopies += 1;
    try { return await task(); }
    finally {
      this.activeCopies = Math.max(0, this.activeCopies - 1);
      const next = this.copyWaiters.shift();
      if (next) next();
    }
  }

  fileKey(filePath) { return path.resolve(filePath); }

  async readStableFile(absolute, statHint = null) {
    const settings = this.settingsStore.get().monitoring;
    let lastError;
    for (let attempt = 0; attempt < settings.stableReadRetries; attempt += 1) {
      try {
        const before = statHint || await fsp.lstat(absolute);
        if (!before.isFile() || before.isSymbolicLink()) return null;
        const buffer = await fsp.readFile(absolute);
        const after = await fsp.lstat(absolute);
        if (before.size === after.size && before.mtimeMs === after.mtimeMs && buffer.length === after.size) return { buffer, stat: after };
      } catch (error) { lastError = error; }
      await sleep(settings.stableReadDelayMs);
      statHint = null;
    }
    if (lastError) throw lastError;
    throw new Error('File remained unstable while being written');
  }

  async saveVersion(filePath, options = {}) { return this.withCopySlot(() => this.saveVersionUnlocked(filePath, options)); }

  async saveVersionUnlocked(filePath, options = {}) {
    const absolute = this.fileKey(filePath);
    const settings = this.settingsStore.get();
    let stat;
    try { stat = await fsp.lstat(absolute); } catch { return null; }
    if (stat.isSymbolicLink()) {
      this.audit.add({ action: 'skipped', path: absolute, reason: 'symlink', restorable: false, operationGroup: options.operationGroup });
      const error = new Error('Symbolic-link source files are not versioned');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    if (!stat.isFile()) return null;
    if (within(this.paths.baseDir, absolute) || within(this.paths.vaultDir, absolute)) return null;

    const currentBytes = Object.values(this.index.objects).reduce((sum, object) => sum + Number(object.size || 0), 0);
    if (currentBytes + stat.size > settings.storage.maxVaultBytes) {
      this.audit.add({ action: 'skipped', path: absolute, size: stat.size, reason: 'vault-limit', restorable: false, operationGroup: options.operationGroup });
      return null;
    }
    try {
      const disk = await fsp.statfs(this.paths.objectsDir);
      const available = Number(disk.bavail) * Number(disk.bsize);
      if (available - stat.size < settings.storage.reserveBytes) {
        this.audit.add({ action: 'skipped', path: absolute, size: stat.size, reason: 'disk-reserve', restorable: false, operationGroup: options.operationGroup });
        return null;
      }
    } catch {}
    if (stat.size > settings.storage.maxFileBytes) {
      this.audit.add({ action: 'skipped', path: absolute, size: stat.size, reason: 'max-file-size', restorable: false, operationGroup: options.operationGroup });
      return null;
    }

    let stable;
    try { stable = await this.readStableFile(absolute, stat); }
    catch (error) {
      this.audit.add({ action: 'skipped', path: absolute, size: stat.size, reason: 'unstable-file', error: error.message, restorable: false, operationGroup: options.operationGroup });
      return null;
    }
    if (!stable) return null;
    const { buffer } = stable;
    stat = stable.stat;
    const hash = this.crypto.hashBuffer(buffer);
    const objectFile = path.join(this.paths.objectsDir, `${hash}.rwo`);
    if (!fs.existsSync(objectFile)) atomicWriteBuffer(objectFile, this.crypto.encrypt(buffer), 0o600);
    if (!this.index.objects[hash]) this.index.objects[hash] = { size: buffer.length, storedAt: nowIso(), refCount: 0 };

    const key = this.fileKey(absolute);
    const versions = this.index.files[key] || [];
    if (versions[0]?.hash === hash && !options.force) return structuredClone(versions[0]);

    const version = {
      id: id('ver'), path: absolute, hash, size: stat.size, mode: stat.mode, mtimeMs: stat.mtimeMs,
      birthtimeMs: stat.birthtimeMs, createdAt: nowIso(), reason: options.reason || 'change',
      operationGroup: options.operationGroup || null, favorite: Boolean(options.favorite),
      profileId: options.profileId || null, healthy: true
    };
    versions.unshift(version);
    this.index.files[key] = versions;
    this.index.objects[hash].refCount = (this.index.objects[hash].refCount || 0) + 1;
    this.applyPerFileRetention(key);
    this.saveIndex();
    return structuredClone(version);
  }

  applyPerFileRetention(key) {
    const settings = this.settingsStore.get();
    const versions = this.index.files[key] || [];
    const max = this.maxVersionsForPath(key, settings);
    if (versions.length <= max) return;
    const keep = []; const remove = [];
    for (const version of versions) {
      if (keep.length < max || version.favorite) keep.push(version); else remove.push(version);
    }
    this.index.files[key] = keep;
    for (const version of remove) this.releaseObject(version.hash);
  }

  maxVersionsForPath(filePath, settings) {
    const absolute = path.resolve(filePath);
    const project = (settings.projectSpaces || []).find((space) => (space.folders || []).some((folder) => within(folder, absolute)));
    if (project?.maxVersions) return Math.max(1, Number(project.maxVersions));
    const ext = path.extname(filePath).toLowerCase();
    const profile = (settings.profiles || []).find((item) => (item.extensions || []).includes(ext));
    let max = Number(profile?.maxVersions || settings.storage.maxVersionsPerFile);
    if (settings.monitoring.adaptiveVersioning && profile?.priority === 'high') max = Math.ceil(max * 1.5);
    return Math.max(1, max);
  }

  releaseObject(hash) {
    if (!validHash(hash)) throw new Error('Invalid vault object hash');
    const meta = this.index.objects[hash];
    if (!meta) return;
    meta.refCount = Math.max(0, Number(meta.refCount || 0) - 1);
    if (meta.refCount === 0) {
      try { fs.unlinkSync(path.join(this.paths.objectsDir, `${hash}.rwo`)); } catch {}
      delete this.index.objects[hash];
    }
  }

  async readVersion(versionIdOrObject) {
    const version = typeof versionIdOrObject === 'string' ? this.findVersion(versionIdOrObject) : versionIdOrObject;
    if (!version) throw new Error('Version not found');
    if (!validHash(version.hash)) throw new Error('Invalid vault object hash');
    const objectFile = path.join(this.paths.objectsDir, `${version.hash}.rwo`);
    const encrypted = await fsp.readFile(objectFile);
    const configuredMax = Number(this.settingsStore.get()?.monitoring?.maxFileBytes || version.size || 2 * 1024 * 1024 * 1024);
    const maxOutputBytes = Math.max(Number(version.size || 0) + 1024 * 1024, configuredMax);
    const buffer = this.crypto.decrypt(encrypted, { maxOutputBytes });
    if (this.crypto.hashBuffer(buffer) !== version.hash) throw new Error('Integrity check failed');
    return buffer;
  }

  findVersion(versionId) {
    for (const versions of Object.values(this.index.files)) {
      const version = versions.find((v) => v.id === versionId);
      if (version) return structuredClone(version);
    }
    return null;
  }

  findVersionByHash(hash, excludePath = '') {
    const excluded = excludePath ? this.fileKey(excludePath) : '';
    for (const [filePath, versions] of Object.entries(this.index.files)) {
      if (excluded && this.fileKey(filePath) === excluded) continue;
      const version = versions.find((item) => item.hash === hash);
      if (version) return structuredClone(version);
    }
    return null;
  }

  latest(filePath) { return structuredClone((this.index.files[this.fileKey(filePath)] || [])[0] || null); }
  previous(filePath, currentVersionId) {
    const versions = this.index.files[this.fileKey(filePath)] || [];
    if (!currentVersionId) return structuredClone(versions[1] || versions[0] || null);
    const index = versions.findIndex((v) => v.id === currentVersionId);
    return structuredClone(versions[index + 1] || null);
  }

  listVersions(filePath) {
    if (filePath) return structuredClone(this.index.files[this.fileKey(filePath)] || []);
    return Object.entries(this.index.files).map(([itemPath, versions]) => ({
      path: itemPath, count: versions.length, latest: versions[0] || null,
      totalBytes: versions.reduce((sum, v) => sum + v.size, 0)
    })).sort((a, b) => new Date(b.latest?.createdAt || 0) - new Date(a.latest?.createdAt || 0));
  }

  async conflictDecision(destination, version, rule) {
    if (!fs.existsSync(destination)) return { destination, action: 'write' };
    const current = await fsp.lstat(destination);
    if (current.isSymbolicLink()) throw new Error('Symbolic-link restore targets are not allowed');
    if (!current.isFile()) {
      if (rule === 'skip') return { destination, action: 'skip' };
      if (rule === 'rename') return { destination: this.uniquePath(destination, 'restored'), action: 'write' };
      throw new Error('A file version cannot replace a directory or special filesystem object');
    }
    if (rule === 'skip') return { destination, action: 'skip' };
    if (rule === 'replace') return { destination, action: 'replace' };
    if (rule === 'keep-newer' || rule === 'keep-older') {
      const versionIsNewer = version.mtimeMs > current.mtimeMs;
      const shouldUseVersion = rule === 'keep-newer' ? versionIsNewer : !versionIsNewer;
      return { destination, action: shouldUseVersion ? 'replace' : 'skip' };
    }
    return { destination: this.uniquePath(destination, 'restored'), action: 'write' };
  }

  async restoreVersion(versionId, targetPath, conflictRule = 'rename', dryRun = false) {
    if (dryRun) return this.restoreVersionUnlocked(versionId, targetPath, conflictRule, true);
    return this.withCopySlot(() => this.restoreVersionUnlocked(versionId, targetPath, conflictRule, false));
  }

  async restoreVersionUnlocked(versionId, targetPath, conflictRule = 'rename', dryRun = false) {
    const version = this.findVersion(versionId);
    if (!version) throw new Error('Version not found');
    const requested = path.resolve(targetPath || version.path);
    const settings = this.settingsStore.get();
    if (settings.security.rejectSymlinkRestores) assertNoSymlinkComponents(path.dirname(requested));
    const decision = await this.conflictDecision(requested, version, conflictRule);
    const preview = {
      versionId, sourcePath: version.path, targetPath: decision.destination, bytes: version.size,
      conflictRule, action: decision.action, willOverwrite: decision.action === 'replace'
    };
    if (dryRun || decision.action === 'skip') return { dryRun: Boolean(dryRun), skipped: decision.action === 'skip', preview };

    const buffer = await this.readVersion(version);
    const parent = path.dirname(decision.destination);
    ensureDir(parent);
    if (settings.security.rejectSymlinkRestores) assertNoSymlinkComponents(parent);
    const parentBefore = await directoryIdentity(parent);
    const temp = `${decision.destination}.rewindos-restore-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
    let safetyVersion = null;
    try {
      await fsp.writeFile(temp, buffer, { mode: version.mode || 0o600, flag: 'wx' });
      const tempStat = await fsp.lstat(temp);
      if (!tempStat.isFile() || tempStat.isSymbolicLink()) throw new Error('Unsafe temporary restore file');
      try { await fsp.chmod(temp, version.mode || 0o600); } catch {}
      const parentAfterWrite = await directoryIdentity(parent);
      if (!sameDirectoryIdentity(parentBefore, parentAfterWrite)) throw new Error('Restore directory changed during the operation');
      if (decision.action === 'replace') {
        safetyVersion = await this.saveVersionUnlocked(decision.destination, { reason: 'pre-restore-safety-snapshot', force: true });
        if (!safetyVersion) throw new Error('The existing target could not be protected before replacement');
        await fsp.rm(decision.destination, { force: true });
      }
      const parentBeforeRename = await directoryIdentity(parent);
      if (!sameDirectoryIdentity(parentBefore, parentBeforeRename)) throw new Error('Restore directory changed before commit');
      await fsp.rename(temp, decision.destination);
      try { await fsp.utimes(decision.destination, new Date(), new Date(version.mtimeMs)); } catch {}
      if (settings.security.verifyEveryRestore) {
        const restored = await fsp.readFile(decision.destination);
        if (this.crypto.hashBuffer(restored) !== version.hash) {
          await fsp.rm(decision.destination, { force: true });
          if (safetyVersion) await this.restoreVersionUnlocked(safetyVersion.id, decision.destination, 'replace', false);
          throw new Error('Restored file failed verification');
        }
      }
      return { dryRun: false, preview, restoredPath: decision.destination, verified: settings.security.verifyEveryRestore, safetyVersionId: safetyVersion?.id || null };
    } catch (error) {
      await fsp.rm(temp, { force: true }).catch(() => {});
      throw error;
    }
  }

  uniquePath(destination, suffix) {
    const parsed = path.parse(destination); let counter = 1; let candidate;
    do { candidate = path.join(parsed.dir, `${parsed.name} (${suffix}${counter > 1 ? ` ${counter}` : ''})${parsed.ext}`); counter += 1; }
    while (fs.existsSync(candidate));
    return candidate;
  }

  async captureDirectoryForTrash(root, reason) {
    const entries = []; const emptyDirectories = []; const queue = [root];
    while (queue.length) {
      const directory = queue.shift();
      const children = await fsp.readdir(directory, { withFileTypes: true });
      if (!children.length) emptyDirectories.push(path.relative(root, directory));
      for (const child of children) {
        const full = path.join(directory, child.name);
        if (child.isSymbolicLink()) throw new Error('Directories containing symbolic links cannot be moved to protected trash');
        if (child.isDirectory()) queue.push(full);
        else if (child.isFile()) {
          const version = await this.saveVersion(full, { reason: `protected-trash:${reason}`, force: true });
          if (!version) throw new Error(`Unable to protect ${full}`);
          entries.push({ relativePath: path.relative(root, full), versionId: version.id, size: version.size });
        }
      }
    }
    return { entries, emptyDirectories };
  }

  registerDeletedDirectory(originalPath, entries = [], emptyDirectories = [], reason = 'filesystem-directory-delete') {
    const absolute = path.resolve(originalPath);
    const safeEntries = [];
    const versionIds = new Set();
    for (const entry of entries || []) {
      const version = this.findVersion(entry.versionId);
      if (!version) continue;
      const relativePath = String(entry.relativePath || '').replace(/\\/g, '/');
      if (!relativePath || path.isAbsolute(relativePath) || relativePath.split('/').includes('..')) continue;
      safeEntries.push({ relativePath, versionId: version.id, size: Number(entry.size || version.size || 0) });
      versionIds.add(version.id);
    }
    const safeEmpty = [...new Set((emptyDirectories || []).map((value) => String(value || '').replace(/\\/g, '/')).filter((value) => !path.isAbsolute(value) && !value.split('/').includes('..')))];
    const existing = this.trashIndex.find((item) => item.type === 'directory' && item.originalPath === absolute && item.externalDeletion);
    if (existing) return structuredClone(existing);
    this.trashIndex = this.trashIndex.filter((item) => !(item.type === 'file' && versionIds.has(item.versionId)));
    const item = {
      id: id('trash'), originalPath: absolute, reason, timestamp: nowIso(), favorite: false,
      type: 'directory', encrypted: true, externalDeletion: true, entries: safeEntries, emptyDirectories: safeEmpty
    };
    this.trashIndex.unshift(item); this.saveTrashIndex(); return structuredClone(item);
  }

  registerDeletedVersion(originalPath, versionId, reason = 'filesystem-delete') {
    const version = this.findVersion(versionId);
    if (!version) return null;
    const absolute = path.resolve(originalPath);
    const directoryOwner = this.trashIndex.find((item) => item.type === 'directory' && (item.entries || []).some((entry) => entry.versionId === versionId));
    if (directoryOwner) return structuredClone(directoryOwner);
    const existing = this.trashIndex.find((item) => item.type === 'file' && item.originalPath === absolute && item.versionId === versionId);
    if (existing) return structuredClone(existing);
    const item = { id: id('trash'), originalPath: absolute, versionId, reason, timestamp: nowIso(), favorite: false, type: 'file', encrypted: true, externalDeletion: true };
    this.trashIndex.unshift(item); this.saveTrashIndex(); return structuredClone(item);
  }

  async moveToProtectedTrash(filePath, reason = 'undo-create') {
    const absolute = path.resolve(filePath);
    if (!fs.existsSync(absolute)) return null;
    const stat = await fsp.lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error('Symbolic links cannot be moved to protected trash');
    if (within(this.paths.baseDir, absolute)) throw new Error('RewindOS data cannot be moved to protected trash');
    if (stat.isFile()) {
      const version = await this.saveVersion(absolute, { reason: `protected-trash:${reason}`, force: true });
      if (!version) throw new Error('Unable to create encrypted protected-trash version');
      await fsp.rm(absolute, { force: true });
      const item = { id: id('trash'), originalPath: absolute, versionId: version.id, reason, timestamp: nowIso(), favorite: false, type: 'file', encrypted: true };
      this.trashIndex.unshift(item); this.saveTrashIndex(); return structuredClone(item);
    }
    if (!stat.isDirectory()) throw new Error('Only files and folders can be protected');
    const captured = await this.captureDirectoryForTrash(absolute, reason);
    await fsp.rm(absolute, { recursive: true, force: true });
    const item = {
      id: id('trash'), originalPath: absolute, reason, timestamp: nowIso(), favorite: false,
      type: 'directory', encrypted: true, entries: captured.entries, emptyDirectories: captured.emptyDirectories
    };
    this.trashIndex.unshift(item); this.saveTrashIndex(); return structuredClone(item);
  }

  listTrash() {
    this.trashIndex = this.trashIndex.filter((item) => item.type === 'directory'
      ? (item.entries || []).some((entry) => Boolean(this.findVersion(entry.versionId))) || !(item.entries || []).length
      : Boolean(this.findVersion(item.versionId)));
    this.saveTrashIndex();
    return structuredClone(this.trashIndex.map((item) => {
      const versions = item.type === 'directory' ? (item.entries || []).map((entry) => this.findVersion(entry.versionId)).filter(Boolean) : [this.findVersion(item.versionId)].filter(Boolean);
      return {
        ...item,
        name: path.basename(item.originalPath),
        isDirectory: item.type === 'directory',
        size: versions.reduce((sum, version) => sum + Number(version.size || 0), 0),
        fileCount: versions.length,
        modifiedAt: item.timestamp,
        encrypted: true
      };
    }));
  }

  async restoreTrash(itemId, conflictRule = 'rename') {
    const item = this.trashIndex.find((entry) => entry.id === itemId);
    if (!item) throw new Error('Protected trash item not found');
    if (item.type !== 'directory') {
      const result = await this.restoreVersion(item.versionId, item.originalPath, conflictRule, false);
      if (!result.skipped) { this.trashIndex = this.trashIndex.filter((entry) => entry.id !== itemId); this.saveTrashIndex(); }
      return { restoredPath: result.restoredPath || item.originalPath, originalPath: item.originalPath, skipped: result.skipped };
    }
    let root = item.originalPath;
    let conflictBackup = null;
    if (fs.existsSync(root)) {
      if (conflictRule === 'replace') {
        conflictBackup = await this.moveToProtectedTrash(root, 'pre-trash-restore-conflict');
        if (!conflictBackup) throw new Error('The existing destination could not be protected before replacement');
      } else if (conflictRule === 'skip') return { restoredPath: root, originalPath: item.originalPath, skipped: true };
      else root = this.uniquePath(root, 'restored');
    }
    ensureDir(root);
    for (const relative of item.emptyDirectories || []) ensureDir(path.join(root, relative));
    const results = [];
    for (const entry of item.entries || []) results.push(await this.restoreVersion(entry.versionId, path.join(root, entry.relativePath), 'replace', false));
    this.trashIndex = this.trashIndex.filter((entry) => entry.id !== itemId); this.saveTrashIndex();
    return { restoredPath: root, originalPath: item.originalPath, results, conflictBackupId: conflictBackup?.id || null };
  }

  async testRestoreVersion(versionId) {
    const version = this.findVersion(versionId);
    if (!version) throw new Error('Version not found');
    const folder = ensureDir(path.join(this.paths.testRestoresDir, `version-${Date.now()}-${safeFileName(version.id)}`));
    const target = path.join(folder, safeFileName(path.basename(version.path)));
    const result = await this.restoreVersion(version.id, target, 'rename', false);
    return { folder, version, result };
  }

  async previewVersion(versionId) {
    const settings = this.settingsStore.get();
    if (settings.privacy.privateMode || settings.privacy.disablePreviews) return { available: false, reason: 'previews-disabled' };
    const version = this.findVersion(versionId);
    if (!version) throw new Error('Version not found');
    const ext = path.extname(version.path).toLowerCase();
    const buffer = await this.readVersion(version);
    if (TEXT_EXTENSIONS.has(ext) && buffer.length <= 2 * 1024 * 1024) return { available: true, type: 'text', text: buffer.toString('utf8'), version };
    if (IMAGE_EXTENSIONS.has(ext) && buffer.length <= 25 * 1024 * 1024) {
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : ext === '.bmp' ? 'image/bmp' : 'image/png';
      return { available: true, type: 'image', dataUrl: `data:${mime};base64,${buffer.toString('base64')}`, version };
    }
    return { available: false, reason: 'unsupported-preview', version };
  }

  async previewTrash(itemId) {
    const item = this.trashIndex.find((entry) => entry.id === itemId);
    if (!item) throw new Error('Protected trash item not found');
    if (item.type === 'directory') return {
      available: true, type: 'directory', item,
      entries: (item.entries || []).slice(0, 500).map((entry) => ({ ...entry, version: this.findVersion(entry.versionId) }))
    };
    return { item, ...(await this.previewVersion(item.versionId)) };
  }

  setTrashFavorite(itemId, favorite) {
    const item = this.trashIndex.find((entry) => entry.id === itemId);
    if (!item) return null;
    item.favorite = Boolean(favorite); this.saveTrashIndex(); return structuredClone(item);
  }

  async permanentDelete(target) {
    const item = this.trashIndex.find((entry) => entry.id === target);
    if (!item) throw new Error('Only protected trash items can be permanently deleted');
    if (item.type === 'directory') for (const entry of item.entries || []) this.removeVersion(entry.versionId);
    else this.removeVersion(item.versionId);
    this.trashIndex = this.trashIndex.filter((entry) => entry.id !== item.id); this.saveTrashIndex(); return true;
  }

  removeVersion(versionId) {
    for (const [filePath, versions] of Object.entries(this.index.files)) {
      const index = versions.findIndex((version) => version.id === versionId);
      if (index < 0) continue;
      const [removed] = versions.splice(index, 1);
      this.releaseObject(removed.hash);
      if (!versions.length) delete this.index.files[filePath];
      this.saveIndex(); return true;
    }
    return false;
  }

  setFavorite(versionId, favorite) {
    for (const versions of Object.values(this.index.files)) {
      const version = versions.find((v) => v.id === versionId);
      if (version) { version.favorite = Boolean(favorite); this.saveIndex(); return structuredClone(version); }
    }
    return null;
  }

  stats() {
    const objects = Object.values(this.index.objects);
    return {
      protectedFiles: Object.keys(this.index.files).length,
      versions: Object.values(this.index.files).reduce((sum, list) => sum + list.length, 0),
      uniqueObjects: objects.length,
      bytes: objects.reduce((sum, object) => sum + Number(object.size || 0), 0),
      protectedTrashItems: this.trashIndex.length
    };
  }

  saveIndex() { writeSecureJson(this.paths.versionsFile, this.index, this.crypto, this.settingsStore.get().privacy.databaseEncryption !== false); }
  saveTrashIndex() { writeSecureJson(this.paths.trashFile, this.trashIndex, this.crypto, this.settingsStore.get().privacy.databaseEncryption !== false); }
}

module.exports = { VaultService };
