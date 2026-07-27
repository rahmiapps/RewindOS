class NotificationService {
  constructor(settingsStore, ElectronNotification = null) {
    this.settingsStore = settingsStore;
    this.Notification = ElectronNotification;
  }

  show(title, body, level = 'info') {
    const settings = this.settingsStore.get();
    if (!settings.general.notifications || !this.Notification?.isSupported?.()) return false;
    try {
      new this.Notification({ title, body, urgency: level === 'critical' ? 'critical' : 'normal' }).show();
      return true;
    } catch { return false; }
  }
}

module.exports = { NotificationService };
