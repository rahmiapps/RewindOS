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
const { UndoService } = require('../src/main/services/undoService.cjs');
const { SearchService } = require('../src/main/services/searchService.cjs');
const { ClipboardService } = require('../src/main/services/clipboardService.cjs');
const { IntegrityService } = require('../src/main/services/integrityService.cjs');
const { RetentionService } = require('../src/main/services/retentionService.cjs');
const { AuthService } = require('../src/main/services/authService.cjs');
const { CheckpointService } = require('../src/main/services/checkpointService.cjs');
const { ExportService, decryptRecoveryKey } = require('../src/main/services/exportService.cjs');
const { VersionComparisonService } = require('../src/main/services/versionComparisonService.cjs');
const { WatcherService } = require('../src/main/services/watcherService.cjs');
const { WorkspaceService } = require('../src/main/services/workspaceService.cjs');

async function fixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-test-'));
  const paths = new AppPaths(path.join(root, 'userdata'));
  const logger = new Logger(paths.logsDir);
  const settings = new SettingsStore(paths, logger);
  const crypto = new CryptoService(paths, settings, logger);
  const audit = new AuditStore(paths, logger, crypto, settings);
  const vault = new VaultService(paths, settings, crypto, audit, logger);
  const undo = new UndoService(paths, settings, audit, vault, logger);
  const clipboard = new ClipboardService(paths, settings, audit, logger, null, null, crypto);
  const search = new SearchService(audit, vault, clipboard);
  const integrity = new IntegrityService(paths, vault, logger);
  const retention = new RetentionService(paths, settings, vault, audit, clipboard, logger);
  const checkpoints = new CheckpointService(paths, settings, audit, vault, crypto);
  const comparison = new VersionComparisonService(vault);
  const exporter = new ExportService(paths, settings, audit, vault, checkpoints, { list: () => [] }, crypto, logger);
  return { root, paths, logger, settings, crypto, audit, vault, undo, clipboard, search, integrity, retention, checkpoints, comparison, exporter };
}

test('settings contain bilingual local-first defaults', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const settings = fx.settings.get();
  assert.equal(settings.language, 'de');
  assert.equal(settings.privacy.localOnly, true);
  assert.equal(settings.storage.encryptionEnabled, true);
  assert.ok(Array.isArray(settings.profiles));
  assert.ok(settings.profiles.length >= 4);
});

test('crypto roundtrip uses authenticated encryption', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const input = Buffer.from('RewindOS test with umlauts: äöüß');
  const encrypted = fx.crypto.encrypt(input);
  assert.notDeepEqual(encrypted, input);
  assert.equal(fx.crypto.decrypt(encrypted).toString('utf8'), input.toString('utf8'));
});

test('vault stores versions, deduplicates objects and restores content', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const folder = path.join(fx.root, 'watched');
  await fsp.mkdir(folder);
  const file = path.join(folder, 'demo.txt');
  await fsp.writeFile(file, 'Version one');
  const v1 = await fx.vault.saveVersion(file, { reason: 'baseline' });
  await fsp.writeFile(file, 'Version two');
  const v2 = await fx.vault.saveVersion(file, { reason: 'modified' });
  assert.notEqual(v1.id, v2.id);
  assert.equal(fx.vault.listVersions(file).length, 2);
  const destination = path.join(folder, 'restored.txt');
  const result = await fx.vault.restoreVersion(v1.id, destination, 'rename', false);
  assert.equal(await fsp.readFile(result.restoredPath, 'utf8'), 'Version one');
  assert.equal(fx.vault.stats().uniqueObjects, 2);
});

test('undo preview and execution restore a deleted file', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const folder = path.join(fx.root, 'watched');
  await fsp.mkdir(folder);
  const file = path.join(folder, 'deleted.txt');
  await fsp.writeFile(file, 'Recover me');
  const version = await fx.vault.saveVersion(file, { reason: 'baseline' });
  await fsp.rm(file);
  const event = fx.audit.add({ action: 'deleted', path: file, versionId: version.id, restorable: true });
  const preview = fx.undo.preview(event.id);
  assert.equal(preview.supported, true);
  await fx.undo.execute(event.id, { dryRun: false, conflictRule: 'rename' });
  assert.equal(await fsp.readFile(file, 'utf8'), 'Recover me');
});

test('natural language search recognizes German and English filters', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  fx.audit.add({ action: 'deleted', path: path.join(fx.root, 'foto.jpg'), restorable: false, timestamp: new Date().toISOString() });
  const de = fx.search.query('heute gelöschte Bilder');
  const en = fx.search.query('images deleted today');
  assert.equal(de.parsed.action, 'deleted');
  assert.equal(en.parsed.action, 'deleted');
  assert.equal(de.timeline.length, 1);
  assert.equal(en.timeline.length, 1);
});

test('integrity scan validates encrypted vault objects', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const file = path.join(fx.root, 'healthy.txt');
  await fsp.writeFile(file, 'healthy');
  await fx.vault.saveVersion(file, { reason: 'test' });
  const result = await fx.integrity.scan({ full: true });
  assert.equal(result.checked, 1);
  assert.equal(result.healthy, 1);
  assert.equal(result.corrupt, 0);
});

test('retention forecast reports configured capacity', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const forecast = fx.retention.forecast();
  assert.equal(forecast.maxBytes, fx.settings.get().storage.maxVaultBytes);
  assert.ok(forecast.remainingBytes >= 0);
});


test('app PIN uses scrypt verification and lock state', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const auth = new AuthService(fx.settings);
  auth.setPin('2468');
  assert.equal(auth.status().enabled, true);
  auth.lock();
  assert.equal(auth.status().unlocked, false);
  assert.equal(auth.verify('0000'), false);
  assert.equal(auth.verify('2468'), true);
  assert.equal(auth.status().unlocked, true);
});

test('timeline and vault metadata are encrypted on disk', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  fx.audit.add({ action: 'created', path: path.join(fx.root, 'secret-name.txt'), restorable: false });
  const auditRaw = fs.readFileSync(fx.paths.auditFile);
  assert.equal(auditRaw.subarray(0, 3).toString('utf8'), 'RW1');
  assert.equal(auditRaw.includes(Buffer.from('secret-name.txt')), false);
  const file = path.join(fx.root, 'meta.txt');
  await fsp.writeFile(file, 'metadata');
  await fx.vault.saveVersion(file, { reason: 'test' });
  const versionRaw = fs.readFileSync(fx.paths.versionsFile);
  assert.equal(versionRaw.subarray(0, 3).toString('utf8'), 'RW1');
  assert.equal(versionRaw.includes(Buffer.from('meta.txt')), false);
});


test('text versions can be compared line by line', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const file = path.join(fx.root, 'compare.txt');
  await fsp.writeFile(file, 'alpha\nbeta\ngamma');
  const first = await fx.vault.saveVersion(file, { reason: 'first' });
  await fsp.writeFile(file, 'alpha\nbeta changed\ngamma\ndelta');
  const second = await fx.vault.saveVersion(file, { reason: 'second' });
  const result = await fx.comparison.compare(first.id, second.id);
  assert.equal(result.type, 'text');
  assert.equal(result.changed, 1);
  assert.equal(result.added, 1);
  assert.equal(result.sameContent, false);
});

test('protected trash restores files to the original location', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const file = path.join(fx.root, 'trash-me.txt');
  await fsp.writeFile(file, 'safe');
  const item = await fx.vault.moveToProtectedTrash(file, 'test');
  assert.equal(fs.existsSync(file), false);
  const restored = await fx.vault.restoreTrash(item.id, 'rename');
  assert.equal(restored.restoredPath, file);
  assert.equal(await fsp.readFile(file, 'utf8'), 'safe');
});

test('checkpoints collect and restore multiple current versions', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const folder = path.join(fx.root, 'project');
  await fsp.mkdir(folder);
  fx.settings.update({ monitoring: { watchedFolders: [folder] } });
  const a = path.join(folder, 'a.txt');
  const b = path.join(folder, 'b.txt');
  await fsp.writeFile(a, 'A'); await fsp.writeFile(b, 'B');
  await fx.vault.saveVersion(a); await fx.vault.saveVersion(b);
  const checkpoint = await fx.checkpoints.create({ name: 'Stable', note: 'before test' });
  assert.equal(checkpoint.versions.length, 2);
  const preview = await fx.checkpoints.previewRestore(checkpoint.id);
  assert.equal(preview.items.length, 2);
});

test('settings exports never contain app PIN verification data', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  new AuthService(fx.settings).setPin('12345678');
  const destination = path.join(fx.root, 'settings-export.json');
  fx.exporter.exportSettings(destination);
  const exported = JSON.parse(await fsp.readFile(destination, 'utf8'));
  assert.equal(exported.privacy.pinHash, undefined);
  assert.equal(exported.privacy.pinSalt, undefined);
  assert.equal(exported.privacy.appPinEnabled, false);
});

test('recovery bundles wrap the master key with a passphrase', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const file = path.join(fx.root, 'recovery.txt');
  await fsp.writeFile(file, 'recoverable');
  await fx.vault.saveVersion(file);
  const exportRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-export-'));
  t.after(() => fs.rmSync(exportRoot, { recursive: true, force: true }));
  const destination = await fx.exporter.createRecoveryBundle(exportRoot, 'correct horse battery');
  const wrapped = JSON.parse(await fsp.readFile(path.join(destination, 'recovery-key.json'), 'utf8'));
  const recovered = decryptRecoveryKey(wrapped, 'correct horse battery');
  assert.deepEqual(recovered, fx.crypto.exportMasterKey());
  assert.throws(() => decryptRecoveryKey(wrapped, 'wrong password'));
});

test('project spaces override the default maximum version count', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const folder = path.join(fx.root, 'protected-project');
  await fsp.mkdir(folder);
  fx.settings.update({ projectSpaces: [{ id: 'p', name: 'P', folders: [folder], maxVersions: 2, retentionDays: 500 }] });
  const file = path.join(folder, 'code.txt');
  for (let index = 0; index < 4; index += 1) {
    await fsp.writeFile(file, `version-${index}`);
    await fx.vault.saveVersion(file, { force: true });
  }
  assert.equal(fx.vault.listVersions(file).length, 2);
  assert.equal(fx.retention.retentionDaysForPath(file), 500);
});

test('watcher correlates a same-content delete and create as rename or move', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const platform = { getActiveApplication: async () => ({ process: 'test-runner' }) };
  const watcher = new WatcherService(fx.settings, fx.audit, fx.vault, fx.logger, platform);
  const oldPath = path.join(fx.root, 'old-name.txt');
  const newPath = path.join(fx.root, 'new-name.txt');
  await fsp.writeFile(oldPath, 'same content');
  const version = await fx.vault.saveVersion(oldPath, { reason: 'baseline' });
  const stat = await fsp.stat(oldPath);
  watcher.baseline.set(oldPath, { exists: true, size: stat.size, mtimeMs: stat.mtimeMs, latestVersionId: version.id });
  await fsp.rename(oldPath, newPath);
  await watcher.processPath(oldPath, 'rename');
  await watcher.processPath(newPath, 'rename');
  clearTimeout(watcher.groupTimer);
  const correlated = fx.audit.list({ limit: 20 }).find((event) => event.action === 'renamed' || event.action === 'moved');
  assert.ok(correlated);
  assert.equal(correlated.fromPath, oldPath);
  assert.equal(correlated.toPath, newPath);
});

test('undo can restore a previous RewindOS settings state', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const previousSettings = fx.settings.getPublic();
  fx.settings.update({ appearance: { theme: 'light' } });
  const event = fx.audit.add({ action: 'settings-changed', path: 'RewindOS settings', previousSettings, restorable: true });
  await fx.undo.execute(event.id, { dryRun: false });
  assert.equal(fx.settings.get().appearance.theme, previousSettings.appearance.theme);
});

test('custom vault paths are configured before services use them', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const target = path.join(fx.root, 'external-vault');
  fx.paths.configureVault(target);
  assert.equal(fx.paths.vaultDir, path.resolve(target));
  assert.equal(fs.existsSync(fx.paths.objectsDir), true);
});


test('workspace screenshots are encrypted at rest and decrypted only for preview', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
  const desktopCapturer = {
    getSources: async () => [{ thumbnail: { toPNG: () => png } }]
  };
  const platform = {
    listWindows: async () => [{ title: 'Editor', executable: '/usr/bin/editor' }],
    capabilities: () => ({ restoreWindows: true }),
    restoreWindows: async () => ({ restored: 1 })
  };
  const workspaces = new WorkspaceService(fx.paths, platform, fx.logger, desktopCapturer, fx.crypto, fx.settings);
  const workspace = await workspaces.capture({ name: 'Encrypted desk', includeScreenshot: true });
  const storedWorkspace = workspaces.items.find((item) => item.id === workspace.id);
  const raw = await fsp.readFile(storedWorkspace.screenshotPaths[0]);
  assert.equal(raw.subarray(0, 3).toString('utf8'), 'RW1');
  assert.equal(raw.includes(png), false);
  assert.equal(workspaces.screenshotData(workspace.id), `data:image/png;base64,${png.toString('base64')}`);
});

test('undo rules are enforced instead of being display-only settings', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const file = path.join(fx.root, 'created.txt');
  await fsp.writeFile(file, 'new');
  fx.settings.update({ undoRules: { create: false } });
  const event = fx.audit.add({ action: 'created', path: file, restorable: true });
  const preview = fx.undo.preview(event.id);
  assert.equal(preview.supported, false);
  assert.match(preview.warning, /disabled/i);
});

test('directory create and delete events have safe undo behavior', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const removed = path.join(fx.root, 'removed-folder');
  const deletedEvent = fx.audit.add({ action: 'directory-deleted', path: removed, restorable: true });
  await fx.undo.execute(deletedEvent.id, { dryRun: false });
  assert.equal(fs.statSync(removed).isDirectory(), true);

  const created = path.join(fx.root, 'created-folder');
  await fsp.mkdir(created); await fsp.writeFile(path.join(created, 'inside.txt'), 'content');
  const createdEvent = fx.audit.add({ action: 'directory-created', path: created, restorable: true });
  await fx.undo.execute(createdEvent.id, { dryRun: false });
  assert.equal(fs.existsSync(created), false);
  assert.ok(fx.vault.listTrash().some((item) => item.originalPath === created && item.isDirectory));
});

test('watcher identifies copied files and makes them undoable', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const platform = { getActiveApplication: async () => ({ process: 'test-runner' }) };
  const watcher = new WatcherService(fx.settings, fx.audit, fx.vault, fx.logger, platform);
  const source = path.join(fx.root, 'source.txt'); const copy = path.join(fx.root, 'copy.txt');
  await fsp.writeFile(source, 'same bytes'); await fx.vault.saveVersion(source, { reason: 'baseline' });
  await fsp.copyFile(source, copy); await watcher.processPath(copy, 'rename'); clearTimeout(watcher.groupTimer);
  const event = fx.audit.list({ limit: 20 }).find((item) => item.action === 'copied');
  assert.ok(event); assert.equal(event.fromPath, source); assert.equal(fx.undo.preview(event.id).supported, true);
});

test('filesystem deletions are also exposed in protected trash', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const platform = { getActiveApplication: async () => ({ process: 'test-runner' }) };
  const watcher = new WatcherService(fx.settings, fx.audit, fx.vault, fx.logger, platform);
  const file = path.join(fx.root, 'externally-deleted.txt');
  await fsp.writeFile(file, 'recoverable');
  const version = await fx.vault.saveVersion(file, { reason: 'baseline' });
  const stat = await fsp.stat(file);
  watcher.baseline.set(file, { exists: true, type: 'file', size: stat.size, mtimeMs: stat.mtimeMs, latestVersionId: version.id });
  await fsp.rm(file); await watcher.processPath(file, 'rename'); clearTimeout(watcher.groupTimer);
  const item = fx.vault.listTrash().find((entry) => entry.originalPath === file);
  assert.ok(item); assert.equal(item.externalDeletion, true);
});

test('workspace recovery reopens explicitly selected project folders', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const folder = path.join(fx.root, 'project-folder');
  await fsp.mkdir(folder);
  const opened = [];
  const platform = {
    listWindows: async () => [],
    capabilities: () => ({ platform: 'test' }),
    restoreWindows: async () => ({ launched: [] }),
    openFolder: async (value) => { opened.push(value); return true; }
  };
  const workspaceService = new WorkspaceService(fx.paths, platform, fx.logger, null, fx.crypto, fx.settings, fx.clipboard);
  const workspace = await workspaceService.capture({ name: 'Project', includeScreenshot: false, projectFolders: [folder] });
  const restored = await workspaceService.restore(workspace.id);
  assert.deepEqual(opened, [folder]);
  assert.equal(restored.projectFolders[0].opened, true);
});

test('timeline filters by drive, file type and non-restorable status', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const root = path.parse(fx.root).root;
  fx.audit.add({ action: 'deleted', path: path.join(fx.root, 'photo.png'), program: 'editor', restorable: false });
  fx.audit.add({ action: 'modified', path: path.join(fx.root, 'note.txt'), program: 'editor', restorable: true });
  const png = fx.audit.list({ drive: root, extension: '.png', restorable: false });
  assert.equal(png.length, 1);
  assert.equal(path.extname(png[0].path), '.png');
});
