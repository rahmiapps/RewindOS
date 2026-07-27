const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { id, nowIso, formatBytes, copyTreeSafe, ensureDir } = require('../../shared/utils.cjs');
const { safeString, isWithin, assertNoSymlinkComponents } = require('../../shared/securityUtils.cjs');

class AppService {
  constructor(services) { Object.assign(this, services); }

  getState() {
    const settings = this.settingsStore.getPublic();
    const auth = this.authService.status();
    const visibleSettings = auth.unlocked ? settings : {
      language: settings.language, firstRunComplete: settings.firstRunComplete, appearance: settings.appearance,
      privacy: { appPinEnabled: settings.privacy.appPinEnabled, hideFileNames: true },
      general: { notifications: settings.general.notifications },
      storage: { encryptionEnabled: settings.storage.encryptionEnabled, maxVaultBytes: settings.storage.maxVaultBytes },
      monitoring: { paused: true, watchedFolders: [] }
    };
    const vault = this.vaultService.stats();
    const timeline = auth.unlocked ? this.auditStore.list({ limit: 1000 }) : [];
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const today = timeline.filter((event) => new Date(event.timestamp) >= todayStart);
    const restorable = auth.unlocked ? this.auditStore.list({ restorable: true, limit: 100000 }).filter((event) => !event.restored).length : 0;
    const forecast = this.retentionService.forecast();
    const recentRestorations = timeline.filter((event) => event.action === 'restored' || event.restored).slice(0, 10);
    const warningActions = new Set(['suspicious-activity', 'watch-error', 'restore-failed', 'integrity-failed', 'low-storage', 'skipped']);
    const recentWarnings = timeline.filter((event) => warningActions.has(event.action)).slice(0, 10);
    const securityAlerts = auth.unlocked ? this.watcherService.listAlerts().filter((alert) => !alert.resolved).slice(0, 20) : [];
    return {
      settings: visibleSettings, auth, watcher: this.watcherService.status(),
      stats: {
        todayChanges: today.length, protectedFiles: vault.protectedFiles, versions: vault.versions, restorable,
        storageBytes: vault.bytes, storageFormatted: formatBytes(vault.bytes), storageMaxBytes: settings.storage.maxVaultBytes,
        storagePercent: settings.storage.maxVaultBytes ? Math.min(100, vault.bytes / settings.storage.maxVaultBytes * 100) : 0, forecast
      },
      recentEvents: timeline.slice(0, 20), recentRestorations, recentWarnings, securityAlerts, capabilities: this.platformAdapter.capabilities(), crashRecovery: this.crashRecovery || null,
      encryption: this.cryptoService.getProtectionStatus(),
      platform: { os: process.platform, arch: process.arch, release: os.release(), user: os.userInfo().username }
    };
  }

  listProfiles() { return this.settingsStore.get().profiles || []; }

  saveProfile(profile = {}) {
    const profiles = [...(this.settingsStore.get().profiles || [])];
    const profileId = safeString(profile.id || id('profile'), { maxLength: 100 });
    const candidate = {
      id: profileId,
      name: { de: safeString(profile.name?.de || profile.name || 'Neues Profil', { maxLength: 120 }), en: safeString(profile.name?.en || profile.name || 'New profile', { maxLength: 120 }) },
      extensions: Array.isArray(profile.extensions) ? profile.extensions : [], retentionDays: Number(profile.retentionDays || 90),
      maxVersions: Number(profile.maxVersions || 30), priority: profile.priority || 'normal'
    };
    const index = profiles.findIndex((item) => item.id === profileId);
    if (index >= 0) profiles[index] = candidate; else profiles.push(candidate);
    const persisted = this.settingsStore.update({ profiles }).profiles;
    return persisted.find((item) => item.id === profileId);
  }

  removeProfile(profileId) {
    const builtIns = new Set(['documents', 'development', 'photos', 'gaming']);
    if (builtIns.has(profileId)) throw new Error('Built-in protection profiles cannot be removed');
    const profiles = (this.settingsStore.get().profiles || []).filter((item) => item.id !== profileId);
    return this.settingsStore.update({ profiles }).profiles;
  }

  listProjectSpaces() { return this.settingsStore.get().projectSpaces || []; }

  saveProjectSpace(space = {}) {
    const list = [...(this.settingsStore.get().projectSpaces || [])];
    const spaceId = safeString(space.id || id('space'), { maxLength: 100 });
    const candidate = {
      id: spaceId, name: safeString(space.name || 'Project', { maxLength: 160 }),
      folders: [...new Set((space.folders || []).map((folder) => path.resolve(folder)))],
      retentionDays: Number(space.retentionDays || 180), maxVersions: Number(space.maxVersions || 100),
      locked: Boolean(space.locked), color: space.color || '#6d7cff', createdAt: space.createdAt || nowIso()
    };
    const index = list.findIndex((item) => item.id === spaceId);
    if (index >= 0) list[index] = candidate; else list.push(candidate);
    const persisted = this.settingsStore.update({ projectSpaces: list }).projectSpaces;
    return persisted.find((item) => item.id === spaceId);
  }

  removeProjectSpace(spaceId) {
    const current = this.settingsStore.get().projectSpaces || [];
    const target = current.find((item) => item.id === spaceId);
    if (target?.locked) throw new Error('Unlock the project protection space before removing it');
    return this.settingsStore.update({ projectSpaces: current.filter((item) => item.id !== spaceId) }).projectSpaces;
  }

  statistics() {
    const all = this.auditStore.list({ limit: 100000 });
    const byAction = {}; const byDay = {}; const byFolder = {}; const byProgram = {};
    let restored = 0; let failures = 0; let recoveredBytes = 0;
    for (const event of all) {
      byAction[event.action] = (byAction[event.action] || 0) + 1;
      const day = String(event.timestamp || '').slice(0, 10); if (day) byDay[day] = (byDay[day] || 0) + 1;
      if (event.path) { const folder = path.dirname(event.path); byFolder[folder] = (byFolder[folder] || 0) + 1; }
      if (event.program) byProgram[event.program] = (byProgram[event.program] || 0) + 1;
      if (event.action === 'restored' || event.restored) { restored += 1; recoveredBytes += Number(event.size || 0); }
      if (['watch-error', 'restore-failed', 'skipped'].includes(event.action)) failures += 1;
    }
    const top = (object, key) => Object.entries(object).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ [key]: name, count }));
    return {
      totalEvents: all.length, byAction, byDay, topFolders: top(byFolder, 'folder'), topPrograms: top(byProgram, 'program'),
      restored, recoveredBytes, failures, successRate: restored + failures ? restored / (restored + failures) : null,
      vault: this.vaultService.stats(), forecast: this.retentionService.forecast()
    };
  }

  async migrateVault(newPath) {
    const target = path.resolve(newPath || '');
    if (!newPath) throw new Error('A vault destination is required');
    const current = path.resolve(this.paths.vaultDir);
    if (target === current) return { moved: false, current, target, restartRequired: false };
    if (isWithin(current, target) || isWithin(target, current) || isWithin(this.paths.baseDir, target)) throw new Error('The new vault must be a separate folder outside the active RewindOS data directory');
    assertNoSymlinkComponents(target);
    await this.watcherService.stop(); this.clipboardService.stop();
    ensureDir(target);
    await copyTreeSafe(current, target, { maxBytes: 2 * 1024 * 1024 * 1024 * 1024 });
    const sourceObjects = fs.readdirSync(this.paths.objectsDir).filter((name) => name.endsWith('.rwo')).length;
    const targetObjects = fs.existsSync(path.join(target, 'objects')) ? fs.readdirSync(path.join(target, 'objects')).filter((name) => name.endsWith('.rwo')).length : 0;
    if (sourceObjects !== targetObjects) { await fsp.rm(target, { recursive: true, force: true }); throw new Error('Vault migration verification failed'); }
    this.settingsStore.update({ storage: { vaultPath: target }, monitoring: { paused: true } });
    return { moved: true, current, target, restartRequired: true, verifiedObjects: targetObjects };
  }
}

module.exports = { AppService };
