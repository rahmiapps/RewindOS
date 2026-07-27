const path = require('node:path');
const os = require('node:os');

const DEFAULT_HOTKEYS = {
  undoLast: 'CommandOrControl+Alt+Z',
  openTimeline: 'CommandOrControl+Alt+T',
  createCheckpoint: 'CommandOrControl+Alt+S',
  pauseMonitoring: 'CommandOrControl+Alt+P',
  openClipboard: 'CommandOrControl+Alt+C',
  emergencySnapshot: 'CommandOrControl+Alt+E'
};

const DEFAULT_SETTINGS = {
  schemaVersion: 3,
  firstRunComplete: false,
  language: 'de',
  appearance: {
    theme: 'system',
    accent: '#6d7cff',
    transparency: true,
    animations: true,
    compact: false,
    fontScale: 1,
    highContrast: false,
    reducedMotion: false,
    timelineDensity: 'comfortable'
  },
  general: {
    launchAtStartup: false,
    startInBackground: false,
    closeToTray: true,
    notifications: true,
    trayIcon: true,
    homePage: 'dashboard',
    quietFullscreen: true
  },
  storage: {
    vaultPath: '',
    maxVaultBytes: 20 * 1024 * 1024 * 1024,
    reserveBytes: 3 * 1024 * 1024 * 1024,
    retentionDays: 90,
    trashRetentionDays: 30,
    maxVersionsPerFile: 30,
    maxFileBytes: 1024 * 1024 * 1024,
    compression: false,
    encryptionEnabled: true,
    mirrorPath: '',
    mirrorEnabled: false,
    portableMode: false,
    keepFavoriteForever: true,
    autoCleanup: true,
    mirrorIntervalHours: 24,
    mirrorOnExit: false
  },
  monitoring: {
    enabled: true,
    paused: false,
    watchedFolders: [],
    excludedFolders: [
      path.join(os.homedir(), '.cache'),
      path.join(os.homedir(), 'AppData', 'Local', 'Temp')
    ],
    excludedExtensions: ['.tmp', '.temp', '.part', '.crdownload', '.lock'],
    excludedPrograms: [],
    includeHidden: false,
    includeSystem: false,
    includeRemovable: false,
    includeNetwork: false,
    snapshotExistingFilesOnStart: true,
    debounceMs: 650,
    suspiciousEventThreshold: 40,
    suspiciousWindowMs: 10000,
    adaptiveVersioning: true,
    healthChecks: true,
    followSymlinks: false,
    stableReadRetries: 3,
    stableReadDelayMs: 180,
    autoPauseOnSuspicious: true
  },
  undoRules: {
    create: true,
    delete: true,
    modify: true,
    rename: true,
    move: true,
    copy: true,
    massActions: true,
    clipboard: true,
    workspace: true,
    settings: true,
    defaultConflictRule: 'rename',
    dryRunByDefault: true,
    testRestoreFirst: false
  },
  privacy: {
    localOnly: true,
    appPinEnabled: false,
    pinSalt: '',
    pinHash: '',
    hideFileNames: false,
    disablePreviews: false,
    privateMode: false,
    clearClipboardOnLock: false,
    autoDeleteTimelineDays: 365,
    sensitiveApps: ['1password', 'bitwarden', 'keepass', 'lastpass'],
    sensitiveFolders: [],
    databaseEncryption: true
  },
  clipboard: {
    enabled: true,
    captureText: true,
    captureImages: true,
    captureLinks: true,
    captureFilePaths: true,
    protectedByDefault: false,
    maxItems: 500,
    retentionDays: 30,
    pollIntervalMs: 1500,
    ignorePasswords: true
  },
  performance: {
    quietMode: false,
    pauseOnBatteryBelow: 20,
    onlyHeavyTasksOnAC: true,
    reduceDuringGaming: true,
    gamingProcesses: [],
    maxConcurrentCopies: 2,
    scanIntervalMinutes: 60
  },
  notifications: {
    onBackup: false,
    onDelete: true,
    onMassAction: true,
    onLowStorage: true,
    onFailure: true,
    onSuspicious: true,
    dailySummary: false,
    dailySummaryHour: 19
  },
  security: {
    containmentMode: 'warn',
    allowProcessTermination: false,
    autoEmergencySnapshot: true,
    suspiciousCooldownSeconds: 60,
    verifyEveryRestore: true,
    rejectSymlinkRestores: true,
    lockAfterMinutes: 0,
    maxPinFailures: 5,
    pinLockoutSeconds: 30
  },
  workspace: {
    includeScreenshot: true,
    includeClipboard: true,
    restoreClipboard: true,
    restoreWindowPositions: true,
    includeSystemState: true,
    restoreSystemState: false
  },
  updates: {
    enabled: false,
    checkOnStart: false,
    repository: 'rahmiapps/RewindOS'
  },
  hotkeys: DEFAULT_HOTKEYS,
  profiles: [
    {
      id: 'documents',
      name: { de: 'Dokumente', en: 'Documents' },
      retentionDays: 180,
      maxVersions: 50,
      priority: 'high',
      extensions: ['.doc', '.docx', '.odt', '.pdf', '.txt', '.rtf', '.xlsx', '.ods', '.pptx']
    },
    {
      id: 'development',
      name: { de: 'Entwicklung', en: 'Development' },
      retentionDays: 120,
      maxVersions: 100,
      priority: 'high',
      extensions: ['.js', '.ts', '.tsx', '.jsx', '.cs', '.kt', '.java', '.py', '.rs', '.go', '.json', '.xml', '.yml', '.yaml']
    },
    {
      id: 'photos',
      name: { de: 'Fotos', en: 'Photos' },
      retentionDays: 365,
      maxVersions: 15,
      priority: 'high',
      extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.bmp', '.raw']
    },
    {
      id: 'gaming',
      name: { de: 'Gaming', en: 'Gaming' },
      retentionDays: 30,
      maxVersions: 10,
      priority: 'normal',
      extensions: ['.sav', '.save', '.cfg', '.ini', '.json']
    }
  ],
  projectSpaces: [],
  customTrashRules: [],
  multiUser: {
    enabled: true,
    isolateByOperatingSystemUser: true
  },
  accessibility: {
    keyboardNavigation: true,
    screenReaderLabels: true,
    highContrast: false,
    largeText: false,
    reducedMotion: false
  }
};

function deepMerge(base, incoming) {
  const blocked = new Set(['__proto__', 'prototype', 'constructor']);
  if (Array.isArray(base)) return Array.isArray(incoming) ? structuredClone(incoming) : structuredClone(base);
  if (base && typeof base === 'object') {
    const out = { ...base };
    if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
      for (const [key, value] of Object.entries(incoming)) {
        if (blocked.has(key) || !(key in base)) continue;
        out[key] = deepMerge(base[key], value);
      }
    }
    return out;
  }
  return incoming === undefined ? base : incoming;
}

module.exports = { DEFAULT_SETTINGS, DEFAULT_HOTKEYS, deepMerge };
