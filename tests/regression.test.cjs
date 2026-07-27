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
const { ClipboardService } = require('../src/main/services/clipboardService.cjs');
const { CheckpointService } = require('../src/main/services/checkpointService.cjs');
const { WatcherService } = require('../src/main/services/watcherService.cjs');
const { LinuxAdapter } = require('../src/main/services/platform/linuxAdapter.cjs');

async function fixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-regression-'));
  const paths = new AppPaths(path.join(root, 'userdata'));
  const logger = new Logger(paths.logsDir);
  const settings = new SettingsStore(paths, logger);
  const crypto = new CryptoService(paths, settings, logger);
  const audit = new AuditStore(paths, logger, crypto, settings);
  const vault = new VaultService(paths, settings, crypto, audit, logger);
  const clipboard = new ClipboardService(paths, settings, audit, logger, null, null, crypto);
  const undo = new UndoService(paths, settings, audit, vault, logger, { clipboardService: clipboard });
  return { root, paths, logger, settings, crypto, audit, vault, clipboard, undo };
}

test('mass-action rules block grouped and selected undo operations', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const group = 'bulk-group';
  const first = path.join(fx.root, 'first.txt');
  const second = path.join(fx.root, 'second.txt');
  await fsp.writeFile(first, 'one');
  await fsp.writeFile(second, 'two');
  const a = fx.audit.add({ action: 'created', path: first, operationGroup: group, restorable: true });
  const b = fx.audit.add({ action: 'created', path: second, operationGroup: group, restorable: true });
  fx.settings.update({ undoRules: { massActions: false } });
  await assert.rejects(fx.undo.executeSelection([a.id, b.id], { dryRun: false }), /mass actions is disabled/i);
  await assert.rejects(fx.undo.executeGroup(group, { dryRun: false }), /mass actions is disabled/i);
  assert.equal(fs.existsSync(first), true);
  assert.equal(fs.existsSync(second), true);
});

test('nested file events collapse beneath a directory undo event', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const root = path.join(fx.root, 'new-folder');
  const child = path.join(root, 'child.txt');
  await fsp.mkdir(root);
  await fsp.writeFile(child, 'child');
  const childEvent = fx.audit.add({ action: 'created', path: child, operationGroup: 'nested', restorable: true, timestamp: new Date(Date.now() - 1000).toISOString() });
  const parentEvent = fx.audit.add({ action: 'directory-created', path: root, operationGroup: 'nested', restorable: true });
  const preview = await fx.undo.executeSelection([parentEvent.id, childEvent.id], { dryRun: true });
  assert.equal(preview.previews.length, 1);
  assert.equal(preview.previews[0].event.id, parentEvent.id);
  assert.deepEqual(preview.collapsedEventIds, [childEvent.id]);
});

test('protected directory trash restores nested files and keeps encrypted version history', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const folder = path.join(fx.root, 'folder-to-rescue');
  const nested = path.join(folder, 'deep', 'nested');
  const empty = path.join(folder, 'empty');
  await fsp.mkdir(nested, { recursive: true });
  await fsp.mkdir(empty, { recursive: true });
  const first = path.join(folder, 'one.txt');
  const second = path.join(nested, 'two.txt');
  await fsp.writeFile(first, 'ONE');
  await fsp.writeFile(second, 'TWO');

  const item = await fx.vault.moveToProtectedTrash(folder, 'directory-test');
  const versionIds = item.entries.map((entry) => entry.versionId);
  assert.equal(fs.existsSync(folder), false);
  assert.equal(item.type, 'directory');
  assert.equal(item.entries.length, 2);

  const result = await fx.vault.restoreTrash(item.id, 'replace');
  assert.equal(await fsp.readFile(path.join(result.restoredPath, 'one.txt'), 'utf8'), 'ONE');
  assert.equal(await fsp.readFile(path.join(result.restoredPath, 'deep', 'nested', 'two.txt'), 'utf8'), 'TWO');
  assert.equal(fs.existsSync(path.join(result.restoredPath, 'empty')), true);
  for (const versionId of versionIds) assert.ok(fx.vault.findVersion(versionId));
  assert.equal(fx.vault.listTrash().some((entry) => entry.id === item.id), false);
});

test('checkpoint captures and selectively restores supported system state', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const project = path.join(fx.root, 'project');
  await fsp.mkdir(project);
  await fsp.writeFile(path.join(project, 'state.txt'), 'stable');
  fx.settings.addWatchedFolder(project);
  const captured = { platform: 'test', theme: 'dark', wallpaper: 'local' };
  let restoredState = null;
  const platform = {
    captureSystemState: async () => structuredClone(captured),
    restoreSystemState: async (state) => { restoredState = structuredClone(state); return { restored: true }; }
  };
  const checkpoints = new CheckpointService(fx.paths, fx.settings, fx.audit, fx.vault, fx.crypto, {
    clipboardService: fx.clipboard,
    platformAdapter: platform
  });
  const checkpoint = await checkpoints.create({
    name: 'System state', includeWorkspace: false, includeClipboard: false,
    includeSystemState: true, includeFolderStructure: true
  });
  assert.deepEqual(checkpoint.systemState, captured);
  const destinationRoot = path.join(fx.root, 'selective-restore');
  const result = await checkpoints.restore(checkpoint.id, {
    dryRun: false, destinationRoot, versionIds: [], restoreSettings: false,
    restoreWorkspace: false, restoreClipboard: false, restoreSystemState: true
  });
  assert.deepEqual(restoredState, captured);
  assert.equal(result.extras.systemState.restored, true);
  assert.equal(await fsp.readFile(path.join(destinationRoot, path.basename(project), 'state.txt'), 'utf8'), 'stable');
});

test('watcher refuses network, removable and system roots unless explicitly enabled', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const fixed = path.join(fx.root, 'fixed');
  const network = path.join(fx.root, 'network');
  const removable = path.join(fx.root, 'removable');
  const system = path.join(fx.root, 'system');
  for (const folder of [fixed, network, removable, system]) await fsp.mkdir(folder);
  fx.settings.update({
    monitoring: {
      watchedFolders: [fixed, network, removable, system], snapshotExistingFilesOnStart: false,
      includeNetwork: false, includeRemovable: false, includeSystem: false
    }
  });
  const platform = {
    classifyPath: async (folder) => folder === network ? { type: 'network', system: false }
      : folder === removable ? { type: 'removable', system: false }
      : folder === system ? { type: 'fixed', system: true }
      : { type: 'fixed', system: false },
    getActiveApplication: async () => null
  };
  const watcher = new WatcherService(fx.settings, fx.audit, fx.vault, fx.logger, platform);
  await watcher.start();
  t.after(() => watcher.stop());
  assert.deepEqual([...watcher.watchers.keys()], [path.resolve(fixed)]);
  const skipped = fx.audit.list({ action: 'skipped', limit: 20 });
  assert.equal(skipped.filter((entry) => /folder-disabled$/.test(entry.reason || '')).length, 3);
});

test('copy concurrency never exceeds the configured maximum', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  fx.settings.update({ performance: { maxConcurrentCopies: 2 } });
  let active = 0;
  let maximum = 0;
  fx.vault.saveVersionUnlocked = async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 30));
    active -= 1;
    return value;
  };
  const values = await Promise.all(['a', 'b', 'c', 'd', 'e'].map((value) => fx.vault.saveVersion(value)));
  assert.deepEqual(values, ['a', 'b', 'c', 'd', 'e']);
  assert.equal(maximum, 2);
  assert.equal(fx.vault.activeCopies, 0);
});

test('unsafe symlink settings remain permanently disabled after import or update', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  fx.settings.update({ monitoring: { followSymlinks: true }, security: { rejectSymlinkRestores: false } });
  const settings = fx.settings.get();
  assert.equal(settings.monitoring.followSymlinks, false);
  assert.equal(settings.security.rejectSymlinkRestores, true);
});

test('Linux process guard rejects critical, foreign and changed process identities without signaling them', () => {
  const adapter = new LinuxAdapter();
  const uid = typeof process.getuid === 'function' ? process.getuid() : 1000;
  assert.throws(() => adapter.validateProcessIdentity({ pid: 500, process: 'systemd', executable: '/usr/lib/systemd/systemd', uid }), /critical/i);
  if (typeof process.getuid === 'function') {
    assert.throws(() => adapter.validateProcessIdentity({ pid: 501, process: 'editor', executable: '/usr/bin/editor', uid: uid + 1 }), /current user/i);
  }
  assert.throws(() => adapter.validateProcessIdentity(
    { pid: 502, process: 'editor', executable: '/usr/bin/editor', uid },
    { process: 'browser', executable: '/usr/bin/browser' }
  ), /identity changed/i);
  assert.equal(adapter.validateProcessIdentity(
    { pid: 503, process: 'editor', executable: '/usr/bin/editor', uid },
    { process: 'editor', executable: '/usr/bin/editor' }
  ), true);
});
