const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { nowIso, atomicWriteJson, ensureDir } = require('../../shared/utils.cjs');

class IntegrityService {
  constructor(paths, vaultService, logger, settingsStore = null, checkpointService = null) {
    this.paths = paths;
    this.vault = vaultService;
    this.logger = logger;
    this.settings = settingsStore || vaultService.settingsStore;
    this.checkpoints = checkpointService;
  }

  referencedHashes() {
    const references = new Map();
    for (const versions of Object.values(this.vault.index.files || {})) for (const version of versions) {
      if (!references.has(version.hash)) references.set(version.hash, []);
      references.get(version.hash).push(version.id);
    }
    return references;
  }

  referencedVersionIds() {
    const ids = new Set();
    for (const versions of Object.values(this.vault.index.files || {})) for (const version of versions) ids.add(version.id);
    return ids;
  }

  async scan({ full = false, includeOrphans = true, persist = true } = {}) {
    const startedAt = nowIso();
    const results = {
      startedAt, completedAt: null, full: Boolean(full), checked: 0, healthy: 0, missing: 0, corrupt: 0,
      metadataIssues: 0, orphanObjects: 0, permissionIssues: 0, issues: []
    };
    const references = this.referencedHashes();
    const objects = Object.entries(this.vault.index.objects || {});
    const sample = full ? objects : objects.slice(0, 5000);
    for (const [hash, meta] of sample) {
      results.checked += 1;
      if (!/^[a-f0-9]{64}$/.test(hash)) { results.metadataIssues += 1; results.issues.push({ hash, type: 'invalid-object-hash' }); continue; }
      const file = path.join(this.paths.objectsDir, `${hash}.rwo`);
      if (!fs.existsSync(file)) { results.missing += 1; results.issues.push({ hash, type: 'missing-object', references: references.get(hash)?.length || 0 }); continue; }
      try {
        const stat = await fsp.lstat(file);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Object is not a regular file');
        const plain = this.vault.crypto.decrypt(await fsp.readFile(file));
        const actual = this.vault.crypto.hashBuffer(plain);
        if (actual !== hash || (meta.size !== undefined && Number(meta.size) !== plain.length)) {
          results.corrupt += 1; results.issues.push({ hash, type: actual !== hash ? 'hash-mismatch' : 'size-mismatch' });
        } else results.healthy += 1;
      } catch (error) { results.corrupt += 1; results.issues.push({ hash, type: 'decrypt-failed', error: error.message }); }
    }

    for (const [hash, versionIds] of references) {
      if (!this.vault.index.objects?.[hash]) { results.metadataIssues += 1; results.issues.push({ hash, type: 'object-metadata-missing', references: versionIds.length }); }
    }
    const knownVersions = this.referencedVersionIds();
    for (const checkpoint of this.checkpoints?.list?.() || []) for (const versionId of checkpoint.versions || []) if (!knownVersions.has(versionId)) {
      results.metadataIssues += 1; results.issues.push({ checkpointId: checkpoint.id, versionId, type: 'checkpoint-version-missing' });
    }
    for (const item of this.vault.trashIndex || []) {
      const ids = item.type === 'directory' ? (item.entries || []).map((entry) => entry.versionId) : [item.versionId];
      for (const versionId of ids) if (versionId && !knownVersions.has(versionId)) { results.metadataIssues += 1; results.issues.push({ trashId: item.id, versionId, type: 'trash-version-missing' }); }
    }

    if (includeOrphans && fs.existsSync(this.paths.objectsDir)) {
      for (const name of await fsp.readdir(this.paths.objectsDir)) {
        if (!name.endsWith('.rwo')) continue;
        const hash = name.slice(0, -4);
        if (!this.vault.index.objects?.[hash]) { results.orphanObjects += 1; results.issues.push({ hash, type: 'orphan-object' }); }
      }
    }
    if (process.platform !== 'win32') {
      for (const file of [this.paths.masterKeyFile, this.paths.settingsFile, this.paths.auditFile, this.paths.versionsFile]) {
        try { if ((fs.statSync(file).mode & 0o077) !== 0) { results.permissionIssues += 1; results.issues.push({ file: path.basename(file), type: 'permissions-too-open' }); } } catch {}
      }
    }
    results.completedAt = nowIso();
    results.ok = results.missing === 0 && results.corrupt === 0 && results.metadataIssues === 0 && results.permissionIssues === 0;
    if (persist) { ensureDir(path.dirname(this.paths.diagnosticsFile)); atomicWriteJson(this.paths.diagnosticsFile, results); }
    return results;
  }

  async repair({ removeOrphans = false, tightenPermissions = true } = {}) {
    const actions = [];
    if (removeOrphans && fs.existsSync(this.paths.objectsDir)) {
      for (const name of await fsp.readdir(this.paths.objectsDir)) {
        if (!name.endsWith('.rwo')) continue;
        const hash = name.slice(0, -4);
        if (!this.vault.index.objects?.[hash]) { await fsp.rm(path.join(this.paths.objectsDir, name), { force: true }); actions.push({ type: 'removed-orphan', hash }); }
      }
    }
    if (tightenPermissions && process.platform !== 'win32') {
      for (const directory of [this.paths.baseDir, this.paths.configDir, this.paths.dataDir, this.paths.vaultDir]) try { await fsp.chmod(directory, 0o700); actions.push({ type: 'chmod-directory', name: path.basename(directory) }); } catch {}
      for (const file of [this.paths.masterKeyFile, this.paths.settingsFile, this.paths.auditFile, this.paths.versionsFile, this.paths.trashFile, this.paths.checkpointsFile, this.paths.clipboardFile, this.paths.workspacesFile]) try { if (fs.existsSync(file)) { await fsp.chmod(file, 0o600); actions.push({ type: 'chmod-file', name: path.basename(file) }); } } catch {}
    }
    return { actions, scan: await this.scan({ full: true }) };
  }

  fileHealth(filePath) {
    try {
      const stat = fs.lstatSync(filePath);
      if (stat.isSymbolicLink() || !stat.isFile()) return { path: filePath, exists: true, warnings: ['not-regular-file'], healthy: false };
      const versions = this.vault.listVersions(filePath);
      const previous = versions[0];
      const warnings = [];
      if (stat.size === 0 && previous?.size > 0) warnings.push('file-became-empty');
      if (previous?.size && stat.size < previous.size * 0.1) warnings.push('file-shrunk-significantly');
      if (previous?.size && stat.size > previous.size * 20 && previous.size > 1024) warnings.push('file-grew-significantly');
      return { path: filePath, exists: true, size: stat.size, modifiedAt: stat.mtime.toISOString(), versions: versions.length, warnings, healthy: warnings.length === 0 };
    } catch { return { path: filePath, exists: false, warnings: ['file-missing'], healthy: false }; }
  }
}

module.exports = { IntegrityService };
