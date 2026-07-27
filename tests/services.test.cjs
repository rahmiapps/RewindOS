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
const { ExportService } = require('../src/main/services/exportService.cjs');
const { BackupMirrorService } = require('../src/main/services/backupMirrorService.cjs');
const { SchedulerService } = require('../src/main/services/schedulerService.cjs');
const { PerformanceService } = require('../src/main/services/performanceService.cjs');

async function fixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-services-'));
  const paths = new AppPaths(path.join(root, 'userdata'));
  const logger = new Logger(paths.logsDir);
  const settings = new SettingsStore(paths, logger);
  const crypto = new CryptoService(paths, settings, logger);
  const audit = new AuditStore(paths, logger, crypto, settings);
  const vault = new VaultService(paths, settings, crypto, audit, logger);
  const clipboard = new ClipboardService(paths, settings, audit, logger, null, null, crypto);
  const checkpoints = new CheckpointService(paths, settings, audit, vault, crypto, { clipboardService: clipboard });
  const exporter = new ExportService(paths, settings, audit, vault, checkpoints, { list: () => [] }, crypto, logger);
  return { root, paths, logger, settings, crypto, audit, vault, clipboard, checkpoints, exporter };
}

test('external mirrors use encrypted stored credentials and password-protected recovery bundles', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const mirrorRoot = path.join(fx.root, 'external-mirror');
  await fsp.mkdir(mirrorRoot);
  fx.settings.update({ storage: { mirrorEnabled: true, mirrorPath: mirrorRoot, mirrorIntervalHours: 24 } });
  const service = new BackupMirrorService(fx.paths, fx.settings, fx.exporter, fx.logger, fx.crypto);
  const passphrase = 'a strong mirror passphrase 2026';
  const result = await service.mirror(passphrase, { remember: true, reason: 'test' });

  assert.equal(result.skipped, false);
  assert.equal(result.encrypted, true);
  assert.ok(fs.existsSync(result.destination));
  assert.ok(fs.existsSync(path.join(result.destination, 'recovery-key.json')));
  assert.ok(fs.existsSync(path.join(result.destination, 'manifest.json')));
  const rawCredential = await fsp.readFile(fx.paths.mirrorCredentialFile);
  assert.equal(rawCredential.includes(Buffer.from(passphrase)), false);
  assert.equal(service.storedPassphrase(), passphrase);
  assert.equal(service.status().hasStoredPassphrase, true);
  assert.equal(service.isDue(Date.now()), false);
  service.clearCredential();
  assert.equal(service.status().hasStoredPassphrase, false);
});

test('scheduler runs due maintenance once and daily summary only once per local day', async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'rewindos-scheduler-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const calls = { cleanup: 0, integrity: 0, mirror: 0, notifications: 0 };
  const settingsValue = {
    language: 'de',
    storage: { autoCleanup: true },
    monitoring: { healthChecks: true },
    performance: { scanIntervalMinutes: 5 },
    notifications: { dailySummary: true, dailySummaryHour: 19 }
  };
  const scheduler = new SchedulerService(
    { schedulerStateFile: path.join(root, 'scheduler-state.json') },
    { get: () => structuredClone(settingsValue) },
    { canRunHeavyTask: () => true },
    { cleanup: () => { calls.cleanup += 1; return { removed: 0 }; } },
    { scan: async () => { calls.integrity += 1; return { ok: true }; } },
    {
      isDue: () => true,
      status: () => ({ hasStoredPassphrase: true }),
      mirror: async (_passphrase, options) => { calls.mirror += 1; assert.equal(options.reason, 'scheduled'); return { skipped: false }; }
    },
    { list: () => [{ action: 'modified' }, { action: 'restored' }] },
    { show: (_title, body) => { calls.notifications += 1; assert.match(body, /2 geschützte Änderungen/); } },
    null
  );
  const now = new Date(2026, 6, 25, 20, 30, 0);
  await scheduler.tick(now);
  await scheduler.tick(new Date(2026, 6, 25, 21, 0, 0));
  assert.deepEqual(calls, { cleanup: 1, integrity: 2, mirror: 2, notifications: 1 });
  assert.ok(fs.existsSync(path.join(root, 'scheduler-state.json')));
});

test('gaming mode defers heavy work without disabling continuous file protection', async () => {
  const suspended = [];
  const settings = {
    get: () => ({ performance: {
      reduceDuringGaming: true,
      gamingProcesses: ['mygame.exe'],
      pauseOnBatteryBelow: 20,
      quietMode: false,
      onlyHeavyTasksOnAC: false
    } })
  };
  const service = new PerformanceService(
    settings,
    { setRuntimeSuspended: async (reason) => suspended.push(reason) },
    {
      getPowerStatus: async () => ({ available: true, charging: true, percent: 100 }),
      getActiveApplication: async () => ({ process: 'MyGame.exe' })
    },
    null
  );
  const result = await service.evaluate();
  assert.equal(result.gaming, true);
  assert.equal(result.deferHeavyTasks, true);
  assert.equal(result.reason, null);
  assert.deepEqual(suspended, [null]);
  assert.equal(service.canRunHeavyTask(), false);
});

test('low battery mode pauses file monitoring to honor the explicit battery threshold', async () => {
  const suspended = [];
  const settings = {
    get: () => ({ performance: {
      reduceDuringGaming: false,
      gamingProcesses: [],
      pauseOnBatteryBelow: 25,
      quietMode: false,
      onlyHeavyTasksOnAC: true
    } })
  };
  const service = new PerformanceService(
    settings,
    { setRuntimeSuspended: async (reason) => suspended.push(reason) },
    { getPowerStatus: async () => ({ available: true, charging: false, percent: 15 }), getActiveApplication: async () => null },
    null
  );
  const result = await service.evaluate();
  assert.equal(result.reason, 'low-battery');
  assert.equal(result.deferHeavyTasks, true);
  assert.deepEqual(suspended, ['low-battery']);
  assert.equal(service.canRunHeavyTask(), false);
});
