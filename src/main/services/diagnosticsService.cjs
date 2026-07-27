const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { nowIso, atomicWriteJson } = require('../../shared/utils.cjs');

class DiagnosticsService {
  constructor(paths, settingsStore, watcherService, vaultService, logger, platformAdapter, performanceService = null, cryptoService = null, integrityService = null) {
    this.paths = paths; this.settingsStore = settingsStore; this.watcher = watcherService; this.vault = vaultService;
    this.logger = logger; this.platform = platformAdapter; this.performance = performanceService;
    this.crypto = cryptoService || vaultService.crypto; this.integrity = integrityService;
  }

  writable(target) {
    try { fs.accessSync(target, fs.constants.R_OK | fs.constants.W_OK); return true; } catch { return false; }
  }

  get() {
    const settings = this.settingsStore.get();
    const issues = [];
    for (const folder of settings.monitoring.watchedFolders) {
      try {
        const stat = fs.lstatSync(folder);
        if (!stat.isDirectory()) issues.push({ severity: 'warning', code: 'watched-path-not-directory', path: folder });
        if (stat.isSymbolicLink()) issues.push({ severity: 'critical', code: 'watched-folder-is-symlink', path: folder });
        if (!this.writable(folder)) issues.push({ severity: 'warning', code: 'watched-folder-not-writable', path: folder });
      } catch { issues.push({ severity: 'warning', code: 'watched-folder-missing', path: folder }); }
    }
    if (!fs.existsSync(this.paths.masterKeyFile)) issues.push({ severity: 'critical', code: 'encryption-key-missing' });
    if (!this.writable(this.paths.baseDir) || !this.writable(this.paths.vaultDir)) issues.push({ severity: 'critical', code: 'data-folder-not-writable' });
    const vaultStats = this.vault.stats();
    if (vaultStats.bytes > settings.storage.maxVaultBytes * 0.9) issues.push({ severity: 'warning', code: 'storage-nearly-full' });
    const freeMemory = os.freemem();
    if (freeMemory < 512 * 1024 * 1024) issues.push({ severity: 'warning', code: 'low-memory' });
    if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland') issues.push({ severity: 'info', code: 'wayland-window-restore-limited' });
    const keyProtection = this.crypto?.getProtectionStatus?.() || null;
    if (keyProtection?.mode === 'file-permissions') issues.push({ severity: 'info', code: 'key-protected-by-file-permissions' });
    const result = {
      generatedAt: nowIso(), platform: process.platform, arch: process.arch,
      runtime: { node: process.versions.node, electron: process.versions.electron || null, chrome: process.versions.chrome || null },
      paths: { dataDirectoryWritable: this.writable(this.paths.baseDir), vaultWritable: this.writable(this.paths.vaultDir) },
      watcher: this.watcher.status(), vault: vaultStats, freeMemory, totalMemory: os.totalmem(),
      capabilities: this.platform.capabilities(), power: this.performance?.status() || null,
      encryption: { enabled: settings.storage.encryptionEnabled, metadataEncrypted: settings.privacy.databaseEncryption !== false, keyProtection },
      security: { localOnly: true, rendererNetworkDisabled: true, symlinkFollowing: settings.monitoring.followSymlinks, processTerminationAllowed: settings.security.allowProcessTermination },
      issues, healthy: !issues.some((issue) => issue.severity === 'critical')
    };
    return result;
  }

  export(destination) { const result = this.get(); atomicWriteJson(path.resolve(destination), result); return destination; }
}

module.exports = { DiagnosticsService };
