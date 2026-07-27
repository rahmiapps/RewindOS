const { readJson, atomicWriteJson } = require('../../shared/utils.cjs');

class SchedulerService {
  constructor(paths, settingsStore, performanceService, retentionService, integrityService, backupMirrorService, auditStore, notificationService, logger) {
    this.paths = paths;
    this.settings = settingsStore;
    this.performance = performanceService;
    this.retention = retentionService;
    this.integrity = integrityService;
    this.mirror = backupMirrorService;
    this.audit = auditStore;
    this.notifications = notificationService;
    this.logger = logger;
    this.stateFile = paths.schedulerStateFile;
    this.state = readJson(this.stateFile, { lastCleanupAt: null, lastIntegrityAt: null, lastSummaryDate: null });
    this.timer = null;
    this.running = new Set();
  }

  save() { atomicWriteJson(this.stateFile, this.state); }
  due(lastIso, intervalMs, now) {
    const last = new Date(lastIso || 0).getTime();
    return !Number.isFinite(last) || now.getTime() - last >= intervalMs;
  }

  async once(name, task) {
    if (this.running.has(name)) return null;
    this.running.add(name);
    try { return await task(); }
    catch (error) { this.logger?.error(`Scheduled ${name} failed`, { message: error.message }); return null; }
    finally { this.running.delete(name); }
  }

  async tick(now = new Date()) {
    const settings = this.settings.get();
    const heavyAllowed = this.performance.canRunHeavyTask();
    if (settings.storage.autoCleanup && heavyAllowed && this.due(this.state.lastCleanupAt, 6 * 3600000, now)) {
      const result = await this.once('cleanup', async () => this.retention.cleanup());
      if (result && !result.skipped) { this.state.lastCleanupAt = now.toISOString(); this.save(); }
    }
    const integrityInterval = Math.max(5, Number(settings.performance.scanIntervalMinutes || 60)) * 60000;
    if (settings.monitoring.healthChecks && heavyAllowed && this.due(this.state.lastIntegrityAt, integrityInterval, now)) {
      const result = await this.once('integrity', async () => this.integrity.scan({ full: false }));
      if (result) { this.state.lastIntegrityAt = now.toISOString(); this.save(); }
    }
    if (heavyAllowed && this.mirror.isDue(now.getTime()) && this.mirror.status().hasStoredPassphrase) {
      await this.once('mirror', async () => this.mirror.mirror('', { reason: 'scheduled' }));
    }
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (settings.notifications.dailySummary && now.getHours() >= settings.notifications.dailySummaryHour && this.state.lastSummaryDate !== localDate) {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const events = this.audit.list({ from: start.toISOString(), limit: 100000 });
      const restored = events.filter((event) => event.action === 'restored' || event.restored).length;
      const body = settings.language === 'de'
        ? `${events.length} geschützte Änderungen heute, ${restored} Wiederherstellungen.`
        : `${events.length} protected changes today, ${restored} restorations.`;
      this.notifications.show('RewindOS', body);
      this.state.lastSummaryDate = localDate; this.save();
    }
    return structuredClone(this.state);
  }

  start() {
    this.stop();
    this.tick().catch(() => {});
    this.timer = setInterval(() => this.tick().catch(() => {}), 60000);
    this.timer.unref?.();
  }

  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

module.exports = { SchedulerService };
