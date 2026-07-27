class PerformanceService {
  constructor(settingsStore, watcherService, platformAdapter, logger) {
    this.settingsStore = settingsStore;
    this.watcherService = watcherService;
    this.platform = platformAdapter;
    this.logger = logger;
    this.timer = null;
    this.lastStatus = { available: false, charging: true, percent: null, reason: null, activeProcess: null, deferHeavyTasks: false };
  }

  async evaluate() {
    const settings = this.settingsStore.get();
    let status = { available: false, charging: true, percent: null };
    let active = null;
    try { status = await this.platform.getPowerStatus(); } catch {}
    if (settings.performance.reduceDuringGaming && settings.performance.gamingProcesses.length) {
      try { active = await this.platform.getActiveApplication(); } catch {}
    }
    const processName = String(active?.process || '').toLowerCase();
    const gaming = Boolean(processName && settings.performance.reduceDuringGaming && settings.performance.gamingProcesses.some((name) => processName.includes(String(name).toLowerCase())));
    const lowBattery = Boolean(status.available && !status.charging && Number(status.percent) <= Number(settings.performance.pauseOnBatteryBelow));
    const watcherReason = lowBattery ? 'low-battery' : null;
    const heavyReason = lowBattery ? 'low-battery' : settings.performance.quietMode ? 'quiet-mode' : gaming ? 'gaming-mode' : null;

    this.lastStatus = { ...status, reason: watcherReason, activeProcess: active?.process || null, gaming, heavyReason, deferHeavyTasks: Boolean(heavyReason) };
    await this.watcherService.setRuntimeSuspended(watcherReason);
    return this.lastStatus;
  }

  start() {
    this.stop();
    this.evaluate().catch(() => {});
    this.timer = setInterval(() => this.evaluate().catch(() => {}), 60000);
    this.timer.unref?.();
  }

  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  canRunHeavyTask() {
    const settings = this.settingsStore.get();
    if (this.lastStatus.deferHeavyTasks) return false;
    if (!settings.performance.onlyHeavyTasksOnAC) return true;
    return !this.lastStatus.available || this.lastStatus.charging;
  }

  status() { return structuredClone(this.lastStatus); }
}

module.exports = { PerformanceService };
