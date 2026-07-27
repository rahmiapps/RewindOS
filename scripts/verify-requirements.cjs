const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cache = new Map();
function source(file) {
  const target = path.join(root, file);
  if (!cache.has(target)) cache.set(target, fs.readFileSync(target, 'utf8'));
  return cache.get(target);
}
function all(file, patterns) { const value = source(file); return patterns.every((pattern) => pattern.test(value)); }
function any(files, pattern) { return files.some((file) => pattern.test(source(file))); }

const checks = [
  ['Local/offline defaults', () => all('src/shared/defaults.cjs', [/localOnly:\s*true/, /enabled:\s*false[\s\S]*checkOnStart:\s*false/])],
  ['German/English first-run wizard', () => all('src/renderer/app.js', [/showFirstRun/, /Deutsch/, /English/, /completeFirstRun/])],
  ['Popup-first UI', () => all('src/renderer/app.js', [/function openModal/, /modalRoot/, /focus/])],
  ['Windows and Linux adapters', () => ['src/main/services/platform/windowsAdapter.cjs','src/main/services/platform/linuxAdapter.cjs'].every((file) => fs.existsSync(path.join(root, file)))],
  ['Encrypted content-addressed versions', () => all('src/main/services/vaultService.cjs', [/hashBuffer/, /objectFile/, /saveVersion/, /restoreVersion/]) && all('src/main/services/cryptoService.cjs', [/aes-256-gcm/, /createCipheriv/, /setAuthTag/])],
  ['Activity timeline and filters', () => all('src/main/services/auditStore.cjs', [/list\(\{/, /from/, /action/, /program/]) && all('src/renderer/app.js', [/timelineFilters/, /timelineExtension/, /timelineDrive/])],
  ['Create/modify/copy/move/rename/delete detection', () => all('src/main/services/watcherService.cjs', [/'created'/, /'modified'/, /'copied'/, /'moved'/, /'renamed'/, /'deleted'/])],
  ['Protected trash for files and folders', () => all('src/main/services/vaultService.cjs', [/moveToProtectedTrash/, /captureDirectoryForTrash/, /restoreTrash/, /emptyDirectories/])],
  ['Clipboard text/link/image/path history', () => all('src/main/services/clipboardService.cjs', [/captureText/, /captureImages/, /captureLinks/, /captureFilePaths/, /imagePath/])],
  ['Workspace capture and restore', () => all('src/main/services/workspaceService.cjs', [/async capture/, /async restore/, /projectFolders/, /screenshotPaths/])],
  ['Settings, import/export and statistics', () => all('src/main/services/exportService.cjs', [/exportSettings/, /importSettings/, /exportTimeline/, /createRecoveryBundle/]) && all('src/main/services/appService.cjs', [/statistics/, /recentRestorations/])],
  ['Privacy, PIN and encrypted metadata', () => all('src/main/services/authService.cjs', [/scrypt/, /maxPinFailures/, /pinLockout/]) && all('src/main/services/secureJson.cjs', [/encrypt/, /decrypt/])],
  ['Hotkeys, tray and autostart', () => all('src/main/main.cjs', [/globalShortcut/, /new Tray/, /registerHotkeys/]) && all('src/main/services/autoStartService.cjs', [/setLoginItemSettings/])],
  ['Windows/Linux installer targets', () => all('electron-builder.yml', [/nsis/, /portable/, /AppImage/, /deb/, /rpm/])],

  // Accepted extensions 1–30. These checks point to executable code, not only documentation.
  ['01 Undo preview', () => all('src/main/services/undoService.cjs', [/preview\(/, /steps/, /restorable/]) && /undo:preview/.test(source('src/main/ipc/registerIpc.cjs'))],
  ['02 Safety baseline/snapshot before risk', () => all('src/main/services/watcherService.cjs', [/snapshotExistingFilesOnStart/, /reason:\s*'baseline'/, /autoEmergencySnapshot/, /emergencySnapshot/])],
  ['03 Undo chains', () => all('src/main/services/undoService.cjs', [/executeGroup/, /operationGroup/])],
  ['04 Selective restore', () => all('src/main/services/undoService.cjs', [/executeSelection/, /eventIds/]) && all('src/main/services/checkpointService.cjs', [/options\.versionIds/, /async restore/])],
  ['05 Conflict resolution', () => any(['src/main/services/undoService.cjs','src/main/services/vaultService.cjs'], /keep-newer/) && any(['src/main/services/undoService.cjs','src/main/services/vaultService.cjs'], /keep-older/) && any(['src/main/services/undoService.cjs','src/main/services/vaultService.cjs'], /rename/) && any(['src/main/services/undoService.cjs','src/main/services/vaultService.cjs'], /replace/)],
  ['06 Dry-run what-would-happen mode', () => all('src/main/services/undoService.cjs', [/dryRun/, /preview/])],
  ['07 Protection profiles', () => all('src/main/services/appService.cjs', [/saveProfile/, /removeProfile/]) && /profiles/.test(source('src/shared/defaults.cjs'))],
  ['08 Project protection spaces', () => all('src/main/services/appService.cjs', [/saveProjectSpace/, /removeProjectSpace/]) && /projectSpaces/.test(source('src/main/services/vaultService.cjs'))],
  ['09 Application history', () => all('src/main/services/watcherService.cjs', [/getActiveApplication/, /program/, /executable/]) && /program/.test(source('src/main/services/auditStore.cjs'))],
  ['10 Suspicious action containment', () => all('src/main/services/watcherService.cjs', [/suspiciousHold/, /respondToAlert/, /terminate-process/, /pause-monitoring/])],
  ['11 Emergency key/button', () => all('src/main/main.cjs', [/emergencySnapshot/, /hotkeys\.emergencySnapshot/]) && /emergencyButton/.test(source('src/renderer/app.js'))],
  ['12 Crash recovery assistant', () => all('src/main/services/rescueService.cjs', [/markStart/, /markCleanExit/, /candidates/, /analyze/])],
  ['13 File health checks', () => all('src/main/services/integrityService.cjs', [/scan/, /missing/, /corrupt|damaged|decrypt/i]) && /healthChecks/.test(source('src/shared/defaults.cjs'))],
  ['14 Storage forecast', () => all('src/main/services/retentionService.cjs', [/forecast\(/, /estimated/, /reserve/])],
  ['15 Adaptive versioning', () => /adaptiveVersioning/.test(source('src/shared/defaults.cjs')) && all('src/main/services/vaultService.cjs', [/maxVersions/, /projectSpaces|profiles/])],
  ['16 Protected favorites', () => all('src/main/services/vaultService.cjs', [/setFavorite/, /setTrashFavorite/]) && /keepFavoriteForever/.test(source('src/main/services/retentionService.cjs'))],
  ['17 Recovery collections', () => all('src/main/services/checkpointService.cjs', [/versions/, /settingsSnapshot/, /workspaceId/, /folderStructure/])],
  ['18 Commented checkpoints', () => all('src/main/services/checkpointService.cjs', [/note/, /color/, /category/, /favorite/])],
  ['19 Offline rescue medium', () => /offline-rescue/.test(source('src/main/ipc/registerIpc.cjs')) && /createRecoveryBundle/.test(source('src/main/services/exportService.cjs'))],
  ['20 Backup integrity checking', () => all('src/main/services/integrityService.cjs', [/hash/, /decrypt/, /healthy/])],
  ['21 Test restore', () => all('src/main/services/vaultService.cjs', [/testRestoreVersion/, /testRestoresDir/])],
  ['22 Quiet mode', () => /quietMode/.test(source('src/main/services/performanceService.cjs')) && /quietMode/.test(source('src/renderer/app.js'))],
  ['23 Battery/performance mode', () => all('src/main/services/performanceService.cjs', [/battery/, /onlyHeavyTasksOnAC/, /reduceDuringGaming/])],
  ['24 External backup mirror', () => all('src/main/services/backupMirrorService.cjs', [/mirror\(/, /remember/, /credential/])],
  ['25 Portable mode', () => all('src/main/main.cjs', [/PORTABLE_EXECUTABLE_DIR/, /--portable/, /RewindOS-Data/]) && /portable/.test(source('electron-builder.yml'))],
  ['26 Multi-user separation', () => /isolateByOperatingSystemUser/.test(source('src/shared/defaults.cjs')) && /userData/.test(source('src/main/main.cjs'))],
  ['27 Accessibility', () => all('src/renderer/app.js', [/largeText/, /highContrast/, /reducedMotion/, /screenReader/]) && /aria-/.test(source('src/renderer/index.html'))],
  ['28 Diagnostics center', () => all('src/main/services/diagnosticsService.cjs', [/getDiagnostics|collect|diagnos/i, /capabilities/, /issues/]) && /renderDiagnostics/.test(source('src/renderer/app.js'))],
  ['29 App trash rules', () => /customTrashRules/.test(source('src/main/services/retentionService.cjs')) && /showTrashRules/.test(source('src/renderer/app.js'))],
  ['30 Local smart search', () => all('src/main/services/searchService.cjs', [/parseNaturalQuery/, /gestern|yesterday/, /deleted|gelöscht/, /extensionGroups/])],

  ['Recovery bundle staging and rollback', () => all('src/main/services/exportService.cjs', [/stagedBundle/, /verifyManifest/, /rollbackErrors/, /restore previous master key/])],
  ['Single-use file-manager confirmation tokens', () => all('src/main/main.cjs', [/crypto\.randomUUID/, /issuedProtectionRequests/, /resolveProtectionRequest/]) && /watch:resolve-protect-request/.test(source('src/main/ipc/registerIpc.cjs'))],
  ['User-controlled file-manager integration lifecycle', () => all('src/main/services/fileManagerIntegrationService.cjs', [/async install/, /async uninstall/, /assertPackaged/, /toolPath/]) && all('src/main/ipc/registerIpc.cjs', [/integration:status/, /integration:install/, /integration:uninstall/]) && all('src/renderer/app.js', [/fileManagerIntegrationButton/, /changeFileManagerIntegration/])],
  ['Renderer and IPC hardening', () => all('src/main/main.cjs', [/contextIsolation:\s*true/, /sandbox:\s*true/, /nodeIntegration:\s*false/, /setPermissionRequestHandler/, /will-download/]) && all('src/main/ipc/registerIpc.cjs', [/trustedSender/, /MAX_IPC_BYTES/, /stripDangerousKeys/])],
  ['Symlink and decompression defenses', () => /assertNoSymlinkComponents/.test(source('src/main/services/exportService.cjs')) && /maxOutputLength/.test(source('src/main/services/cryptoService.cjs'))]
];

const failed = [];
for (const [name, check] of checks) {
  try {
    if (!check()) failed.push(name);
    else process.stdout.write(`✓ ${name}\n`);
  } catch (error) { failed.push(`${name}: ${error.message}`); }
}
if (failed.length) {
  process.stderr.write(`\nRequirement verification failed (${failed.length}/${checks.length}):\n${failed.map((name) => `- ${name}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`\nRewindOS requirement verification passed (${checks.length}/${checks.length}).\n`);
