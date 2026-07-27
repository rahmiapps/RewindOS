const crypto = require('node:crypto');

class AuthService {
  constructor(settingsStore) {
    this.settingsStore = settingsStore;
    this.unlocked = !this.isEnabled();
    this.failedAttempts = 0;
    this.lockedUntil = 0;
    this.lastActivityAt = Date.now();
  }

  isEnabled() {
    const privacy = this.settingsStore.get().privacy;
    return Boolean(privacy.appPinEnabled && privacy.pinSalt && privacy.pinHash);
  }

  status() {
    const retryAfterMs = Math.max(0, this.lockedUntil - Date.now());
    return {
      enabled: this.isEnabled(),
      unlocked: !this.isEnabled() || this.unlocked,
      temporarilyLocked: retryAfterMs > 0,
      retryAfterMs,
      lastActivityAt: this.lastActivityAt
    };
  }

  hash(pin, salt) {
    return crypto.scryptSync(String(pin), salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
  }

  setPin(pin) {
    if (!/^.{4,128}$/s.test(String(pin || ''))) throw new Error('PIN must contain at least 4 characters');
    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = this.hash(pin, salt);
    this.settingsStore.update({ privacy: { appPinEnabled: true, pinSalt: salt, pinHash } });
    this.unlocked = true;
    this.failedAttempts = 0;
    this.lockedUntil = 0;
    return this.status();
  }

  verify(pin) {
    if (!this.isEnabled()) { this.unlocked = true; return true; }
    if (Date.now() < this.lockedUntil) return false;
    const privacy = this.settingsStore.get().privacy;
    const candidate = Buffer.from(this.hash(pin, privacy.pinSalt), 'hex');
    const expected = Buffer.from(privacy.pinHash, 'hex');
    const valid = candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
    if (valid) {
      this.unlocked = true;
      this.failedAttempts = 0;
      this.lockedUntil = 0;
      this.touch();
      return true;
    }
    this.unlocked = false;
    this.failedAttempts += 1;
    const security = this.settingsStore.get().security;
    if (this.failedAttempts >= security.maxPinFailures) {
      this.lockedUntil = Date.now() + security.pinLockoutSeconds * 1000;
      this.failedAttempts = 0;
    }
    return false;
  }

  touch() { this.lastActivityAt = Date.now(); return this.lastActivityAt; }

  lockIfIdle() {
    const minutes = Number(this.settingsStore.get().security.lockAfterMinutes || 0);
    if (!this.isEnabled() || minutes <= 0 || !this.unlocked) return false;
    if (Date.now() - this.lastActivityAt < minutes * 60000) return false;
    this.lock();
    return true;
  }

  lock() {
    if (this.isEnabled()) this.unlocked = false;
    return this.status();
  }

  clearPin(pin) {
    if (this.isEnabled() && !this.verify(pin)) throw new Error(this.status().temporarilyLocked ? 'PIN verification is temporarily locked' : 'Incorrect PIN');
    this.settingsStore.update({ privacy: { appPinEnabled: false, pinSalt: '', pinHash: '' } });
    this.unlocked = true;
    this.failedAttempts = 0;
    this.lockedUntil = 0;
    return this.status();
  }

  assertUnlocked() {
    if (this.isEnabled() && !this.unlocked) throw new Error('RewindOS is locked');
    this.touch();
  }
}

module.exports = { AuthService };
