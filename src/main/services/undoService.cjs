const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { id, nowIso, ensureDir, within, copyTreeSafe } = require('../../shared/utils.cjs');
const { assertNoSymlinkComponents } = require('../../shared/securityUtils.cjs');

class UndoService {
  constructor(paths, settingsStore, auditStore, vaultService, logger, dependencies = {}) {
    this.paths = paths;
    this.settingsStore = settingsStore;
    this.audit = auditStore;
    this.vault = vaultService;
    this.logger = logger;
    this.clipboard = dependencies.clipboardService || null;
    this.workspaces = dependencies.workspaceService || null;
  }

  preview(eventId, options = {}) {
    const event = this.audit.get(eventId);
    if (!event) throw new Error('Timeline event not found');
    const steps = []; let supported = true; let warning = null;
    const settings = this.settingsStore.get();
    const ruleByAction = { created: 'create', copied: 'copy', deleted: 'delete', modified: 'modify', moved: 'move', renamed: 'rename', 'directory-created': 'create', 'directory-deleted': 'delete', 'settings-changed': 'settings', 'clipboard-captured': 'clipboard', 'workspace-captured': 'workspace' };
    const rule = ruleByAction[event.action];
    if (rule && settings.undoRules[rule] === false) { supported = false; warning = `Undo for ${event.action} is disabled in settings.`; }
    if (supported && ['created','copied','directory-created'].includes(event.action)) {
      steps.push({ type: 'move-to-protected-trash', path: event.path });
      if (!fs.existsSync(event.path)) warning = 'The item no longer exists at its original path.';
    } else if (supported && event.action === 'deleted') {
      const version = event.versionId ? this.vault.findVersion(event.versionId) : this.vault.latest(event.path);
      if (!version) { supported = false; warning = 'No stored version is available.'; }
      else steps.push({ type: 'restore-version', versionId: version.id, targetPath: event.path, bytes: version.size });
    } else if (supported && event.action === 'directory-deleted') {
      if (event.trashItemId) steps.push({ type: 'restore-trash', itemId: event.trashItemId, targetPath: event.path });
      else steps.push({ type: 'create-directory', path: event.path });
    } else if (supported && event.action === 'modified') {
      const version = event.previousVersionId ? this.vault.findVersion(event.previousVersionId) : this.vault.previous(event.path, event.versionId);
      if (!version) { supported = false; warning = 'No previous version is available.'; }
      else steps.push({ type: 'restore-version', versionId: version.id, targetPath: event.path, bytes: version.size, protectCurrent: true });
    } else if (supported && (event.action === 'moved' || event.action === 'renamed')) {
      if (!event.fromPath) { supported = false; warning = 'Original path is unknown.'; }
      else steps.push({ type: 'move', from: event.toPath || event.path, to: event.fromPath });
    } else if (supported && event.action === 'settings-changed') {
      if (!event.previousSettings) { supported = false; warning = 'Previous settings are unavailable.'; }
      else steps.push({ type: 'restore-settings', settings: event.previousSettings });
    } else if (supported && event.action === 'clipboard-captured' && event.clipboardItemId && this.clipboard) {
      steps.push({ type: 'restore-clipboard', itemId: event.clipboardItemId });
    } else if (supported && event.action === 'workspace-captured' && event.workspaceId && this.workspaces) {
      steps.push({ type: 'restore-workspace', workspaceId: event.workspaceId });
    } else if (supported) {
      supported = false; warning = 'This event is informational and cannot be undone automatically.';
    }
    return {
      id: id('preview'), event, supported, warning, steps,
      conflictRule: options.conflictRule || settings.undoRules.defaultConflictRule,
      dryRun: options.dryRun ?? settings.undoRules.dryRunByDefault,
      createdAt: nowIso()
    };
  }

  async protectBeforeOverwrite(step, group) {
    if (!step.protectCurrent || !fs.existsSync(step.targetPath)) return null;
    return this.vault.saveVersion(step.targetPath, { reason: 'pre-undo-safety-snapshot', operationGroup: group, force: true });
  }

  async moveWithConflict(from, to, conflictRule) {
    if (!fs.existsSync(from)) throw new Error('The moved or renamed item no longer exists');
    const sourceStat = await fsp.lstat(from);
    if (sourceStat.isSymbolicLink()) throw new Error('Symbolic-link move sources are not allowed');
    assertNoSymlinkComponents(path.dirname(from));
    assertNoSymlinkComponents(path.dirname(to));
    let destination = to; let conflictBackup = null;
    if (fs.existsSync(destination)) {
      if (conflictRule === 'skip') return { skipped: true, movedFrom: from, movedTo: destination };
      if (conflictRule === 'replace') {
        conflictBackup = await this.vault.moveToProtectedTrash(destination, 'pre-undo-move-conflict');
        if (!conflictBackup) throw new Error('The conflicting destination could not be protected before replacement');
      } else destination = this.vault.uniquePath(destination, 'restored');
    }
    ensureDir(path.dirname(destination));
    assertNoSymlinkComponents(path.dirname(destination));
    await fsp.rename(from, destination).catch(async (error) => {
      if (error.code !== 'EXDEV') throw error;
      await copyTreeSafe(from, destination, { maxBytes: 2 * 1024 * 1024 * 1024 * 1024, rejectSymlinks: true });
      await fsp.rm(from, { recursive: true, force: true });
    });
    return { movedFrom: from, movedTo: destination, conflictBackupId: conflictBackup?.id || null };
  }

  async execute(eventId, options = {}) {
    const preview = this.preview(eventId, options);
    if (!preview.supported) throw new Error(preview.warning || 'Undo is not supported');
    if (options.testRestore) return this.testRestore(preview, options);
    if (options.dryRun ?? preview.dryRun) return { ok: true, dryRun: true, preview };

    const results = []; const safetySnapshots = [];
    for (const step of preview.steps) {
      if (step.type === 'move-to-protected-trash') results.push(await this.vault.moveToProtectedTrash(step.path));
      else if (step.type === 'create-directory') { assertNoSymlinkComponents(path.dirname(step.path)); ensureDir(step.path); results.push({ directoryCreated: step.path }); }
      else if (step.type === 'restore-trash') results.push(await this.vault.restoreTrash(step.itemId, options.conflictRule || preview.conflictRule));
      else if (step.type === 'restore-version') {
        const safety = await this.protectBeforeOverwrite(step, preview.event.operationGroup);
        if (safety) safetySnapshots.push(safety);
        results.push(await this.vault.restoreVersion(step.versionId, step.targetPath, options.conflictRule || preview.conflictRule, false));
      } else if (step.type === 'move') results.push(await this.moveWithConflict(step.from, step.to, options.conflictRule || preview.conflictRule));
      else if (step.type === 'restore-settings') results.push({ settingsRestored: true, settings: this.settingsStore.update(step.settings) });
      else if (step.type === 'restore-clipboard') results.push({ clipboardRestored: this.clipboard.copy(step.itemId) });
      else if (step.type === 'restore-workspace') results.push(await this.workspaces.restore(step.workspaceId));
    }
    this.audit.markRestored(eventId, { results, safetySnapshots });
    this.audit.add({
      action: 'restored', path: preview.event.path, sourceEventId: eventId, restorable: false,
      operationGroup: preview.event.operationGroup, results, safetySnapshots: safetySnapshots.map((item) => item.id)
    });
    return { ok: true, dryRun: false, preview, results, safetySnapshots };
  }

  async testRestore(preview) {
    const testRoot = path.join(this.paths.testRestoresDir || path.join(this.paths.baseDir, 'test-restores'), preview.id);
    ensureDir(testRoot);
    const results = [];
    for (const step of preview.steps) {
      if (step.type === 'restore-version') {
        const target = path.join(testRoot, path.basename(step.targetPath));
        results.push(await this.vault.restoreVersion(step.versionId, target, 'rename', false));
      } else if (step.type === 'restore-trash') {
        const protectedItem = await this.vault.previewTrash(step.itemId);
        if (protectedItem.item?.type === 'directory') {
          const targetRoot = path.join(testRoot, path.basename(protectedItem.item.originalPath));
          ensureDir(targetRoot);
          for (const relative of protectedItem.item.emptyDirectories || []) ensureDir(path.join(targetRoot, relative));
          for (const entry of protectedItem.item.entries || []) {
            results.push(await this.vault.restoreVersion(entry.versionId, path.join(targetRoot, entry.relativePath), 'replace', false));
          }
        } else if (protectedItem.item?.versionId) {
          const target = path.join(testRoot, path.basename(protectedItem.item.originalPath));
          results.push(await this.vault.restoreVersion(protectedItem.item.versionId, target, 'rename', false));
        }
      } else if (step.type === 'create-directory') { const target = path.join(testRoot, path.basename(step.path)); ensureDir(target); results.push({ directoryCreatedForTest: target });
      } else if (step.type === 'move' && fs.existsSync(step.from)) {
        const target = path.join(testRoot, path.basename(step.to));
        await fsp.cp(step.from, target, { recursive: true });
        results.push({ copiedForTest: target });
      }
    }
    return { ok: true, testRestore: true, folder: testRoot, preview, results };
  }

  collapseNestedEvents(events) {
    const ordered = [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const selected = [];
    const collapsed = [];
    const parentActions = new Set(['directory-created', 'directory-deleted']);
    for (const event of ordered) {
      const parent = selected.find((candidate) => parentActions.has(candidate.action)
        && candidate.path && event.path && candidate.path !== event.path && within(candidate.path, event.path)
        && ((candidate.action === 'directory-created' && ['created','copied','directory-created'].includes(event.action))
          || (candidate.action === 'directory-deleted' && ['deleted','directory-deleted'].includes(event.action))));
      if (parent) collapsed.push({ eventId: event.id, parentEventId: parent.id, reason: 'covered-by-directory-action' });
      else selected.push(event);
    }
    return { selected, collapsed };
  }

  async executeSelection(eventIds, options = {}) {
    const unique = [...new Set(eventIds || [])].slice(0, 10000);
    const settings = this.settingsStore.get();
    if (unique.length > 1 && settings.undoRules.massActions === false) throw new Error('Undo for mass actions is disabled in settings.');
    const rawEvents = unique.map((eventId) => this.audit.get(eventId)).filter(Boolean);
    const { selected, collapsed } = this.collapseNestedEvents(rawEvents);
    const previews = selected.map((event) => this.preview(event.id, options));
    if (options.dryRun ?? true) return {
      dryRun: true, previews, unsupported: previews.filter((item) => !item.supported),
      collapsed, collapsedEventIds: collapsed.map((item) => item.eventId)
    };
    const results = [];
    for (const event of selected) {
      try { results.push(await this.execute(event.id, { ...options, dryRun: false })); }
      catch (error) { results.push({ ok: false, eventId: event.id, error: error.message }); }
    }
    return { dryRun: false, results, collapsed, collapsedEventIds: collapsed.map((item) => item.eventId) };
  }

  async executeGroup(groupId, options = {}) {
    const settings = this.settingsStore.get();
    if (settings.undoRules.massActions === false) throw new Error('Undo for mass actions is disabled in settings.');
    const events = this.audit.group(groupId).filter((event) => event.restorable && !event.restored);
    return this.executeSelection(events.map((event) => event.id), options);
  }

  async undoLast(options = {}) {
    const event = this.audit.list({ restorable: true, limit: 100 }).find((item) => !item.restored);
    if (!event) return { ok: false, message: 'No restorable action found' };
    return this.execute(event.id, options);
  }
}

module.exports = { UndoService };
