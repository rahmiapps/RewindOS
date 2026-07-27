const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { AppPaths } = require('../src/main/services/appPaths.cjs');
const { Logger } = require('../src/main/services/logger.cjs');
const { SettingsStore } = require('../src/main/services/settingsStore.cjs');
const { CryptoService } = require('../src/main/services/cryptoService.cjs');
const { AuditStore } = require('../src/main/services/auditStore.cjs');
const { VaultService } = require('../src/main/services/vaultService.cjs');
const { ClipboardService } = require('../src/main/services/clipboardService.cjs');
const { CheckpointService } = require('../src/main/services/checkpointService.cjs');
const { RetentionService } = require('../src/main/services/retentionService.cjs');
const { ExportService, verifyManifest, readJsonLimited } = require('../src/main/services/exportService.cjs');
const { PathGrantService } = require('../src/main/services/pathGrantService.cjs');
const { AuthService } = require('../src/main/services/authService.cjs');
const { writeSecureJson } = require('../src/main/services/secureJson.cjs');

async function fixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-security-'));
  const paths = new AppPaths(path.join(root, 'userdata'));
  const logger = new Logger(paths.logsDir);
  const settings = new SettingsStore(paths, logger);
  const crypto = new CryptoService(paths, settings, logger);
  const audit = new AuditStore(paths, logger, crypto, settings);
  const vault = new VaultService(paths, settings, crypto, audit, logger);
  const clipboard = new ClipboardService(paths, settings, audit, logger, null, null, crypto);
  const checkpoints = new CheckpointService(paths, settings, audit, vault, crypto, { clipboardService: clipboard });
  const retention = new RetentionService(paths, settings, vault, audit, clipboard, logger, checkpoints);
  const exporter = new ExportService(paths, settings, audit, vault, checkpoints, { list: () => [] }, crypto, logger);
  return { root, paths, logger, settings, crypto, audit, vault, clipboard, checkpoints, retention, exporter };
}

test('settings reject prototype-pollution keys and unknown fields', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const payload = JSON.parse('{"__proto__":{"polluted":true},"appearance":{"theme":"dark","unknown":"x"},"unknownRoot":true}');
  fx.settings.update(payload);
  assert.equal({}.polluted, undefined);
  assert.equal(fx.settings.get().appearance.theme, 'dark');
  assert.equal(fx.settings.get().appearance.unknown, undefined);
  assert.equal(fx.settings.get().unknownRoot, undefined);
});

test('path grants block arbitrary paths and allow explicitly selected folders', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const selected = path.join(fx.root, 'selected'); await fsp.mkdir(selected);
  const outside = path.join(fx.root, 'outside'); await fsp.mkdir(outside);
  const grants = new PathGrantService(fx.paths, fx.settings, fx.logger);
  assert.throws(() => grants.assertAllowed(outside, { mustExist: true }), /not selected or granted/i);
  grants.grant(selected, { directory: true, writable: true });
  assert.equal(grants.assertAllowed(path.join(selected, 'new.txt'), { write: true }), path.join(selected, 'new.txt'));
  assert.throws(() => grants.assertAllowed(path.join(outside, 'new.txt'), { write: true }), /not selected or granted/i);
});

test('symbolic-link source files are never versioned', { skip: process.platform === 'win32' }, async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const real = path.join(fx.root, 'real.txt'); const link = path.join(fx.root, 'link.txt');
  await fsp.writeFile(real, 'secret'); await fsp.symlink(real, link);
  await assert.rejects(() => fx.vault.saveVersion(link, { force: true }), /symbolic/i);
});

test('clipboard images are encrypted at rest', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
  const fakeClipboard = { readText: () => '', readImage: () => ({ isEmpty: () => false, toPNG: () => png }), availableFormats: () => ['image/png'] };
  const service = new ClipboardService(fx.paths, fx.settings, fx.audit, fx.logger, fakeClipboard, null, fx.crypto);
  await service.capture();
  const stored = service.items[0];
  assert.ok(stored.imagePath.endsWith('.rwi'));
  const raw = await fsp.readFile(stored.imagePath);
  assert.equal(raw.subarray(0, 3).toString('utf8'), 'RW1');
  assert.equal(raw.includes(png), false);
  assert.equal(service.preview(stored.id).dataUrl, `data:image/png;base64,${png.toString('base64')}`);
});

test('retention preserves versions referenced by checkpoints', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const folder = path.join(fx.root, 'project'); await fsp.mkdir(folder);
  fx.settings.update({ monitoring: { watchedFolders: [folder] }, storage: { retentionDays: 1 } });
  const file = path.join(folder, 'important.txt'); await fsp.writeFile(file, 'checkpoint content');
  const version = await fx.vault.saveVersion(file, { force: true });
  const checkpoint = await fx.checkpoints.create({ name: 'Protected', paths: [folder], versionIds: [version.id], includeWorkspace: false });
  const internal = fx.vault.index.files[path.resolve(file)].find((item) => item.id === version.id);
  internal.createdAt = new Date(Date.now() - 10 * 86400000).toISOString(); fx.vault.saveIndex();
  fx.retention.cleanup();
  assert.ok(fx.vault.findVersion(checkpoint.versions[0]));
});

test('recovery bundle manifest detects tampering', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const exportRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-bundle-')); t.after(() => fs.rmSync(exportRoot, { recursive: true, force: true }));
  const file = path.join(fx.root, 'protected.txt'); await fsp.writeFile(file, 'safe'); await fx.vault.saveVersion(file);
  const bundle = await fx.exporter.createRecoveryBundle(exportRoot, 'a sufficiently strong password');
  const manifest = JSON.parse(await fsp.readFile(path.join(bundle, 'manifest.json'), 'utf8'));
  await verifyManifest(bundle, manifest);
  await fsp.appendFile(path.join(bundle, 'settings.json'), '\n ');
  await assert.rejects(() => verifyManifest(bundle, manifest), /integrity check failed/i);
});

test('PIN brute-force protection enforces temporary lockout', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  fx.settings.update({ security: { maxPinFailures: 3, pinLockoutSeconds: 5 } });
  const auth = new AuthService(fx.settings); auth.setPin('correct-pin'); auth.lock();
  assert.equal(auth.verify('wrong-1'), false); assert.equal(auth.verify('wrong-2'), false); assert.equal(auth.verify('wrong-3'), false);
  assert.equal(auth.status().temporarilyLocked, true);
  assert.equal(auth.verify('correct-pin'), false);
});

test('renderer security settings disable Node access and arbitrary network/image file loading', () => {
  const main = fs.readFileSync(path.join(__dirname, '../src/main/main.cjs'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
  assert.match(main, /contextIsolation:\s*true/); assert.match(main, /sandbox:\s*true/); assert.match(main, /nodeIntegration:\s*false/);
  assert.match(html, /connect-src 'none'/); assert.doesNotMatch(html, /img-src[^;]*file:/);
});

test('platform adapters avoid shell command execution', () => {
  for (const name of ['windowsAdapter.cjs', 'linuxAdapter.cjs']) {
    const source = fs.readFileSync(path.join(__dirname, '../src/main/services/platform', name), 'utf8');
    assert.doesNotMatch(source, /shell:\s*true/); assert.doesNotMatch(source, /execSync\s*\(/); assert.doesNotMatch(source, /\beval\s*\(/);
  }
});

test('sensitive and excluded folders never become implicit renderer path grants', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const sensitive = path.join(fx.root, 'sensitive'); const excluded = path.join(fx.root, 'excluded');
  await fsp.mkdir(sensitive); await fsp.mkdir(excluded);
  fx.settings.update({ privacy: { sensitiveFolders: [sensitive] }, monitoring: { excludedFolders: [excluded] } });
  const grants = new PathGrantService(fx.paths, fx.settings, fx.logger);
  assert.throws(() => grants.assertAllowed(sensitive, { mustExist: true }), /not selected or granted/i);
  assert.throws(() => grants.assertAllowed(excluded, { mustExist: true }), /not selected or granted/i);
});

test('plain settings imports cannot silently activate filesystem paths', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const watched = path.join(fx.root, 'untrusted-watch'); await fsp.mkdir(watched);
  const imported = fx.exporter.importSettingsFromObject({
    monitoring: { watchedFolders: [watched], excludedFolders: [watched], paused: false },
    privacy: { sensitiveFolders: [watched] }, storage: { mirrorPath: watched, mirrorEnabled: true },
    projectSpaces: [{ id: 'x', name: 'X', folders: [watched] }]
  });
  assert.deepEqual(imported.monitoring.watchedFolders, []);
  assert.deepEqual(imported.monitoring.excludedFolders, []);
  assert.equal(imported.monitoring.paused, true);
  assert.equal(imported.storage.mirrorEnabled, false);
  assert.equal(imported.storage.mirrorPath, '');
  assert.deepEqual(imported.projectSpaces[0].folders, []);
});

test('renderer hardening disables webviews, workers, frames and insecure content', () => {
  const main = fs.readFileSync(path.join(__dirname, '../src/main/main.cjs'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
  assert.match(main, /webviewTag:\s*false/);
  assert.match(main, /allowRunningInsecureContent:\s*false/);
  assert.match(main, /setPermissionRequestHandler[\s\S]*callback\(false\)/);
  assert.match(main, /will-download[\s\S]*preventDefault/);
  assert.match(html, /frame-src 'none'/);
  assert.match(html, /worker-src 'none'/);
  assert.match(html, /object-src 'none'/);
});

test('encrypted compression and unencrypted compression use distinct readable formats', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const value = Buffer.from('compression-test-'.repeat(2048));
  fx.settings.update({ storage: { compression: true, encryptionEnabled: true } });
  const encrypted = fx.crypto.encrypt(value);
  assert.equal(encrypted.subarray(0, 3).toString('utf8'), 'RW2');
  assert.deepEqual(fx.crypto.decrypt(encrypted), value);
  fx.settings.update({ storage: { compression: true, encryptionEnabled: false } });
  const compressed = fx.crypto.encrypt(value);
  assert.equal(compressed.subarray(0, 3).toString('utf8'), 'RW3');
  assert.deepEqual(fx.crypto.decrypt(compressed), value);
});

test('version test restore never changes the current original file', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const file = path.join(fx.root, 'live.txt');
  await fsp.writeFile(file, 'old content');
  const version = await fx.vault.saveVersion(file, { force: true });
  await fsp.writeFile(file, 'current content');
  const result = await fx.vault.testRestoreVersion(version.id);
  assert.equal(await fsp.readFile(file, 'utf8'), 'current content');
  assert.equal(await fsp.readFile(result.result.restoredPath, 'utf8'), 'old content');
  assert.ok(path.resolve(result.result.restoredPath).startsWith(path.resolve(fx.paths.testRestoresDir)));
});

test('release configuration uses least privilege and current hardened build line', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/release.yml'), 'utf8');
  assert.equal(packageJson.version, '0.4.0');
  assert.equal(packageJson.devDependencies.electron, '43.2.0');
  assert.equal(packageJson.devDependencies['electron-builder'], '26.15.3');
  assert.match(workflow, /permissions:\n\s+contents: read/);
  assert.match(workflow, /release:[\s\S]*permissions:\n\s+contents: write/);
  assert.match(workflow, /npm run audit/);
  assert.match(workflow, /npm run smoke/);
});


test('compressed vault objects enforce a strict decompression output limit', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  fx.settings.update({ storage: { compression: true, encryptionEnabled: true } });
  const compressed = fx.crypto.encrypt(Buffer.alloc(2 * 1024 * 1024, 65));
  assert.throws(() => fx.crypto.decrypt(compressed, { maxOutputBytes: 1024 }), /output|buffer|larger/i);
});

test('limited JSON reader rejects oversized control files before parsing', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const file = path.join(fx.root, 'oversized.json');
  await fsp.writeFile(file, JSON.stringify({ value: 'x'.repeat(4096) }));
  assert.throws(() => readJsonLimited(file, 128, 'Test control file'), /too large|invalid/i);
});

test('recovery manifests reject traversal and duplicate entry paths', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const root = path.join(fx.root, 'bundle'); await fsp.mkdir(root);
  await assert.rejects(() => verifyManifest(root, { files: [{ path: '../escape', bytes: 0, sha256: '0'.repeat(64) }] }), /unsafe|duplicate/i);
  await assert.rejects(() => verifyManifest(root, { files: [
    { path: 'same', bytes: 0, sha256: '0'.repeat(64) },
    { path: 'same', bytes: 0, sha256: '0'.repeat(64) }
  ] }), /unsafe|duplicate/i);
});

test('renderer escapes imported identifiers and sanitizes dynamic CSS classes', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
  assert.match(renderer, /const escapeAttr = escapeHtml/);
  assert.match(renderer, /safeClassToken\(event\.action\)/);
  assert.match(renderer, /data-event-favorite="\$\{escapeAttr\(event\.id\)\}"/);
  assert.match(renderer, /data-checkpoint-preview="\$\{escapeAttr\(item\.id\)\}"/);
  assert.match(renderer, /data-version-restore="\$\{escapeAttr\(version\.id\)\}"/);
  assert.doesNotMatch(renderer, /action-badge \$\{event\.action\}/);
  assert.doesNotMatch(renderer, /diff-row \$\{change\.type\}/);
});

test('first-run PIN is created only in the privileged main-process handler', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
  const ipc = fs.readFileSync(path.join(__dirname, '../src/main/ipc/registerIpc.cjs'), 'utf8');
  assert.doesNotMatch(renderer, /setPin\(state\.setup\.pin\)/);
  assert.match(ipc, /firstRunPin[\s\S]*authService\.setPin/);
});

test('dashboard state includes recent restores, warnings and unresolved security alerts', () => {
  const service = fs.readFileSync(path.join(__dirname, '../src/main/services/appService.cjs'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
  assert.match(service, /recentRestorations/);
  assert.match(service, /recentWarnings/);
  assert.match(service, /securityAlerts/);
  assert.match(renderer, /Letzte Wiederherstellungen/);
  assert.match(renderer, /offene Sicherheitswarnungen/);
});

test('recovery import rolls back data, vault, key and settings after a post-swap failure', async (t) => {
  const source = await fixture(); const target = await fixture();
  t.after(() => fs.rmSync(source.root, { recursive: true, force: true }));
  t.after(() => fs.rmSync(target.root, { recursive: true, force: true }));
  const exportRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-rollback-bundle-'));
  t.after(() => fs.rmSync(exportRoot, { recursive: true, force: true }));

  await fsp.writeFile(path.join(source.paths.dataDir, 'source-data.txt'), 'source');
  const protectedFile = path.join(source.root, 'protected.txt');
  await fsp.writeFile(protectedFile, 'source protected content');
  await source.vault.saveVersion(protectedFile, { force: true });
  const bundle = await source.exporter.createRecoveryBundle(exportRoot, 'a sufficiently strong rollback password');

  await fsp.writeFile(path.join(target.paths.dataDir, 'target-data.txt'), 'target-data');
  await fsp.writeFile(path.join(target.paths.vaultDir, 'target-vault.txt'), 'target-vault');
  target.settings.update({ language: 'en', appearance: { theme: 'light' } });
  const previousKey = target.crypto.exportMasterKey();
  const originalImport = target.exporter.importSettingsFromObject.bind(target.exporter);
  target.exporter.importSettingsFromObject = () => { throw new Error('forced post-swap failure'); };

  await assert.rejects(
    () => target.exporter.restoreRecoveryBundle(bundle, 'a sufficiently strong rollback password'),
    /forced post-swap failure/i
  );
  target.exporter.importSettingsFromObject = originalImport;

  assert.equal(await fsp.readFile(path.join(target.paths.dataDir, 'target-data.txt'), 'utf8'), 'target-data');
  assert.equal(await fsp.readFile(path.join(target.paths.vaultDir, 'target-vault.txt'), 'utf8'), 'target-vault');
  assert.equal(fs.existsSync(path.join(target.paths.dataDir, 'source-data.txt')), false);
  assert.deepEqual(target.crypto.exportMasterKey(), previousKey);
  assert.equal(target.settings.get().language, 'en');
  assert.equal(target.settings.get().appearance.theme, 'light');
  assert.equal(fs.existsSync(path.join(bundle, 'manifest.json')), true, 'the untrusted source bundle must remain untouched');
});

test('recovery import succeeds from private staging without consuming the source bundle', async (t) => {
  const source = await fixture(); const target = await fixture();
  t.after(() => fs.rmSync(source.root, { recursive: true, force: true }));
  t.after(() => fs.rmSync(target.root, { recursive: true, force: true }));
  const exportRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-success-bundle-'));
  t.after(() => fs.rmSync(exportRoot, { recursive: true, force: true }));

  await fsp.writeFile(path.join(source.paths.dataDir, 'source-data.txt'), 'restored-data');
  const protectedFile = path.join(source.root, 'protected.txt');
  await fsp.writeFile(protectedFile, 'restored protected content');
  await source.vault.saveVersion(protectedFile, { force: true });
  const bundle = await source.exporter.createRecoveryBundle(exportRoot, 'a sufficiently strong restore password');
  await fsp.writeFile(path.join(target.paths.dataDir, 'target-only.txt'), 'replace me');

  const result = await target.exporter.restoreRecoveryBundle(bundle, 'a sufficiently strong restore password');
  assert.equal(result.restored, true);
  assert.equal(result.restartRequired, true);
  assert.equal(await fsp.readFile(path.join(target.paths.dataDir, 'source-data.txt'), 'utf8'), 'restored-data');
  assert.equal(fs.existsSync(path.join(target.paths.dataDir, 'target-only.txt')), false);
  assert.deepEqual(target.crypto.exportMasterKey(), source.crypto.exportMasterKey());
  assert.equal(fs.existsSync(path.join(bundle, 'manifest.json')), true);
  assert.equal(fs.existsSync(result.previousDataBackup), true);
});

test('Explorer and Linux file-manager protection requests require a single-use renderer confirmation token', () => {
  const main = fs.readFileSync(path.join(__dirname, '../src/main/main.cjs'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
  const preload = fs.readFileSync(path.join(__dirname, '../src/main/preload.cjs'), 'utf8');
  const ipc = fs.readFileSync(path.join(__dirname, '../src/main/ipc/registerIpc.cjs'), 'utf8');
  const queueSection = main.slice(main.indexOf('function queueProtectionRequest'), main.indexOf('function processCommandLine'));
  const commandSection = main.slice(main.indexOf('function processCommandLine'), main.indexOf('function createWindow'));
  assert.match(commandSection, /queueProtectionRequest\(folder\)/);
  assert.doesNotMatch(commandSection, /watcherService\.(add|addFolder|watch)/);
  assert.match(queueSection, /crypto\.randomUUID\(\)/);
  assert.match(queueSection, /issuedProtectionRequests/);
  assert.doesNotMatch(queueSection.slice(0, queueSection.indexOf('async function resolveProtectionRequest')), /pathGrantService\.grant/);
  assert.match(renderer, /app:protect-request/);
  assert.match(renderer, /Erst nach deiner Bestätigung/);
  assert.match(renderer, /closeable:\s*false/);
  assert.match(renderer, /resolveProtectRequest\(token, false\)/);
  assert.match(renderer, /resolveProtectRequest\(token, true\)/);
  assert.match(preload, /watch:resolve-protect-request/);
  assert.match(ipc, /resolveProtectionRequest/);
});

test('Linux file-manager integration handles Nautilus, Nemo and Dolphin without evaluated heredocs', () => {
  const script = fs.readFileSync(path.join(__dirname, '../scripts/install-linux-file-manager-integration.sh'), 'utf8');
  assert.match(script, /nautilus\/scripts/);
  assert.match(script, /nemo\/scripts/);
  assert.match(script, /kservices5\/ServiceMenus/);
  assert.match(script, /realpath --/);
  assert.doesNotMatch(script, /eval\s/);
  assert.doesNotMatch(script, /cat\s+<<[^']*EOF/);
});

test('security settings expose suspicious-alert cooldown and manual update checking', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
  assert.match(renderer, /data-setting="security\.suspiciousCooldownSeconds"/);
  assert.match(renderer, /id="checkUpdatesNow"/);
  assert.match(renderer, /api\.updates\.check\(\)/);
  assert.match(renderer, /Ohne diese Freigabe stellt RewindOS keine Internetverbindung her/);
});

test('system notifications and hotkey checkpoint names follow the selected language', () => {
  const main = fs.readFileSync(path.join(__dirname, '../src/main/main.cjs'), 'utf8');
  assert.match(main, /Geschützte Datei gelöscht/);
  assert.match(main, /Problem beim Schutz/);
  assert.match(main, /Version geschützt/);
  assert.match(main, /Der Sicherungsspeicher ist fast voll/);
  assert.match(main, /Schneller Zeitpunkt/);
});

test('exit-time mirror has a bounded timeout and cannot block shutdown indefinitely', () => {
  const main = fs.readFileSync(path.join(__dirname, '../src/main/main.cjs'), 'utf8');
  assert.match(main, /Promise\.race\(\[mirrorTask, timeoutTask\]\)/);
  assert.match(main, /30000/);
  assert.match(main, /shutdownMirrorFinished = true; app\.quit\(\)/);
});


test('installer packages user-controlled file-manager integration and removes Windows registry state on uninstall', () => {
  const builder = fs.readFileSync(path.join(__dirname, '../electron-builder.yml'), 'utf8');
  const nsis = fs.readFileSync(path.join(__dirname, '../build/installer.nsh'), 'utf8');
  const register = fs.readFileSync(path.join(__dirname, '../scripts/register-explorer-menu.ps1'), 'utf8');
  assert.match(builder, /include: build\/installer\.nsh/);
  assert.match(builder, /uninstall-linux-file-manager-integration\.sh/);
  assert.match(nsis, /WriteRegStr HKCU/);
  assert.doesNotMatch(nsis, /WriteRegStr HKLM/);
  assert.match(nsis, /customUnInstall[\s\S]*DeleteRegKey HKCU/);
  assert.match(register, /Get-Item -LiteralPath/);
  assert.match(register, /Extension -ieq "\.exe"/);
  assert.match(register, /Set-Item -Path \$base -Value/);
});

test('file-manager integration is exposed through guarded IPC and fixed packaged tools only', () => {
  const service = fs.readFileSync(path.join(__dirname, '../src/main/services/fileManagerIntegrationService.cjs'), 'utf8');
  const ipc = fs.readFileSync(path.join(__dirname, '../src/main/ipc/registerIpc.cjs'), 'utf8');
  const preload = fs.readFileSync(path.join(__dirname, '../src/main/preload.cjs'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
  assert.match(service, /assertPackaged\(\)/);
  assert.match(service, /stat\.isSymbolicLink\(\)/);
  assert.match(service, /execFileAsync/);
  assert.doesNotMatch(service, /\bexec\s*\(/);
  assert.match(ipc, /integration:status/);
  assert.match(ipc, /integration:install/);
  assert.match(ipc, /integration:uninstall/);
  assert.match(preload, /integration: Object\.freeze/);
  assert.match(renderer, /changeFileManagerIntegration/);
  assert.match(renderer, /Jeder Ordner muss anschließend trotzdem noch einmal in RewindOS bestätigt werden/);
});

test('release and local Linux builds require smoke testing and checksum only regular artifacts', () => {
  const linuxBuild = fs.readFileSync(path.join(__dirname, '../scripts/build-linux.sh'), 'utf8');
  const linuxPowerShell = fs.readFileSync(path.join(__dirname, '../scripts/build-linux.ps1'), 'utf8');
  const release = fs.readFileSync(path.join(__dirname, '../.github/workflows/release.yml'), 'utf8');
  const ci = fs.readFileSync(path.join(__dirname, '../.github/workflows/ci.yml'), 'utf8');
  assert.match(linuxBuild, /REWINDOS_SKIP_SMOKE/);
  assert.match(linuxBuild, /xvfb-run is required/);
  assert.match(linuxPowerShell, /REWINDOS_SKIP_SMOKE/);
  assert.match(linuxPowerShell, /xvfb-run is required/);
  assert.match(release, /find \. -maxdepth 1 -type f/);
  assert.doesNotMatch(release, /sha256sum \* >/);
  assert.match(ci, /apt-get install -y xvfb/);
  assert.match(ci, /xvfb-run -a npm run smoke/);
});


test('malformed imported vault metadata cannot create traversal object paths', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const protectedPath = path.join(fx.root, 'protected.txt');
  const escaped = path.join(fx.paths.vaultDir, 'escaped.rwo');
  await fsp.writeFile(escaped, 'must remain');
  writeSecureJson(fx.paths.versionsFile, {
    schemaVersion: 2,
    files: { [protectedPath]: [{ id: 'bad-version', path: protectedPath, hash: '../escaped', size: 11, reason: 'x'.repeat(5000) }] },
    objects: { '../escaped': { size: 11, refCount: 1 } }
  }, fx.crypto, true);
  const reloaded = new VaultService(fx.paths, fx.settings, fx.crypto, fx.audit, fx.logger);
  assert.equal(reloaded.stats().versions, 0);
  assert.equal(await fsp.readFile(escaped, 'utf8'), 'must remain');
  assert.throws(() => reloaded.releaseObject('../escaped'), /invalid vault object hash/i);
});

test('replacing a file version first preserves the current target as a safety version', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const file = path.join(fx.root, 'replace.txt');
  await fsp.writeFile(file, 'old protected content');
  const oldVersion = await fx.vault.saveVersion(file, { force: true });
  await fsp.writeFile(file, 'current content that must be recoverable');
  const result = await fx.vault.restoreVersion(oldVersion.id, file, 'replace', false);
  assert.equal(await fsp.readFile(file, 'utf8'), 'old protected content');
  assert.ok(result.safetyVersionId);
  assert.equal((await fx.vault.readVersion(result.safetyVersionId)).toString('utf8'), 'current content that must be recoverable');
});

test('a file restore never recursively deletes an existing directory', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const source = path.join(fx.root, 'source.txt'); await fsp.writeFile(source, 'file version');
  const version = await fx.vault.saveVersion(source, { force: true });
  const destination = path.join(fx.root, 'important-directory'); await fsp.mkdir(destination);
  await fsp.writeFile(path.join(destination, 'keep.txt'), 'keep me');
  await assert.rejects(() => fx.vault.restoreVersion(version.id, destination, 'replace', false), /cannot replace a directory/i);
  assert.equal(await fsp.readFile(path.join(destination, 'keep.txt'), 'utf8'), 'keep me');
});

test('imported checkpoint folder structure drops traversal entries before restore', async (t) => {
  const fx = await fixture(); t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const root = path.join(fx.root, 'checkpoint-root'); await fsp.mkdir(root);
  const file = path.join(root, 'file.txt'); await fsp.writeFile(file, 'checkpoint');
  const version = await fx.vault.saveVersion(file, { force: true });
  writeSecureJson(fx.paths.checkpointsFile, [{
    id: 'cp-imported', name: 'Imported', roots: [{ root, structure: [
      { type: 'directory', path: '../../escape' },
      { type: 'directory', path: 'safe/subfolder' }
    ] }], versions: [version.id], createdAt: new Date().toISOString()
  }], fx.crypto, true);
  const reloaded = new CheckpointService(fx.paths, fx.settings, fx.audit, fx.vault, fx.crypto);
  const checkpoint = reloaded.list()[0];
  assert.deepEqual(checkpoint.roots[0].structure.map((entry) => entry.path), ['safe/subfolder']);
  const destination = path.join(fx.root, 'restore-destination'); await fsp.mkdir(destination);
  await reloaded.restore(checkpoint.id, { dryRun: false, destinationRoot: destination, restoreFolderStructure: true });
  assert.equal(fs.existsSync(path.join(fx.root, 'escape')), false);
  assert.equal(fs.existsSync(path.join(destination, path.basename(root), 'safe/subfolder')), true);
});

test('all destructive restore IPC routes require an authorized non-application-data target', () => {
  const ipc = fs.readFileSync(path.join(__dirname, '../src/main/ipc/registerIpc.cjs'), 'utf8');
  assert.match(ipc, /const assertRestorePath/);
  assert.match(ipc, /User files cannot be restored inside RewindOS application data/);
  assert.match(ipc, /undo:execute[\s\S]*authorizeUndoEvent/);
  assert.match(ipc, /vault:restore'[\s\S]*assertRestorePath/);
  assert.match(ipc, /vault:restore-trash'[\s\S]*assertRestorePath/);
  assert.match(ipc, /checkpoints:restore'[\s\S]*authorizeCheckpointRestore/);
});
