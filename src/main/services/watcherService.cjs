const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const EventEmitter = require('node:events');
const { id, normalizePath, within } = require('../../shared/utils.cjs');

class WatcherService extends EventEmitter {
  constructor(settingsStore, auditStore, vaultService, logger, platformAdapter = null) {
    super();
    this.settingsStore = settingsStore;
    this.audit = auditStore;
    this.vault = vaultService;
    this.logger = logger;
    this.platform = platformAdapter;
    this.watchers = new Map();
    this.baseline = new Map();
    this.debounce = new Map();
    this.eventWindow = [];
    this.running = false;
    this.runtimeSuspendedReason = null;
    this.currentGroup = null;
    this.groupTimer = null;
    this.recentDeletes = [];
    this.alerts = new Map();
    this.lastAlertAt = 0;
    this.suspiciousHold = false;
  }

  async start() {
    await this.stop({ preserveBaseline: true });
    const settings = this.settingsStore.get();
    if (!settings.monitoring.enabled || settings.monitoring.paused || settings.privacy.privateMode || this.runtimeSuspendedReason) return this.status();
    this.suspiciousHold = false;
    for (const folder of settings.monitoring.watchedFolders) {
      const classification = this.platform?.classifyPath ? await this.platform.classifyPath(folder).catch(() => ({ type: 'unknown' })) : { type: 'unknown' };
      const blocked = (classification.type === 'network' && !settings.monitoring.includeNetwork)
        || (classification.type === 'removable' && !settings.monitoring.includeRemovable)
        || (classification.system && !settings.monitoring.includeSystem);
      if (blocked) {
        const event = this.audit.add({ action: 'skipped', path: folder, reason: `${classification.type || 'system'}-folder-disabled`, classification, restorable: false });
        this.emit('event', event);
        continue;
      }
      await this.watchFolder(folder);
    }
    this.running = this.watchers.size > 0;
    this.emit('status', this.status());
    return this.status();
  }

  async stop({ preserveBaseline = true } = {}) {
    for (const watcher of this.watchers.values()) watcher.close();
    this.watchers.clear();
    for (const timer of this.debounce.values()) clearTimeout(timer);
    this.debounce.clear();
    if (!preserveBaseline) this.baseline.clear();
    this.running = false;
    this.emit('status', this.status());
    return this.status();
  }

  async restart() { await this.stop({ preserveBaseline: false }); return this.start(); }

  async setRuntimeSuspended(reason = null) {
    const normalized = reason || null;
    if (this.runtimeSuspendedReason === normalized) return this.status();
    this.runtimeSuspendedReason = normalized;
    if (normalized) await this.stop();
    else if (!this.settingsStore.get().monitoring.paused) await this.start();
    this.emit('status', this.status());
    return this.status();
  }

  async pause(reason = 'user') {
    this.settingsStore.setPath('monitoring.paused', true);
    this.runtimeSuspendedReason = reason === 'user' ? null : reason;
    await this.stop();
    return this.status();
  }

  async resume() {
    this.settingsStore.setPath('monitoring.paused', false);
    this.runtimeSuspendedReason = null;
    this.suspiciousHold = false;
    return this.start();
  }

  status() {
    const settings = this.settingsStore.get();
    return {
      running: this.running,
      paused: settings.monitoring.paused,
      suspiciousHold: this.suspiciousHold,
      runtimeSuspendedReason: this.runtimeSuspendedReason,
      watchedFolders: [...this.watchers.keys()],
      configuredFolders: settings.monitoring.watchedFolders,
      baselineFiles: this.baseline.size,
      activeAlerts: [...this.alerts.values()].filter((alert) => !alert.resolved).length
    };
  }

  async watchFolder(folder) {
    const absolute = normalizePath(folder);
    if (!fs.existsSync(absolute)) return;
    const rootStat = await fsp.lstat(absolute).catch(() => null);
    if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) return;
    await this.initialScan(absolute);
    try {
      const watcher = fs.watch(absolute, { recursive: true, persistent: true }, (eventType, filename) => {
        if (!filename || this.suspiciousHold) return;
        const full = path.join(absolute, filename.toString());
        this.queueEvent(full, eventType);
      });
      watcher.on('error', (error) => {
        this.logger.error('Watcher error', { folder: absolute, message: error.message });
        this.audit.add({ action: 'watch-error', path: absolute, error: error.message, restorable: false });
        this.emit('event', { action: 'watch-error', path: absolute, error: error.message });
      });
      this.watchers.set(absolute, watcher);
    } catch (error) {
      this.logger.error('Unable to watch folder', { folder: absolute, message: error.message });
      this.audit.add({ action: 'watch-error', path: absolute, error: error.message, restorable: false });
    }
  }

  isExcluded(filePath) {
    const settings = this.settingsStore.get();
    if (within(this.vault.paths?.baseDir || this.vault.paths?.vaultDir || '', filePath)) return true;
    if ((settings.monitoring.excludedFolders || []).some((folder) => within(folder, filePath))) return true;
    if ((settings.privacy.sensitiveFolders || []).some((folder) => within(folder, filePath))) return true;
    const ext = path.extname(filePath).toLowerCase();
    if ((settings.monitoring.excludedExtensions || []).includes(ext)) return true;
    const relativeParts = path.resolve(filePath).split(path.sep).filter(Boolean);
    if (!settings.monitoring.includeHidden && relativeParts.some((part) => part.startsWith('.') && part.length > 1)) return true;
    return false;
  }

  async initialScan(folder) {
    const settings = this.settingsStore.get();
    const queue = [folder]; let scanned = 0;
    while (queue.length && scanned < 250000) {
      const current = queue.shift();
      let entries;
      try { entries = await fsp.readdir(current, { withFileTypes: true }); } catch { continue; }
      this.baseline.set(current, { exists: true, type: 'directory', size: 0, mtimeMs: 0 });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (this.isExcluded(full) || entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) queue.push(full);
        else if (entry.isFile()) {
          scanned += 1;
          try {
            const stat = await fsp.lstat(full);
            this.baseline.set(full, { exists: true, type: 'file', size: stat.size, mtimeMs: stat.mtimeMs });
            if (settings.monitoring.snapshotExistingFilesOnStart) {
              const version = await this.vault.saveVersion(full, { reason: 'baseline' });
              if (version) this.baseline.set(full, { exists: true, type: 'file', size: stat.size, mtimeMs: stat.mtimeMs, latestVersionId: version.id });
            }
          } catch {}
        }
      }
    }
    if (queue.length) this.audit.add({ action: 'scan-limit', path: folder, count: scanned, restorable: false });
  }

  queueEvent(filePath, eventType) {
    if (this.isExcluded(filePath) || this.suspiciousHold) return;
    const settings = this.settingsStore.get();
    clearTimeout(this.debounce.get(filePath));
    const timer = setTimeout(() => {
      this.debounce.delete(filePath);
      this.processPath(filePath, eventType).catch((error) => this.logger.error('Failed to process watched path', { filePath, message: error.message }));
    }, settings.monitoring.debounceMs);
    timer.unref?.();
    this.debounce.set(filePath, timer);
  }

  operationGroup() {
    if (!this.currentGroup) this.currentGroup = id('grp');
    clearTimeout(this.groupTimer);
    this.groupTimer = setTimeout(() => { this.currentGroup = null; }, 2200);
    this.groupTimer.unref?.();
    return this.currentGroup;
  }

  captureDeletedDirectoryState(directory) {
    const root = path.resolve(directory);
    const entries = [];
    const emptyDirectories = [];
    for (const [candidate, state] of this.baseline.entries()) {
      if (!state?.exists || candidate === root || !within(root, candidate)) continue;
      const relativePath = path.relative(root, candidate);
      if (state.type === 'directory') emptyDirectories.push(relativePath);
      else if (state.type === 'file') {
        const version = this.vault.latest(candidate) || (state.latestVersionId ? this.vault.findVersion(state.latestVersionId) : null);
        if (version) entries.push({ relativePath, versionId: version.id, size: version.size });
      }
      this.baseline.set(candidate, { ...state, exists: false });
    }
    return this.vault.registerDeletedDirectory(root, entries, emptyDirectories);
  }

  async processPath(filePath, eventType) {
    if (this.suspiciousHold) return;
    const absolute = path.resolve(filePath);
    const previous = this.baseline.get(absolute);
    let stat = null;
    try { stat = await fsp.lstat(absolute); } catch {}
    if (stat?.isSymbolicLink()) return;
    const group = this.operationGroup();
    const activeApp = this.platform?.getActiveApplication ? await this.platform.getActiveApplication() : null;
    const program = activeApp?.process || 'unknown';
    const processInfo = activeApp ? { program, pid: Number(activeApp.pid || 0) || null, executable: activeApp.executable || '' } : { program };
    const excludedPrograms = this.settingsStore.get().monitoring.excludedPrograms || [];
    if (program !== 'unknown' && excludedPrograms.some((name) => program.toLowerCase().includes(String(name).toLowerCase()))) {
      if (stat?.isFile()) this.baseline.set(absolute, { exists: true, size: stat.size, mtimeMs: stat.mtimeMs });
      else if (previous) this.baseline.set(absolute, { ...previous, exists: false });
      return;
    }

    if (!stat) {
      if (previous?.exists) {
        if (previous.type === 'directory') {
          const trashItem = this.captureDeletedDirectoryState(absolute);
          const event = this.audit.add({
            action: 'directory-deleted', path: absolute, size: trashItem?.entries?.reduce((sum, item) => sum + Number(item.size || 0), 0) || 0,
            fileCount: trashItem?.entries?.length || 0, trashItemId: trashItem?.id || null,
            operationGroup: group, restorable: true, source: 'filesystem', ...processInfo
          });
          this.baseline.set(absolute, { ...previous, exists: false });
          await this.registerActivity(event);
          return;
        }
        const latest = this.vault.latest(absolute);
        const versionId = latest?.id || previous.latestVersionId || null;
        const event = this.audit.add({
          action: 'deleted', path: absolute, size: previous.size, versionId,
          operationGroup: group, restorable: Boolean(versionId), source: 'filesystem', ...processInfo
        });
        if (versionId) this.vault.registerDeletedVersion(absolute, versionId, 'filesystem-delete');
        this.baseline.set(absolute, { exists: false, type: 'file', size: previous.size, mtimeMs: previous.mtimeMs, latestVersionId: versionId });
        this.recentDeletes.push({ eventId: event.id, path: absolute, hash: latest?.hash || null, size: previous.size, at: Date.now(), operationGroup: group, versionId });
        this.recentDeletes = this.recentDeletes.filter((item) => Date.now() - item.at <= 8000);
        await this.registerActivity(event);
      }
      return;
    }

    if (stat.isDirectory()) {
      if (!previous || !previous.exists) {
        const event = this.audit.add({ action: 'directory-created', path: absolute, size: 0, operationGroup: group, restorable: true, source: 'filesystem', ...processInfo });
        this.baseline.set(absolute, { exists: true, type: 'directory', size: 0, mtimeMs: stat.mtimeMs });
        await this.registerActivity(event);
      }
      return;
    }
    if (!stat.isFile()) return;
    if (!previous || !previous.exists) {
      const version = await this.vault.saveVersion(absolute, { reason: 'created', operationGroup: group });
      const correlated = version ? this.recentDeletes.find((item) => item.hash && item.hash === version.hash && item.path !== absolute && Date.now() - item.at <= 8000) : null;
      let event;
      if (correlated) {
        const action = path.dirname(correlated.path) === path.dirname(absolute) ? 'renamed' : 'moved';
        this.audit.update(correlated.eventId, { restorable: false, correlated: true, correlatedPath: absolute });
        event = this.audit.add({
          action, path: absolute, fromPath: correlated.path, toPath: absolute, size: stat.size, versionId: version.id,
          operationGroup: correlated.operationGroup || group, restorable: true, source: 'filesystem', ...processInfo
        });
        this.recentDeletes = this.recentDeletes.filter((item) => item !== correlated);
      } else {
        const copySource = version ? this.vault.findVersionByHash(version.hash, absolute) : null;
        event = this.audit.add({ action: copySource ? 'copied' : 'created', path: absolute, fromPath: copySource?.path || null, toPath: absolute, size: stat.size, versionId: version?.id, operationGroup: group, restorable: Boolean(version), source: 'filesystem', ...processInfo });
      }
      this.baseline.set(absolute, { exists: true, type: 'file', size: stat.size, mtimeMs: stat.mtimeMs, latestVersionId: version?.id });
      await this.registerActivity(event); return;
    }

    if (stat.mtimeMs !== previous.mtimeMs || stat.size !== previous.size || eventType === 'change') {
      const before = this.vault.latest(absolute);
      const version = await this.vault.saveVersion(absolute, { reason: 'modified', operationGroup: group });
      if (version && version.id !== before?.id) {
        const event = this.audit.add({
          action: 'modified', path: absolute, size: stat.size, previousSize: previous.size,
          previousVersionId: before?.id || previous.latestVersionId || null, versionId: version.id,
          operationGroup: group, restorable: Boolean(before || previous.latestVersionId), source: 'filesystem', ...processInfo
        });
        await this.registerActivity(event);
      }
      this.baseline.set(absolute, { exists: true, type: 'file', size: stat.size, mtimeMs: stat.mtimeMs, latestVersionId: version?.id || before?.id || previous.latestVersionId });
    }
  }

  async registerActivity(event) {
    const now = Date.now();
    const settings = this.settingsStore.get();
    this.eventWindow.push({ at: now, event });
    this.eventWindow = this.eventWindow.filter((item) => now - item.at <= settings.monitoring.suspiciousWindowMs);
    const cooldown = settings.security.suspiciousCooldownSeconds * 1000;
    if (this.eventWindow.length >= settings.monitoring.suspiciousEventThreshold && now - this.lastAlertAt >= cooldown) {
      this.lastAlertAt = now;
      const paths = [...new Set(this.eventWindow.map((item) => item.event.path))].slice(0, 500);
      const mostRecentProcess = [...this.eventWindow].reverse().map((item) => item.event).find((item) => item.pid || item.program !== 'unknown') || event;
      const alert = {
        id: id('alert'), action: 'suspicious-activity', count: this.eventWindow.length,
        windowMs: settings.monitoring.suspiciousWindowMs, operationGroup: event.operationGroup,
        paths, program: mostRecentProcess.program || 'unknown', pid: mostRecentProcess.pid || null,
        executable: mostRecentProcess.executable || '', restorable: false, resolved: false,
        detectedAt: new Date().toISOString(), attributionWarning: 'The foreground application is only a best-effort hint and may not be the process that changed the files.'
      };
      this.alerts.set(alert.id, alert);
      this.audit.add(alert);
      if (settings.security.autoEmergencySnapshot) {
        try { alert.snapshot = await this.emergencySnapshot({ paths, reason: 'suspicious-activity', maxFiles: 1000 }); }
        catch (error) { alert.snapshotError = error.message; }
      }
      if (settings.monitoring.autoPauseOnSuspicious || ['pause-monitoring','emergency-and-pause'].includes(settings.security.containmentMode)) {
        this.suspiciousHold = true;
        this.runtimeSuspendedReason = 'suspicious-activity';
        await this.stop();
      }
      this.emit('suspicious', structuredClone(alert));
      this.eventWindow = [];
    }
    this.emit('event', event);
  }

  listAlerts() { return [...this.alerts.values()].map((alert) => structuredClone(alert)); }

  async respondToAlert(alertId, action) {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error('Security alert not found');
    let result;
    if (action === 'snapshot') result = await this.emergencySnapshot({ paths: alert.paths, reason: 'manual-containment', maxFiles: 5000 });
    else if (action === 'pause') result = await this.pause('security-alert');
    else if (action === 'resume-monitoring') result = await this.resume();
    else if (action === 'terminate-process') {
      if (!this.settingsStore.get().security.allowProcessTermination) throw new Error('Process termination is disabled in settings');
      if (!alert.pid || !this.platform?.terminateProcess) throw new Error('The suspected process cannot be stopped on this system');
      result = await this.platform.terminateProcess(alert.pid, { process: alert.program, executable: alert.executable });
    } else if (action === 'suspend-process') {
      if (!this.settingsStore.get().security.allowProcessTermination) throw new Error('Process containment is disabled in settings');
      if (!alert.pid || !this.platform?.suspendProcess) throw new Error('Process suspension is unavailable on this system');
      result = await this.platform.suspendProcess(alert.pid, { process: alert.program, executable: alert.executable });
    } else if (action === 'dismiss') result = true;
    else throw new Error('Unknown security response');
    alert.resolved = ['dismiss','terminate-process','suspend-process'].includes(action);
    alert.response = action; alert.respondedAt = new Date().toISOString();
    this.audit.add({ action: 'security-response', path: alert.program || 'unknown', alertId, response: action, result, restorable: false });
    this.emit('status', this.status());
    return { alert: structuredClone(alert), result };
  }

  async emergencySnapshot({ paths = null, reason = 'emergency', maxFiles = 25000 } = {}) {
    const settings = this.settingsStore.get();
    const group = id('emergency');
    const selected = paths ? new Set(paths.map((item) => path.resolve(item))) : null;
    let saved = 0; let skipped = 0;
    for (const [filePath, state] of this.baseline.entries()) {
      if (saved + skipped >= maxFiles) break;
      if (!state.exists || (selected && !selected.has(path.resolve(filePath)))) continue;
      const version = await this.vault.saveVersion(filePath, { reason, operationGroup: group, force: true });
      if (version) saved += 1; else skipped += 1;
    }
    const event = this.audit.add({ action: 'emergency-snapshot', count: saved, skipped, operationGroup: group, restorable: false, folders: settings.monitoring.watchedFolders, reason });
    this.emit('event', event);
    return { group, saved, skipped, limited: saved + skipped >= maxFiles };
  }
}

module.exports = { WatcherService };
