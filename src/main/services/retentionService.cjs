const path = require('node:path');
const { within } = require('../../shared/utils.cjs');

class RetentionService {
  constructor(paths, settingsStore, vaultService, auditStore, clipboardService, logger, checkpointService = null, watcherService = null) {
    this.paths = paths;
    this.settingsStore = settingsStore;
    this.vault = vaultService;
    this.audit = auditStore;
    this.clipboard = clipboardService;
    this.logger = logger;
    this.checkpoints = checkpointService;
    this.watcher = watcherService;
  }

  vaultSize() { return Object.values(this.vault.index.objects).reduce((sum, object) => sum + Number(object.size || 0), 0); }

  forecast() {
    const settings = this.settingsStore.get();
    const events = this.audit.list({ limit: 100000 });
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recent = events.filter((event) => new Date(event.timestamp).getTime() >= sevenDaysAgo);
    const recentBytes = recent.reduce((sum, event) => sum + Number(event.size || 0), 0);
    const averageDailyBytes = recentBytes / 7;
    const current = this.vaultSize();
    const remaining = Math.max(0, settings.storage.maxVaultBytes - current);
    const days = averageDailyBytes > 0 ? remaining / averageDailyBytes : null;
    return {
      currentBytes: current, maxBytes: settings.storage.maxVaultBytes, remainingBytes: remaining,
      recentDailyBytes: averageDailyBytes, estimatedDaysRemaining: days,
      projected30DayBytes: averageDailyBytes * 30,
      status: settings.storage.maxVaultBytes > 0 && current / settings.storage.maxVaultBytes >= 0.9 ? 'critical' : current / settings.storage.maxVaultBytes >= 0.75 ? 'warning' : 'healthy'
    };
  }

  projectForPath(filePath, settings = this.settingsStore.get()) {
    const absolute = path.resolve(filePath);
    return (settings.projectSpaces || []).find((space) => (space.folders || []).some((folder) => within(folder, absolute))) || null;
  }

  retentionDaysForPath(filePath, settings = this.settingsStore.get()) {
    const project = this.projectForPath(filePath, settings);
    if (project?.retentionDays) return Math.max(1, Number(project.retentionDays));
    const extension = path.extname(path.resolve(filePath)).toLowerCase();
    const profile = (settings.profiles || []).find((item) => (item.extensions || []).includes(extension));
    return Math.max(1, Number(profile?.retentionDays || settings.storage.retentionDays));
  }

  protectedVersionIds() {
    const protectedIds = new Set();
    for (const checkpoint of this.checkpoints?.list?.() || []) for (const versionId of checkpoint.versions || []) protectedIds.add(versionId);
    for (const item of this.vault.trashIndex || []) {
      if (item.versionId) protectedIds.add(item.versionId);
      for (const entry of item.entries || []) if (entry.versionId) protectedIds.add(entry.versionId);
    }
    return protectedIds;
  }

  matchingTrashRule(item, settings) {
    const ext = path.extname(item.originalPath || '').toLowerCase();
    return (settings.customTrashRules || []).find((rule) => rule.enabled !== false && (
      (rule.folder && item.originalPath && within(rule.folder, item.originalPath)) || (rule.extension && rule.extension === ext)
    ));
  }

  cleanup() {
    if (this.watcher?.status?.().suspiciousHold) return { skipped: true, reason: 'suspicious-activity-hold', forecast: this.forecast() };
    const settings = this.settingsStore.get();
    const referenced = this.protectedVersionIds();
    let removedVersions = 0;
    for (const [filePath, versions] of Object.entries(this.vault.index.files)) {
      const project = this.projectForPath(filePath, settings);
      const retentionDays = this.retentionDaysForPath(filePath, settings);
      const cutoff = Date.now() - retentionDays * 86400000;
      const keep = [];
      const newestId = versions[0]?.id;
      for (const version of versions) {
        const protectedFavorite = version.favorite && settings.storage.keepFavoriteForever !== false;
        const protectedByProject = Boolean(project?.locked);
        const protectedByReference = referenced.has(version.id);
        const recent = new Date(version.createdAt).getTime() >= cutoff;
        if (version.id === newestId || protectedFavorite || protectedByProject || protectedByReference || recent) keep.push(version);
        else { this.vault.releaseObject(version.hash); removedVersions += 1; }
      }
      if (keep.length) this.vault.index.files[filePath] = keep;
      else delete this.vault.index.files[filePath];
    }
    this.vault.saveIndex();

    const timelineCutoff = new Date(Date.now() - settings.privacy.autoDeleteTimelineDays * 86400000);
    const removedEvents = this.audit.clearBefore(timelineCutoff);
    let removedTrash = 0;
    const now = Date.now();
    for (const item of [...this.vault.trashIndex]) {
      const rule = this.matchingTrashRule(item, settings);
      const days = Number(rule?.retentionDays || settings.storage.trashRetentionDays || 30);
      if (!item.favorite && now - new Date(item.timestamp).getTime() > days * 86400000) {
        if (item.type === 'directory') for (const entry of item.entries || []) this.vault.removeVersion(entry.versionId);
        else this.vault.removeVersion(item.versionId);
        this.vault.trashIndex = this.vault.trashIndex.filter((entry) => entry.id !== item.id);
        removedTrash += 1;
      }
    }
    this.vault.saveTrashIndex();
    if (this.clipboard) this.clipboard.cleanup();
    return { skipped: false, removedVersions, removedEvents, removedTrash, preservedReferences: referenced.size, forecast: this.forecast() };
  }
}

module.exports = { RetentionService };
