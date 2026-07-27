const path = require('node:path');
const { id, nowIso } = require('../../shared/utils.cjs');
const { stripDangerousKeys, safeString } = require('../../shared/securityUtils.cjs');
const { readSecureJson, writeSecureJson } = require('./secureJson.cjs');

class AuditStore {
  constructor(paths, logger, cryptoService = null, settingsStore = null) {
    this.paths = paths;
    this.logger = logger;
    this.crypto = cryptoService;
    this.settingsStore = settingsStore;
    const loaded = cryptoService ? readSecureJson(paths.auditFile, [], cryptoService) : [];
    this.maxEvents = 100000;
    this.events = Array.isArray(loaded) ? loaded.slice(0, this.maxEvents).map((event) => this.normalizeEvent(event)).filter(Boolean) : [];
  }

  normalizeEvent(event) {
    const clean = stripDangerousKeys(event || {});
    if (!clean || typeof clean !== 'object') return null;
    const timestamp = new Date(clean.timestamp || nowIso());
    const item = {
      ...clean,
      id: safeString(clean.id || id('evt'), { maxLength: 200 }),
      timestamp: Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : nowIso(),
      operationGroup: safeString(clean.operationGroup || id('grp'), { maxLength: 200 }),
      source: safeString(clean.source || 'system', { maxLength: 120 }),
      action: safeString(clean.action || 'unknown', { maxLength: 120 }),
      restorable: Boolean(clean.restorable), restored: Boolean(clean.restored), favorite: Boolean(clean.favorite)
    };
    if (item.path) item.path = safeString(item.path, { maxLength: 32768 });
    if (item.program) item.program = safeString(item.program, { maxLength: 512 });
    if (item.reason) item.reason = safeString(item.reason, { maxLength: 2048 });
    item.size = Number.isFinite(Number(item.size)) && Number(item.size) >= 0 ? Number(item.size) : 0;
    return item;
  }

  add(event) {
    const item = this.normalizeEvent(event);
    this.events.unshift(item);
    if (this.events.length > this.maxEvents) {
      const favorites = this.events.filter((entry) => entry.favorite);
      const regular = this.events.filter((entry) => !entry.favorite).slice(0, Math.max(0, this.maxEvents - favorites.length));
      this.events = [...favorites, ...regular].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    this.save(); return structuredClone(item);
  }

  list({ limit = 500, offset = 0, action, query, from, to, restorable, restored, program, drive, extension, favorite } = {}) {
    let data = this.events;
    if (action) data = data.filter((e) => e.action === action);
    if (query) {
      const q = String(query).toLowerCase();
      data = data.filter((e) => JSON.stringify(e).toLowerCase().includes(q));
    }
    if (from) data = data.filter((e) => new Date(e.timestamp) >= new Date(from));
    if (to) data = data.filter((e) => new Date(e.timestamp) <= new Date(to));
    if (restorable !== undefined) data = data.filter((e) => e.restorable === Boolean(restorable));
    if (restored !== undefined) data = data.filter((e) => e.restored === Boolean(restored));
    if (program) data = data.filter((e) => String(e.program || '').toLowerCase().includes(String(program).toLowerCase()));
    if (drive) {
      const wanted = String(drive).trim().toLowerCase().replace(/[\/]+$/, '');
      data = data.filter((e) => String(path.parse(e.path || '').root).toLowerCase().replace(/[\/]+$/, '') === wanted);
    }
    if (extension) {
      const wanted = String(extension).trim().toLowerCase();
      data = data.filter((e) => path.extname(e.path || '').toLowerCase() === (wanted.startsWith('.') ? wanted : `.${wanted}`));
    }
    if (favorite !== undefined) data = data.filter((e) => e.favorite === Boolean(favorite));
    const safeLimit = Math.min(100000, Math.max(1, Number(limit || 500)));
    const safeOffset = Math.max(0, Number(offset || 0));
    return structuredClone(data.slice(safeOffset, safeOffset + safeLimit));
  }

  get(idValue) { return structuredClone(this.events.find((e) => e.id === idValue) || null); }

  update(idValue, patch = {}) {
    const event = this.events.find((item) => item.id === idValue);
    if (!event) return null;
    const merged = this.normalizeEvent({ ...event, ...stripDangerousKeys(patch) });
    Object.assign(event, merged); this.save(); return structuredClone(event);
  }

  setFavorite(idValue, favorite) { return this.update(idValue, { favorite: Boolean(favorite) }); }

  markRestored(idValue, details = {}) {
    const event = this.events.find((e) => e.id === idValue);
    if (!event) return null;
    event.restored = true; event.restoredAt = nowIso(); event.restoreDetails = stripDangerousKeys(details);
    this.save(); return structuredClone(event);
  }

  group(groupId) { return structuredClone(this.events.filter((e) => e.operationGroup === groupId)); }

  clearBefore(date) {
    const cutoff = new Date(date); const before = this.events.length;
    this.events = this.events.filter((e) => new Date(e.timestamp) >= cutoff || e.favorite);
    this.save(); return before - this.events.length;
  }

  save() { if (this.crypto) writeSecureJson(this.paths.auditFile, this.events, this.crypto, this.settingsStore?.get().privacy.databaseEncryption !== false); }
}

module.exports = { AuditStore };
