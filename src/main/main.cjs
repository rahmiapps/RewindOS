const path = require('node:path');
const crypto = require('node:crypto');
const {
  app, BrowserWindow, ipcMain, dialog, shell, clipboard, desktopCapturer,
  Notification, globalShortcut, Tray, Menu, nativeTheme, safeStorage, nativeImage
} = require('electron');
const { AppPaths } = require('./services/appPaths.cjs');
const { Logger } = require('./services/logger.cjs');
const { SettingsStore } = require('./services/settingsStore.cjs');
const { CryptoService } = require('./services/cryptoService.cjs');
const { AuditStore } = require('./services/auditStore.cjs');
const { VaultService } = require('./services/vaultService.cjs');
const { UndoService } = require('./services/undoService.cjs');
const { WatcherService } = require('./services/watcherService.cjs');
const { CheckpointService } = require('./services/checkpointService.cjs');
const { ClipboardService } = require('./services/clipboardService.cjs');
const { SearchService } = require('./services/searchService.cjs');
const { IntegrityService } = require('./services/integrityService.cjs');
const { RetentionService } = require('./services/retentionService.cjs');
const { BackupMirrorService } = require('./services/backupMirrorService.cjs');
const { DiagnosticsService } = require('./services/diagnosticsService.cjs');
const { WorkspaceService } = require('./services/workspaceService.cjs');
const { ExportService } = require('./services/exportService.cjs');
const { RescueService } = require('./services/rescueService.cjs');
const { NotificationService } = require('./services/notificationService.cjs');
const { AuthService } = require('./services/authService.cjs');
const { AutoStartService } = require('./services/autoStartService.cjs');
const { PerformanceService } = require('./services/performanceService.cjs');
const { VersionComparisonService } = require('./services/versionComparisonService.cjs');
const { createPlatformAdapter } = require('./services/platform/index.cjs');
const { AppService } = require('./services/appService.cjs');
const { PathGrantService } = require('./services/pathGrantService.cjs');
const { UpdateService } = require('./services/updateService.cjs');
const { SchedulerService } = require('./services/schedulerService.cjs');
const { FileManagerIntegrationService } = require('./services/fileManagerIntegrationService.cjs');
const { registerIpc } = require('./ipc/registerIpc.cjs');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let shutdownMirrorStarted = false;
let shutdownMirrorFinished = false;
let services = null;
let appService = null;
const pendingProtectionRequests = [];
const issuedProtectionRequests = new Map();
const hardenedSessions = new WeakSet();

const portableRoot = process.env.PORTABLE_EXECUTABLE_DIR || (process.argv.includes('--portable') ? path.dirname(app.getPath('exe')) : '');
if (portableRoot) app.setPath('userData', path.join(portableRoot, 'RewindOS-Data'));

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

function createServices() {
  const paths = new AppPaths(app.getPath('userData'));
  const logger = new Logger(paths.logsDir);
  const settingsStore = new SettingsStore(paths, logger);
  if (portableRoot) settingsStore.update({ storage: { portableMode: true, vaultPath: path.join(portableRoot, 'RewindOS-Data', 'vault') } });
  paths.configureVault(settingsStore.get().storage.vaultPath);
  const authService = new AuthService(settingsStore);
  const cryptoService = new CryptoService(paths, settingsStore, logger, safeStorage);
  const auditStore = new AuditStore(paths, logger, cryptoService, settingsStore);
  const vaultService = new VaultService(paths, settingsStore, cryptoService, auditStore, logger);
  const platformAdapter = createPlatformAdapter();
  const watcherService = new WatcherService(settingsStore, auditStore, vaultService, logger, platformAdapter);
  const performanceService = new PerformanceService(settingsStore, watcherService, platformAdapter, logger);
  const clipboardService = new ClipboardService(paths, settingsStore, auditStore, logger, clipboard, platformAdapter, cryptoService, nativeImage);
  const workspaceService = new WorkspaceService(paths, platformAdapter, logger, desktopCapturer, cryptoService, settingsStore, clipboardService);
  const checkpointService = new CheckpointService(paths, settingsStore, auditStore, vaultService, cryptoService, { workspaceService, clipboardService, platformAdapter });
  const undoService = new UndoService(paths, settingsStore, auditStore, vaultService, logger, { clipboardService, workspaceService });
  const searchService = new SearchService(auditStore, vaultService, clipboardService, settingsStore);
  const versionComparisonService = new VersionComparisonService(vaultService);
  const integrityService = new IntegrityService(paths, vaultService, logger, settingsStore, checkpointService);
  const retentionService = new RetentionService(paths, settingsStore, vaultService, auditStore, clipboardService, logger, checkpointService, watcherService);
  const exportService = new ExportService(paths, settingsStore, auditStore, vaultService, checkpointService, workspaceService, cryptoService, logger);
  const backupMirrorService = new BackupMirrorService(paths, settingsStore, exportService, logger, cryptoService);
  const diagnosticsService = new DiagnosticsService(paths, settingsStore, watcherService, vaultService, logger, platformAdapter, performanceService, cryptoService, integrityService);
  const rescueService = new RescueService(paths, auditStore, vaultService, integrityService, logger);
  const notificationService = new NotificationService(settingsStore, Notification);
  const schedulerService = new SchedulerService(paths, settingsStore, performanceService, retentionService, integrityService, backupMirrorService, auditStore, notificationService, logger);
  const autoStartService = new AutoStartService(app, logger);
  const pathGrantService = new PathGrantService(paths, settingsStore, logger);
  const updateService = new UpdateService(settingsStore, app, logger);
  const fileManagerIntegrationService = new FileManagerIntegrationService(app, logger);

  services = {
    paths, logger, settingsStore, authService, cryptoService, auditStore, vaultService, undoService,
    watcherService, performanceService, checkpointService, clipboardService, platformAdapter, workspaceService,
    searchService, versionComparisonService, integrityService, retentionService, backupMirrorService, diagnosticsService,
    exportService, rescueService, notificationService, schedulerService, autoStartService, pathGrantService, updateService, fileManagerIntegrationService
  };
  appService = new AppService(services);
  appService.crashRecovery = rescueService.markStart();
}


function queueProtectionRequest(folder) {
  const absolute = path.resolve(folder);
  const duplicatePending = pendingProtectionRequests.some((item) => item.folder === absolute);
  const duplicateIssued = [...issuedProtectionRequests.values()].some((item) => item.folder === absolute);
  if (!duplicatePending && !duplicateIssued) pendingProtectionRequests.push({ token: crypto.randomUUID(), folder: absolute, expiresAt: Date.now() + 10 * 60 * 1000 });
  flushProtectionRequests();
}

function flushProtectionRequests() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading() || !services?.settingsStore.get().firstRunComplete) return;
  while (pendingProtectionRequests.length) {
    const request = pendingProtectionRequests.shift();
    if (request.expiresAt <= Date.now()) continue;
    issuedProtectionRequests.set(request.token, request);
    const expiry = setTimeout(() => issuedProtectionRequests.delete(request.token), Math.max(1, request.expiresAt - Date.now()));
    expiry.unref?.();
    send('app:protect-request', { token: request.token, folder: request.folder });
  }
}

async function resolveProtectionRequest(token, accept) {
  const key = String(token || '');
  const request = issuedProtectionRequests.get(key);
  if (!request) throw new Error('The folder-protection request is invalid or expired');
  issuedProtectionRequests.delete(key);
  if (!accept) return null;
  if (request.expiresAt <= Date.now()) throw new Error('The folder-protection request has expired');
  const stat = await require('node:fs/promises').lstat(request.folder);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Only real local directories can be protected');
  services.pathGrantService.grant(request.folder, { directory: true, writable: false, ttlMs: 60 * 1000 });
  return request.folder;
}

function processCommandLine(args = process.argv) {
  const protectIndex = args.indexOf('--protect');
  if (protectIndex < 0 || !args[protectIndex + 1]) return;
  const folder = path.resolve(args[protectIndex + 1]);
  try {
    const stat = require('node:fs').lstatSync(folder);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Only real local directories can be requested');
    queueProtectionRequest(folder);
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
  } catch (error) {
    services?.logger.warn('Unable to request command-line folder protection', { folder, message: error.message });
  }
}

function createWindow() {
  const settings = services.settingsStore.get();
  nativeTheme.themeSource = settings.appearance.theme;
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 930,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    backgroundColor: '#0b1020',
    title: 'RewindOS',
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      safeDialogs: true,
      navigateOnDragDrop: false,
      spellcheck: true,
      webviewTag: false,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.removeMenu();
  const currentSession = mainWindow.webContents.session;
  if (!hardenedSessions.has(currentSession)) {
    currentSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    currentSession.setPermissionCheckHandler(() => false);
    currentSession.on('will-download', (event) => event.preventDefault());
    currentSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (_details, callback) => callback({ cancel: true })
    );
    hardenedSessions.add(currentSession);
  }
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.webContents.once('did-finish-load', flushProtectionRequests);
  mainWindow.once('ready-to-show', () => {
    if (!settings.general.startInBackground && !process.argv.includes('--background') && !process.argv.includes('--smoke-test')) mainWindow.show();
    if (process.argv.includes('--smoke-test')) setTimeout(() => { isQuitting = true; app.exit(0); }, 750).unref();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });
  mainWindow.on('close', (event) => {
    const current = services.settingsStore.get();
    if (!isQuitting && current.general.closeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function createTray() {
  if (tray && !tray.isDestroyed()) { tray.destroy(); tray = null; }
  const settings = services.settingsStore.get();
  if (!settings.general.trayIcon) return;
  const de = settings.language === 'de';
  try {
    tray = new Tray(path.join(__dirname, '../../build/icon.png'));
    const menu = Menu.buildFromTemplate([
      { label: 'RewindOS', enabled: false },
      { type: 'separator' },
      { label: de ? 'Öffnen' : 'Open', click: () => { mainWindow.show(); mainWindow.focus(); } },
      { label: de ? 'Aktivitäts-Timeline' : 'Activity timeline', click: () => { mainWindow.show(); send('app:navigate', 'timeline'); } },
      { label: de ? 'Notfall-Sicherung' : 'Emergency snapshot', click: () => services.watcherService.emergencySnapshot() },
      { type: 'separator' },
      { label: de ? 'Beenden' : 'Quit', click: () => { isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('RewindOS');
    tray.setContextMenu(menu);
    tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
  } catch (error) {
    services.logger.warn('Tray could not be created', { message: error.message });
  }
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const hotkeys = services.settingsStore.get().hotkeys;
  const bindings = [
    [hotkeys.undoLast, () => {
      const rules = services.settingsStore.get().undoRules;
      services.undoService.undoLast({ dryRun: false, conflictRule: rules.defaultConflictRule, testRestore: false })
        .then((result) => send('watcher:event', { action: 'restored', result }))
        .catch((error) => services.logger.error('Undo hotkey failed', { message: error.message }));
    }],
    [hotkeys.openTimeline, () => { mainWindow.show(); send('app:navigate', 'timeline'); }],
    [hotkeys.createCheckpoint, () => { const de = services.settingsStore.get().language === 'de'; return services.checkpointService.create({ name: de ? 'Schneller Zeitpunkt' : 'Quick checkpoint', category: 'hotkey' }); }],
    [hotkeys.pauseMonitoring, () => services.watcherService.status().paused ? services.watcherService.resume() : services.watcherService.pause()],
    [hotkeys.openClipboard, () => { mainWindow.show(); send('app:navigate', 'clipboard'); }],
    [hotkeys.emergencySnapshot, () => services.watcherService.emergencySnapshot()]
  ];
  for (const [accelerator, callback] of bindings) {
    if (!accelerator) continue;
    try {
      if (!globalShortcut.register(accelerator, callback)) services.logger.warn('Global shortcut unavailable', { accelerator });
    } catch (error) { services.logger.warn('Global shortcut registration failed', { accelerator, message: error.message }); }
  }
}

async function startBackgroundServices() {
  services.watcherService.on('event', (event) => {
    send('watcher:event', event);
    const settings = services.settingsStore.get();
    const notificationsAllowed = settings.general.notifications && !(settings.general.quietFullscreen && mainWindow?.isFullScreen());
    const de = settings.language === 'de';
    const fileName = path.basename(event.path || '') || (de ? 'Unbekannte Datei' : 'Unknown file');
    if (notificationsAllowed && event.action === 'deleted' && settings.notifications.onDelete) services.notificationService.show('RewindOS', de ? `Geschützte Datei gelöscht: ${fileName}` : `Protected file deleted: ${fileName}`);
    if (notificationsAllowed && (event.action === 'watch-error' || event.action === 'skipped') && settings.notifications.onFailure) {
      const detail = String(event.reason || event.error || event.action || '').slice(0, 300);
      services.notificationService.show('RewindOS', de ? `Problem beim Schutz: ${detail}` : `Protection issue: ${detail}`, 'critical');
    }
    if (notificationsAllowed && (event.action === 'created' || event.action === 'modified') && settings.notifications.onBackup) services.notificationService.show('RewindOS', de ? `Version geschützt: ${fileName}` : `Version protected: ${fileName}`);
    const forecast = services.retentionService.forecast();
    if (notificationsAllowed && settings.notifications.onLowStorage && forecast.maxBytes > 0 && forecast.currentBytes / forecast.maxBytes >= 0.9) services.notificationService.show('RewindOS', de ? 'Der Sicherungsspeicher ist fast voll.' : 'Backup storage is almost full.', 'critical');
  });
  services.watcherService.on('status', (status) => send('watcher:status', status));
  services.watcherService.on('suspicious', (alert) => {
    send('watcher:suspicious', alert);
    const settings = services.settingsStore.get();
    const notificationsAllowed = settings.general.notifications && !(settings.general.quietFullscreen && mainWindow?.isFullScreen());
    if (notificationsAllowed && (settings.notifications.onSuspicious || settings.notifications.onMassAction)) {
      const message = settings.language === 'de'
        ? `Ungewöhnliche Dateiaktivität erkannt: ${alert.count} Änderungen`
        : `Unusual file activity detected: ${alert.count} changes`;
      services.notificationService.show('RewindOS', message, 'critical');
    }
  });
  await services.watcherService.start();
  services.performanceService.start();
  services.clipboardService.start();
  const updateSettings = services.settingsStore.get().updates;
  if (updateSettings.enabled && updateSettings.checkOnStart) services.updateService.check().then((result) => { if (result.available) send('update:available', result); }).catch(() => {});
  services.schedulerService.start();
  setInterval(() => {
    try { if (services.authService.lockIfIdle()) { if (services.settingsStore.get().privacy.clearClipboardOnLock) services.clipboardService.clear(); send('auth:locked', services.authService.status()); } } catch {}
  }, 30000).unref();
}

app.on('second-instance', (_event, argv) => {
  if (services) processCommandLine(argv);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  createServices();
  processCommandLine();
  createWindow();
  registerIpc({
    ipcMain, dialog, shell, app, appService, services, getWindow: () => mainWindow,
    resolveProtectionRequest,
    afterSettingsUpdate: async (before, value) => {
      nativeTheme.themeSource = value.appearance.theme;
      if (JSON.stringify(before?.hotkeys) !== JSON.stringify(value.hotkeys)) registerHotkeys();
      if (before?.general?.trayIcon !== value.general.trayIcon || before?.language !== value.language) createTray();
      flushProtectionRequests();
    }
  });
  createTray();
  registerHotkeys();
  await startBackgroundServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else { mainWindow.show(); mainWindow.focus(); }
  });
});

app.on('before-quit', (event) => {
  isQuitting = true;
  const storage = services?.settingsStore.get().storage;
  const shouldMirror = Boolean(storage?.mirrorEnabled && storage?.mirrorOnExit && services?.backupMirrorService.status().hasStoredPassphrase);
  if (shouldMirror && !shutdownMirrorFinished) {
    event.preventDefault();
    if (!shutdownMirrorStarted) {
      shutdownMirrorStarted = true;
      const mirrorTask = services.performanceService.canRunHeavyTask()
        ? services.backupMirrorService.mirror('', { reason: 'application-exit' })
        : Promise.resolve({ skipped: true, reason: 'power-policy' });
      const timeoutTask = new Promise((_, reject) => setTimeout(() => reject(new Error('Exit mirror timed out after 30 seconds')), 30000));
      Promise.race([mirrorTask, timeoutTask]).catch((error) => services.logger.error('Exit mirror failed', { message: error.message }))
        .finally(() => { shutdownMirrorFinished = true; app.quit(); });
    }
    return;
  }
  try { services?.rescueService.markCleanExit(); } catch {}
  try { services?.clipboardService.stop(); } catch {}
  try { services?.schedulerService.stop(); } catch {}
  try { services?.performanceService.stop(); } catch {}
  try { services?.watcherService.stop(); } catch {}
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !services?.settingsStore.get().general.closeToTray) app.quit();
});
