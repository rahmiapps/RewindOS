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
const { SearchService } = require('../src/main/services/searchService.cjs');
const { WatcherService } = require('../src/main/services/watcherService.cjs');
const { DEFAULT_HOTKEYS } = require('../src/shared/defaults.cjs');

async function fixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-ui-deletion-'));
  const paths = new AppPaths(path.join(root, 'userdata'));
  const logger = new Logger(paths.logsDir);
  const settings = new SettingsStore(paths, logger);
  const crypto = new CryptoService(paths, settings, logger);
  const audit = new AuditStore(paths, logger, crypto, settings);
  const vault = new VaultService(paths, settings, crypto, audit, logger);
  const clipboard = new ClipboardService(paths, settings, audit, logger, null, null, crypto);
  const watcher = new WatcherService(settings, audit, vault, logger, { getActiveApplication: async () => ({ process: 'Explorer.exe' }) });
  const search = new SearchService(audit, vault, clipboard, settings);
  return { root, paths, logger, settings, crypto, audit, vault, clipboard, watcher, search };
}

test('a deleted image from a protected folder is searchable by name and restores to its original path', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const protectedFolder = path.join(fx.root, 'Pictures');
  await fsp.mkdir(protectedFolder);
  const image = path.join(protectedFolder, 'Urlaub-am-Meer.png');
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5]);
  await fsp.writeFile(image, bytes);
  fx.settings.addWatchedFolder(protectedFolder);
  await fx.watcher.initialScan(protectedFolder);
  await fsp.rm(image);
  await fx.watcher.processPath(image, 'rename');

  const result = fx.search.query('heute gelöschte Bilder');
  assert.equal(result.protection.watchedFolders, 1);
  assert.equal(result.trash.length, 1);
  assert.equal(result.trash[0].name, 'Urlaub-am-Meer.png');
  assert.equal(result.trash[0].originalPath, image);
  assert.equal(result.timeline.some((event) => event.action === 'deleted' && event.path === image), true);

  const restored = await fx.vault.restoreTrash(result.trash[0].id, 'replace');
  assert.equal(restored.restoredPath, image);
  assert.deepEqual(await fsp.readFile(image), bytes);
});

test('smart deletion search explains when no folders are protected', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const result = fx.search.query('heute gelöschte Bilder');
  assert.equal(result.protection.deletionQuery, true);
  assert.equal(result.protection.watchedFolders, 0);
  assert.deepEqual(result.trash, []);
});

test('hotkey settings keep known defaults and reject malformed or duplicate imported accelerators', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  fx.settings.update({ hotkeys: { undoLast: 'not a shortcut', openTimeline: DEFAULT_HOTKEYS.undoLast } });
  const hotkeys = fx.settings.get().hotkeys;
  assert.equal(hotkeys.undoLast, DEFAULT_HOTKEYS.undoLast);
  assert.equal(hotkeys.openTimeline, DEFAULT_HOTKEYS.openTimeline);
  assert.equal(new Set(Object.values(hotkeys).filter(Boolean)).size, Object.values(hotkeys).filter(Boolean).length);
});

test('renderer contains the requested popup, responsive, scrollbar, dark-select and editable-hotkey fixes', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles.css'), 'utf8');
  const defaults = fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'defaults.cjs'), 'utf8');
  assert.doesNotMatch(renderer, /Vollständig mit Umlauten|Complete interface/);
  assert.match(renderer, /openRecentActivitiesPopup/);
  assert.match(renderer, /showRecentActivitiesPopup/);
  assert.match(renderer, /data-edit-hotkey/);
  assert.match(renderer, /showHotkeyEditor/);
  assert.match(renderer, /class=\\?"path-display code\\?"/);
  assert.match(renderer, /testRestore: false/);
  assert.match(renderer, /Wähle mindestens einen Schutzordner/);
  assert.match(styles, /\*::-webkit-scrollbar-thumb/);
  assert.match(styles, /select option \{ background: #11182d/);
  assert.match(styles, /data-large-layout/);
  assert.match(styles, /dashboard-launcher/);
  assert.match(defaults, /testRestoreFirst: false/);
});
