const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { id, nowIso, ensureDir, safeFileName, within } = require('../../shared/utils.cjs');
const { readSecureJson, writeSecureJson } = require('./secureJson.cjs');
const { safeString, stripDangerousKeys } = require('../../shared/securityUtils.cjs');

function safeRelativePath(value, { allowEmpty = false } = {}) {
  const normalized = String(value ?? '').replace(/\\/g, '/');
  if ((!normalized && !allowEmpty) || normalized.includes('\0') || path.posix.isAbsolute(normalized) || normalized.split('/').includes('..')) return null;
  return normalized;
}

function validDate(value) { const date = new Date(value || nowIso()); return Number.isFinite(date.getTime()) ? date.toISOString() : nowIso(); }
function boundedString(value, maxLength, fallback = '') { try { return safeString(value ?? fallback, { maxLength }); } catch { return String(value ?? fallback).replace(/\0/g, '').slice(0, maxLength); } }

function normalizeCheckpoint(raw, vault) {
  if (!raw || typeof raw !== 'object') return null;
  let checkpointId;
  try { checkpointId = safeString(raw.id, { maxLength: 200, allowEmpty: false }); } catch { return null; }
  const roots = [];
  let structureCount = 0;
  for (const candidate of Array.isArray(raw.roots) ? raw.roots.slice(0, 1000) : []) {
    let root;
    try { root = path.resolve(safeString(candidate?.root, { maxLength: 32768, allowEmpty: false })); } catch { continue; }
    const structure = [];
    for (const entry of Array.isArray(candidate?.structure) ? candidate.structure : []) {
      if (structureCount >= 250000) break;
      const relative = safeRelativePath(entry?.path, { allowEmpty: true });
      if (relative === null || !['directory', 'file'].includes(entry?.type)) continue;
      structure.push({ type: entry.type, path: relative, size: Math.max(0, Number(entry.size || 0)), mtimeMs: Number.isFinite(Number(entry.mtimeMs)) ? Number(entry.mtimeMs) : 0 });
      structureCount += 1;
    }
    roots.push({ root, structure });
  }
  const versions = [...new Set((Array.isArray(raw.versions) ? raw.versions : []).slice(0, 250000).filter((versionId) => typeof versionId === 'string' && vault.findVersion(versionId)).map(String))];
  const clipboard = raw.clipboardSnapshot && typeof raw.clipboardSnapshot === 'object' ? {
    text: boundedString(raw.clipboardSnapshot.text, 1024 * 1024),
    filePaths: (Array.isArray(raw.clipboardSnapshot.filePaths) ? raw.clipboardSnapshot.filePaths : []).slice(0, 1000).map((value) => boundedString(value, 32768))
  } : null;
  return {
    id: checkpointId,
    name: boundedString(raw.name, 200, 'Checkpoint'),
    note: boundedString(raw.note, 10000),
    color: /^#[0-9a-f]{6}$/i.test(String(raw.color || '')) ? String(raw.color) : '#6d7cff',
    category: boundedString(raw.category, 120, 'imported'),
    createdAt: validDate(raw.createdAt), operationGroup: boundedString(raw.operationGroup, 200, id('checkpoint')),
    roots, versions, favorite: Boolean(raw.favorite),
    settingsSnapshot: raw.settingsSnapshot && typeof raw.settingsSnapshot === 'object' ? stripDangerousKeys(raw.settingsSnapshot) : null,
    clipboardSnapshot: clipboard,
    workspaceId: raw.workspaceId ? boundedString(raw.workspaceId, 200) : null,
    systemState: raw.systemState && typeof raw.systemState === 'object' ? stripDangerousKeys(raw.systemState) : null,
    includes: raw.includes && typeof raw.includes === 'object' ? stripDangerousKeys(raw.includes) : {},
    issues: (Array.isArray(raw.issues) ? raw.issues : []).slice(0, 10000).map((issue) => ({ path: boundedString(issue?.path, 32768), error: boundedString(issue?.error, 2048) }))
  };
}

class CheckpointService {
  constructor(paths, settingsStore, auditStore, vaultService, cryptoService, dependencies = {}) {
    this.paths = paths;
    this.settingsStore = settingsStore;
    this.audit = auditStore;
    this.vault = vaultService;
    this.crypto = cryptoService;
    this.workspaceService = dependencies.workspaceService || null;
    this.clipboardService = dependencies.clipboardService || null;
    this.platform = dependencies.platformAdapter || null;
    const loaded = readSecureJson(paths.checkpointsFile, [], cryptoService);
    this.items = Array.isArray(loaded) ? loaded.slice(0, 10000).map((item) => normalizeCheckpoint(item, vaultService)).filter(Boolean) : [];
  }

  async scanRoot(root, operationGroup, { captureVersions = true, maxEntries = 250000 } = {}) {
    const absoluteRoot = path.resolve(root);
    const structure = [];
    const versionIds = [];
    const issues = [];
    const queue = [absoluteRoot];
    while (queue.length && structure.length < maxEntries) {
      const current = queue.shift();
      let entries;
      try { entries = await fsp.readdir(current, { withFileTypes: true }); }
      catch (error) { issues.push({ path: current, error: error.message }); continue; }
      if (!entries.length) structure.push({ type: 'directory', path: path.relative(absoluteRoot, current) });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        let stat;
        try { stat = await fsp.lstat(full); } catch (error) { issues.push({ path: full, error: error.message }); continue; }
        if (stat.isSymbolicLink()) { issues.push({ path: full, error: 'symlink-skipped' }); continue; }
        const relativePath = path.relative(absoluteRoot, full);
        if (stat.isDirectory()) { structure.push({ type: 'directory', path: relativePath }); queue.push(full); }
        else if (stat.isFile()) {
          structure.push({ type: 'file', path: relativePath, size: stat.size, mtimeMs: stat.mtimeMs });
          if (captureVersions) {
            const version = await this.vault.saveVersion(full, { reason: 'checkpoint', operationGroup, force: false });
            if (version) versionIds.push(version.id); else issues.push({ path: full, error: 'version-unavailable' });
          }
        }
        if (structure.length >= maxEntries) break;
      }
    }
    if (queue.length) issues.push({ path: absoluteRoot, error: 'entry-limit-reached' });
    return { root: absoluteRoot, structure, versionIds, issues };
  }

  async create({
    name, note = '', color = '#6d7cff', category = 'manual', paths = [], versionIds = [],
    includeSettings = true, includeWorkspace = true, includeClipboard = true,
    includeScreenshot = true, includeFolderStructure = true, includeSystemState = this.settingsStore.get().workspace.includeSystemState
  } = {}) {
    const settings = this.settingsStore.get();
    const selected = [...new Set((paths.length ? paths : settings.monitoring.watchedFolders).map((root) => path.resolve(root)).filter((root) => fs.existsSync(root)))];
    const operationGroup = id('checkpoint');
    const roots = [];
    const collectedVersions = new Set(versionIds.filter((value) => this.vault.findVersion(value)));
    const issues = [];

    if (!versionIds.length) {
      for (const root of selected) {
        const result = await this.scanRoot(root, operationGroup, { captureVersions: true });
        roots.push({ root: result.root, structure: includeFolderStructure ? result.structure : [] });
        for (const versionId of result.versionIds) collectedVersions.add(versionId);
        issues.push(...result.issues);
      }
    } else {
      for (const root of selected) {
        const result = await this.scanRoot(root, operationGroup, { captureVersions: false });
        roots.push({ root: result.root, structure: includeFolderStructure ? result.structure : [] });
        issues.push(...result.issues);
      }
    }

    let systemState = null;
    if (includeSystemState && this.platform?.captureSystemState) {
      try { systemState = await this.platform.captureSystemState(); }
      catch (error) { issues.push({ path: 'system-state', error: error.message }); }
    }

    let workspaceId = null;
    if (includeWorkspace && this.workspaceService) {
      const workspace = await this.workspaceService.capture({
        name: `${name || 'Checkpoint'} workspace`, note, includeScreenshot,
        clipboardText: includeClipboard ? this.clipboardService?.currentSnapshot?.().text || '' : ''
      });
      workspaceId = workspace.id;
    }

    const item = {
      id: id('cp'), name: name || `Checkpoint ${new Date().toLocaleString()}`, note,
      color, category, createdAt: nowIso(), operationGroup, roots,
      versions: [...collectedVersions], favorite: false,
      settingsSnapshot: includeSettings ? this.settingsStore.getPublic() : null,
      clipboardSnapshot: includeClipboard ? this.clipboardService?.currentSnapshot?.() || null : null,
      workspaceId, systemState,
      includes: { settings: includeSettings, workspace: includeWorkspace, clipboard: includeClipboard, screenshot: includeScreenshot, folderStructure: includeFolderStructure, systemState: includeSystemState },
      issues
    };
    this.items.unshift(item);
    this.save();
    this.audit.add({ action: 'checkpoint-created', path: item.name, checkpointId: item.id, operationGroup, count: item.versions.length, issueCount: issues.length, restorable: true });
    return structuredClone(item);
  }

  list() { return structuredClone(this.items); }

  get(checkpointId) { return this.items.find((item) => item.id === checkpointId) || null; }

  targetForVersion(checkpoint, version, destinationRoot = '') {
    if (!destinationRoot) return version.path;
    const root = (checkpoint.roots || []).find((entry) => within(entry.root, version.path));
    if (!root) return path.join(destinationRoot, 'Unmapped', safeFileName(path.basename(version.path)));
    return path.join(destinationRoot, safeFileName(path.basename(root.root)), path.relative(root.root, version.path));
  }

  async previewRestore(checkpointId, options = {}) {
    const checkpoint = this.get(checkpointId);
    if (!checkpoint) throw new Error('Checkpoint not found');
    const selected = new Set(options.versionIds?.length ? options.versionIds : checkpoint.versions);
    const items = checkpoint.versions.map((versionId) => this.vault.findVersion(versionId)).filter((version) => version && selected.has(version.id));
    const previews = [];
    for (const version of items) {
      const target = this.targetForVersion(checkpoint, version, options.destinationRoot || '');
      previews.push(await this.vault.restoreVersion(version.id, target, options.conflictRule || 'rename', true));
    }
    return { checkpoint: structuredClone(checkpoint), items, previews, selectedCount: items.length };
  }

  async restore(checkpointId, {
    dryRun = true, conflictRule = 'rename', destinationRoot = '', versionIds = [],
    restoreSettings = false, restoreWorkspace = false, restoreClipboard = false, restoreFolderStructure = true,
    restoreSystemState = this.settingsStore.get().workspace.restoreSystemState
  } = {}) {
    const preview = await this.previewRestore(checkpointId, { conflictRule, destinationRoot, versionIds });
    if (dryRun) return { dryRun: true, ...preview };
    const checkpoint = this.get(checkpointId);
    const results = [];

    if (restoreFolderStructure) {
      for (const root of checkpoint.roots || []) {
        const destinationBase = destinationRoot ? path.join(destinationRoot, safeFileName(path.basename(root.root))) : root.root;
        for (const entry of root.structure || []) {
          const relative = safeRelativePath(entry.path, { allowEmpty: true });
          if (entry.type === 'directory' && relative !== null) ensureDir(path.join(destinationBase, relative));
        }
      }
    }

    for (const version of preview.items) {
      const target = this.targetForVersion(checkpoint, version, destinationRoot);
      try { results.push(await this.vault.restoreVersion(version.id, target, conflictRule, false)); }
      catch (error) { results.push({ error: error.message, versionId: version.id, target }); }
    }

    const extras = {};
    if (restoreSettings && checkpoint.settingsSnapshot) extras.settings = this.settingsStore.update(checkpoint.settingsSnapshot);
    if (restoreWorkspace && checkpoint.workspaceId && this.workspaceService) extras.workspace = await this.workspaceService.restore(checkpoint.workspaceId);
    if (restoreClipboard && checkpoint.clipboardSnapshot && this.clipboardService) extras.clipboard = this.clipboardService.restoreSnapshot(checkpoint.clipboardSnapshot);
    if (restoreSystemState && checkpoint.systemState && this.platform?.restoreSystemState) extras.systemState = await this.platform.restoreSystemState(checkpoint.systemState);
    this.audit.add({ action: 'checkpoint-restored', path: checkpoint.name, checkpointId, operationGroup: checkpoint.operationGroup, restorable: false, resultCount: results.length });
    return { dryRun: false, checkpoint: structuredClone(checkpoint), results, extras };
  }

  setFavorite(checkpointId, favorite) {
    const checkpoint = this.get(checkpointId);
    if (!checkpoint) return null;
    checkpoint.favorite = Boolean(favorite); this.save(); return structuredClone(checkpoint);
  }

  remove(checkpointId) {
    const checkpoint = this.get(checkpointId);
    if (!checkpoint) return false;
    this.items = this.items.filter((item) => item.id !== checkpointId);
    this.save();
    return true;
  }

  exportManifest(checkpointId, destination) {
    const checkpoint = this.get(checkpointId);
    if (!checkpoint) throw new Error('Checkpoint not found');
    ensureDir(path.dirname(destination));
    fs.writeFileSync(destination, JSON.stringify(checkpoint, null, 2), { encoding: 'utf8', mode: 0o600 });
    return destination;
  }

  save() { writeSecureJson(this.paths.checkpointsFile, this.items, this.crypto, this.settingsStore.get().privacy.databaseEncryption !== false); }
}

module.exports = { CheckpointService };
