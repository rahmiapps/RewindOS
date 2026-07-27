const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_SETTINGS, DEFAULT_HOTKEYS, deepMerge } = require('../../shared/defaults.cjs');
const { atomicWriteJson, readJson, normalizePath, within } = require('../../shared/utils.cjs');
const {
  stripDangerousKeys, clampNumber, allowedEnum, normalizeStringArray, safeString
} = require('../../shared/securityUtils.cjs');


function sanitizeAccelerator(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 128) return fallback;
  const parts = raw.split('+').map((part) => part.trim()).filter(Boolean);
  const modifiers = [];
  let key = '';
  const modifierMap = new Map([
    ['commandorcontrol', 'CommandOrControl'], ['ctrl', 'CommandOrControl'], ['control', 'CommandOrControl'],
    ['command', 'Command'], ['cmd', 'Command'], ['super', 'Super'], ['meta', 'Super'], ['alt', 'Alt'], ['shift', 'Shift']
  ]);
  for (const part of parts) {
    const mapped = modifierMap.get(part.toLowerCase());
    if (mapped) modifiers.push(mapped);
    else if (!key) key = part;
    else return fallback;
  }
  if (!modifiers.length || !key) return fallback;
  const normalizedKey = /^[a-z]$/i.test(key) ? key.toUpperCase() : key;
  if (!/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space|Tab|Enter|Esc|Up|Down|Left|Right|Home|End|PageUp|PageDown|Insert|Delete|Backspace|Plus|[-,./;'\[\]\\])$/.test(normalizedKey)) return fallback;
  return [...new Set(modifiers), normalizedKey].join('+');
}

function boolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

class SettingsStore {
  constructor(paths, logger) {
    this.paths = paths;
    this.logger = logger;
    const stored = stripDangerousKeys(readJson(paths.settingsFile, {}));
    this.value = deepMerge(DEFAULT_SETTINGS, stored);
    if (!this.value.storage.vaultPath) this.value.storage.vaultPath = paths.vaultDir;
    this.sanitize();
    this.save();
  }

  sanitize() {
    const v = this.value;
    v.schemaVersion = 3;
    v.language = allowedEnum(v.language, ['de', 'en'], 'de');
    v.firstRunComplete = boolean(v.firstRunComplete, false);

    v.appearance.theme = allowedEnum(v.appearance.theme, ['system', 'dark', 'light'], 'system');
    v.appearance.accent = /^#[0-9a-f]{6}$/i.test(String(v.appearance.accent || '')) ? v.appearance.accent : '#6d7cff';
    v.appearance.fontScale = clampNumber(v.appearance.fontScale, 0.75, 1.6, 1);
    v.appearance.timelineDensity = allowedEnum(v.appearance.timelineDensity, ['comfortable', 'compact', 'dense'], 'comfortable');
    for (const key of ['transparency', 'animations', 'compact', 'highContrast', 'reducedMotion']) v.appearance[key] = boolean(v.appearance[key], DEFAULT_SETTINGS.appearance[key]);

    v.general.homePage = allowedEnum(v.general.homePage, ['dashboard','timeline','checkpoints','vault','versions','clipboard','workspaces','projects','profiles','search','security','statistics','diagnostics','settings'], 'dashboard');
    for (const key of ['launchAtStartup','startInBackground','closeToTray','notifications','trayIcon','quietFullscreen']) v.general[key] = boolean(v.general[key], DEFAULT_SETTINGS.general[key]);

    v.storage.vaultPath = path.resolve(v.storage.vaultPath || this.paths.vaultDir);
    v.storage.maxVaultBytes = clampNumber(v.storage.maxVaultBytes, 512 * 1024 * 1024, Number.MAX_SAFE_INTEGER, DEFAULT_SETTINGS.storage.maxVaultBytes);
    v.storage.reserveBytes = clampNumber(v.storage.reserveBytes, 0, Number.MAX_SAFE_INTEGER, DEFAULT_SETTINGS.storage.reserveBytes);
    v.storage.maxFileBytes = clampNumber(v.storage.maxFileBytes, 1024 * 1024, Number.MAX_SAFE_INTEGER, DEFAULT_SETTINGS.storage.maxFileBytes);
    v.storage.retentionDays = clampNumber(v.storage.retentionDays, 1, 36500, 90);
    v.storage.trashRetentionDays = clampNumber(v.storage.trashRetentionDays, 1, 36500, 30);
    v.storage.maxVersionsPerFile = clampNumber(v.storage.maxVersionsPerFile, 1, 100000, 30);
    v.storage.mirrorIntervalHours = clampNumber(v.storage.mirrorIntervalHours, 1, 8760, 24);
    for (const key of ['compression','encryptionEnabled','mirrorEnabled','portableMode','keepFavoriteForever','autoCleanup','mirrorOnExit']) v.storage[key] = boolean(v.storage[key], DEFAULT_SETTINGS.storage[key]);
    v.storage.mirrorPath = v.storage.mirrorPath ? path.resolve(safeString(v.storage.mirrorPath)) : '';

    const normalizeExistingFolders = (items) => [...new Set(normalizeStringArray(items).map((p) => path.resolve(p)).filter((p) => fs.existsSync(p)))];
    v.monitoring.watchedFolders = normalizeExistingFolders(v.monitoring.watchedFolders)
      .filter((folder) => !within(this.paths.baseDir, folder) && !within(v.storage.vaultPath, folder));
    v.monitoring.excludedFolders = [...new Set(normalizeStringArray(v.monitoring.excludedFolders).map((p) => path.resolve(p)))];
    v.monitoring.excludedExtensions = normalizeStringArray(v.monitoring.excludedExtensions, { lower: true, maxLength: 64 })
      .map((ext) => ext.startsWith('.') ? ext : `.${ext}`);
    v.monitoring.excludedPrograms = normalizeStringArray(v.monitoring.excludedPrograms, { lower: true, maxLength: 260 });
    for (const key of ['enabled','paused','includeHidden','includeSystem','includeRemovable','includeNetwork','snapshotExistingFilesOnStart','adaptiveVersioning','healthChecks','autoPauseOnSuspicious']) v.monitoring[key] = boolean(v.monitoring[key], DEFAULT_SETTINGS.monitoring[key]);
    // Following symbolic links can escape protected roots and is therefore intentionally never enabled.
    v.monitoring.followSymlinks = false;
    v.monitoring.debounceMs = clampNumber(v.monitoring.debounceMs, 100, 30000, 650);
    v.monitoring.suspiciousEventThreshold = clampNumber(v.monitoring.suspiciousEventThreshold, 5, 100000, 40);
    v.monitoring.suspiciousWindowMs = clampNumber(v.monitoring.suspiciousWindowMs, 1000, 300000, 10000);
    v.monitoring.stableReadRetries = clampNumber(v.monitoring.stableReadRetries, 1, 10, 3);
    v.monitoring.stableReadDelayMs = clampNumber(v.monitoring.stableReadDelayMs, 25, 5000, 180);

    for (const key of ['create','delete','modify','rename','move','copy','massActions','clipboard','workspace','settings','dryRunByDefault','testRestoreFirst']) v.undoRules[key] = boolean(v.undoRules[key], DEFAULT_SETTINGS.undoRules[key]);
    v.undoRules.defaultConflictRule = allowedEnum(v.undoRules.defaultConflictRule, ['rename','replace','keep-newer','keep-older','skip'], 'rename');

    v.privacy.localOnly = true;
    for (const key of ['appPinEnabled','hideFileNames','disablePreviews','privateMode','clearClipboardOnLock','databaseEncryption']) v.privacy[key] = boolean(v.privacy[key], DEFAULT_SETTINGS.privacy[key]);
    v.privacy.pinSalt = safeString(v.privacy.pinSalt || '', { maxLength: 256 });
    v.privacy.pinHash = safeString(v.privacy.pinHash || '', { maxLength: 256 });
    v.privacy.autoDeleteTimelineDays = clampNumber(v.privacy.autoDeleteTimelineDays, 1, 36500, 365);
    v.privacy.sensitiveApps = normalizeStringArray(v.privacy.sensitiveApps, { lower: true, maxLength: 260 });
    v.privacy.sensitiveFolders = [...new Set(normalizeStringArray(v.privacy.sensitiveFolders).map((p) => path.resolve(p)))];

    for (const key of ['enabled','captureText','captureImages','captureLinks','captureFilePaths','protectedByDefault','ignorePasswords']) v.clipboard[key] = boolean(v.clipboard[key], DEFAULT_SETTINGS.clipboard[key]);
    v.clipboard.maxItems = clampNumber(v.clipboard.maxItems, 1, 100000, 500);
    v.clipboard.retentionDays = clampNumber(v.clipboard.retentionDays, 1, 36500, 30);
    v.clipboard.pollIntervalMs = clampNumber(v.clipboard.pollIntervalMs, 250, 60000, 1500);

    v.performance.quietMode = boolean(v.performance.quietMode, false);
    v.performance.onlyHeavyTasksOnAC = boolean(v.performance.onlyHeavyTasksOnAC, true);
    v.performance.reduceDuringGaming = boolean(v.performance.reduceDuringGaming, true);
    v.performance.gamingProcesses = normalizeStringArray(v.performance.gamingProcesses, { lower: true, maxLength: 260 });
    v.performance.pauseOnBatteryBelow = clampNumber(v.performance.pauseOnBatteryBelow, 0, 100, 20);
    v.performance.maxConcurrentCopies = clampNumber(v.performance.maxConcurrentCopies, 1, 16, 2);
    v.performance.scanIntervalMinutes = clampNumber(v.performance.scanIntervalMinutes, 5, 10080, 60);

    for (const key of ['onBackup','onDelete','onMassAction','onLowStorage','onFailure','onSuspicious','dailySummary']) v.notifications[key] = boolean(v.notifications[key], DEFAULT_SETTINGS.notifications[key]);
    v.notifications.dailySummaryHour = clampNumber(v.notifications.dailySummaryHour, 0, 23, 19);

    v.security.containmentMode = allowedEnum(v.security.containmentMode, ['warn','pause-monitoring','emergency-and-pause'], 'warn');
    for (const key of ['allowProcessTermination','autoEmergencySnapshot','verifyEveryRestore']) v.security[key] = boolean(v.security[key], DEFAULT_SETTINGS.security[key]);
    // Symlink restores remain blocked even when an imported settings file attempts to disable the guard.
    v.security.rejectSymlinkRestores = true;
    v.security.suspiciousCooldownSeconds = clampNumber(v.security.suspiciousCooldownSeconds, 10, 3600, 60);
    v.security.lockAfterMinutes = clampNumber(v.security.lockAfterMinutes, 0, 1440, 0);
    v.security.maxPinFailures = clampNumber(v.security.maxPinFailures, 3, 20, 5);
    v.security.pinLockoutSeconds = clampNumber(v.security.pinLockoutSeconds, 5, 3600, 30);

    for (const key of ['includeScreenshot','includeClipboard','restoreClipboard','restoreWindowPositions','includeSystemState','restoreSystemState']) v.workspace[key] = boolean(v.workspace[key], DEFAULT_SETTINGS.workspace[key]);
    v.updates.enabled = boolean(v.updates.enabled, false);
    v.updates.checkOnStart = boolean(v.updates.checkOnStart, false);
    v.updates.repository = safeString(v.updates.repository || 'rahmiapps/RewindOS', { maxLength: 200 });

    const cleanHotkeys = {}; const usedHotkeys = new Set();
    for (const [key, fallback] of Object.entries(DEFAULT_HOTKEYS)) {
      let accelerator = sanitizeAccelerator(v.hotkeys?.[key], fallback);
      if (usedHotkeys.has(accelerator)) accelerator = fallback;
      if (usedHotkeys.has(accelerator)) accelerator = '';
      cleanHotkeys[key] = accelerator; if (accelerator) usedHotkeys.add(accelerator);
    }
    v.hotkeys = cleanHotkeys;

    v.profiles = (Array.isArray(v.profiles) ? v.profiles : []).slice(0, 500).map((profile, index) => ({
      id: safeString(profile.id || `profile-${index}`, { maxLength: 100 }),
      name: {
        de: safeString(profile.name?.de || profile.name || `Profil ${index + 1}`, { maxLength: 120 }),
        en: safeString(profile.name?.en || profile.name || `Profile ${index + 1}`, { maxLength: 120 })
      },
      retentionDays: clampNumber(profile.retentionDays, 1, 36500, v.storage.retentionDays),
      maxVersions: clampNumber(profile.maxVersions, 1, 100000, v.storage.maxVersionsPerFile),
      priority: allowedEnum(profile.priority, ['low','normal','high'], 'normal'),
      extensions: normalizeStringArray(profile.extensions, { lower: true, maxLength: 64 }).map((ext) => ext.startsWith('.') ? ext : `.${ext}`)
    }));

    v.projectSpaces = (Array.isArray(v.projectSpaces) ? v.projectSpaces : []).slice(0, 1000).map((space, index) => ({
      id: safeString(space.id || `project-${index}`, { maxLength: 100 }),
      name: safeString(space.name || `Project ${index + 1}`, { maxLength: 160 }),
      folders: normalizeExistingFolders(space.folders).filter((folder) => !within(this.paths.baseDir, folder)),
      retentionDays: clampNumber(space.retentionDays, 1, 36500, 180),
      maxVersions: clampNumber(space.maxVersions, 1, 100000, 100),
      locked: boolean(space.locked, false),
      color: /^#[0-9a-f]{6}$/i.test(String(space.color || '')) ? space.color : '#6d7cff',
      createdAt: safeString(space.createdAt || new Date().toISOString(), { maxLength: 64 })
    }));

    v.customTrashRules = (Array.isArray(v.customTrashRules) ? v.customTrashRules : []).slice(0, 1000).map((rule, index) => ({
      id: safeString(rule.id || `trash-rule-${index}`, { maxLength: 100 }),
      folder: rule.folder ? path.resolve(safeString(rule.folder, { maxLength: 32768 })) : '',
      extension: rule.extension ? safeString(rule.extension, { maxLength: 64 }).toLowerCase().replace(/^([^.]|$)/, '.$1') : '',
      retentionDays: clampNumber(rule.retentionDays, 1, 36500, v.storage.trashRetentionDays),
      enabled: boolean(rule.enabled, true)
    })).filter((rule) => rule.folder || rule.extension);

    for (const key of ['keyboardNavigation','screenReaderLabels','highContrast','largeText','reducedMotion']) v.accessibility[key] = boolean(v.accessibility[key], DEFAULT_SETTINGS.accessibility[key]);
    v.multiUser.enabled = true;
    v.multiUser.isolateByOperatingSystemUser = true;
  }

  get() { return structuredClone(this.value); }

  getPublic() {
    const value = this.get();
    if (value.privacy) { delete value.privacy.pinSalt; delete value.privacy.pinHash; }
    return value;
  }

  reset({ preserveLanguage = true } = {}) {
    const language = this.value.language;
    const firstRunComplete = this.value.firstRunComplete;
    this.value = structuredClone(DEFAULT_SETTINGS);
    if (preserveLanguage) { this.value.language = language; this.value.firstRunComplete = firstRunComplete; }
    this.value.storage.vaultPath = this.paths.vaultDir;
    this.sanitize();
    this.save();
    return this.get();
  }

  update(patch) {
    const clean = stripDangerousKeys(patch || {});
    this.value = deepMerge(this.value, clean);
    this.sanitize();
    this.save();
    return this.get();
  }

  setPath(dotPath, value) {
    const keys = String(dotPath).split('.');
    if (keys.some((key) => ['__proto__','prototype','constructor'].includes(key))) throw new Error('Invalid settings path');
    let target = this.value;
    for (let i = 0; i < keys.length - 1; i += 1) {
      if (!target[keys[i]] || typeof target[keys[i]] !== 'object') throw new Error('Unknown settings path');
      target = target[keys[i]];
    }
    if (!(keys.at(-1) in target)) throw new Error('Unknown settings path');
    target[keys.at(-1)] = stripDangerousKeys(value);
    this.sanitize();
    this.save();
    return this.get();
  }

  addWatchedFolder(folder) {
    const normalized = normalizePath(folder);
    const stat = fs.lstatSync(normalized);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Only real local folders can be protected');
    if (within(this.paths.baseDir, normalized) || within(this.value.storage.vaultPath, normalized)) throw new Error('RewindOS data folders cannot protect themselves');
    if (!this.value.monitoring.watchedFolders.includes(normalized)) {
      this.value.monitoring.watchedFolders.push(normalized);
      this.sanitize();
      this.save();
    }
    return this.get();
  }

  removeWatchedFolder(folder) {
    const normalized = normalizePath(folder);
    this.value.monitoring.watchedFolders = this.value.monitoring.watchedFolders.filter((p) => p !== normalized);
    this.save();
    return this.get();
  }

  save() { atomicWriteJson(this.paths.settingsFile, this.value); }
}

module.exports = { SettingsStore };
