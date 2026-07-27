const fs = require('node:fs');
const path = require('node:path');
const { id, nowIso, atomicWriteBuffer } = require('../../shared/utils.cjs');
const { readSecureJson, writeSecureJson } = require('./secureJson.cjs');

class ClipboardService {
  constructor(paths, settingsStore, auditStore, logger, electronClipboard = null, platformAdapter = null, cryptoService = null, nativeImage = null) {
    this.paths = paths;
    this.settingsStore = settingsStore;
    this.audit = auditStore;
    this.logger = logger;
    this.clipboard = electronClipboard;
    this.platform = platformAdapter;
    this.crypto = cryptoService;
    this.nativeImage = nativeImage;
    this.items = cryptoService ? readSecureJson(paths.clipboardFile, [], cryptoService) : [];
    this.timer = null;
    this.lastSignature = '';
  }

  start() {
    this.stop();
    const settings = this.settingsStore.get();
    if (!settings.clipboard.enabled || !this.clipboard) return;
    this.timer = setInterval(() => this.capture().catch((error) => this.logger.warn('Clipboard capture failed', { message: error.message })), settings.clipboard.pollIntervalMs);
    this.timer.unref?.();
  }

  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  looksSensitive(text) {
    if (!text) return false;
    const trimmed = String(text).trim();
    if (/password|passwort|otp|2fa|secret|recovery code|wiederherstellungscode|private key|api[-_ ]?key/i.test(trimmed)) return true;
    if (/^\d{6,8}$/.test(trimmed)) return true;
    if (/^(?:[A-Za-z0-9+/_-]{24,}={0,2})$/.test(trimmed) && !/\s/.test(trimmed)) return true;
    return false;
  }

  readFilePaths(text) {
    const result = [];
    try {
      const formats = this.clipboard.availableFormats?.() || [];
      if (formats.includes('text/uri-list')) {
        const raw = this.clipboard.read('text/uri-list');
        for (const line of String(raw).split(/\r?\n/)) {
          if (!line || line.startsWith('#') || !line.startsWith('file://')) continue;
          try { result.push(decodeURIComponent(new URL(line).pathname).replace(/^\/(?:([A-Za-z]:))/,'$1')); } catch {}
        }
      }
      if (process.platform === 'win32' && formats.includes('FileNameW')) {
        const value = this.clipboard.readBuffer('FileNameW').toString('ucs2').replace(/\0+$/g, '');
        if (value) result.push(value);
      }
    } catch {}
    for (const line of String(text || '').split(/\r?\n/)) {
      const candidate = line.trim().replace(/^"|"$/g, '');
      if (candidate && path.isAbsolute(candidate) && fs.existsSync(candidate)) result.push(path.resolve(candidate));
    }
    return [...new Set(result)].slice(0, 500);
  }

  classify(text, imagePng, filePaths) {
    if (imagePng && (text || filePaths.length)) return 'mixed';
    if (imagePng) return 'image';
    if (filePaths.length) return 'files';
    if (/^https?:\/\/\S+$/i.test(String(text).trim())) return 'link';
    return 'text';
  }

  async capture() {
    const settings = this.settingsStore.get();
    if (settings.privacy.privateMode) return null;
    const activeApp = this.platform?.getActiveApplication ? await this.platform.getActiveApplication() : null;
    if (activeApp?.process && (settings.privacy.sensitiveApps || []).some((name) => activeApp.process.toLowerCase().includes(String(name).toLowerCase()))) return null;
    const text = settings.clipboard.captureText ? this.clipboard.readText() : '';
    const image = settings.clipboard.captureImages ? this.clipboard.readImage() : null;
    const imagePng = image && !image.isEmpty() ? image.toPNG() : null;
    const filePaths = settings.clipboard.captureFilePaths ? this.readFilePaths(text) : [];
    if (!text && !imagePng && !filePaths.length) return null;
    if (!settings.clipboard.captureLinks && /^https?:\/\/\S+$/i.test(String(text).trim())) return null;
    const signature = this.crypto
      ? this.crypto.hashBuffer(Buffer.concat([Buffer.from(text), imagePng || Buffer.alloc(0), Buffer.from(filePaths.join('\n'))]))
      : `${text}|${imagePng?.length || 0}|${filePaths.join('|')}`;
    if (signature === this.lastSignature) return null;
    this.lastSignature = signature;
    if (settings.clipboard.ignorePasswords && this.looksSensitive(text)) return null;

    let imagePath = '';
    if (imagePng) {
      imagePath = path.join(this.paths.clipboardDir, `${Date.now()}-${id('img')}.rwi`);
      atomicWriteBuffer(imagePath, this.crypto ? this.crypto.encrypt(imagePng) : imagePng, 0o600);
    }
    const item = {
      id: id('clip'), type: this.classify(text, imagePng, filePaths), text: String(text).slice(0, 2 * 1024 * 1024),
      filePaths, imagePath, createdAt: nowIso(), favorite: false, pinned: false,
      protected: Boolean(settings.clipboard.protectedByDefault), program: activeApp?.process || 'unknown'
    };
    this.items.unshift(item);
    this.cleanup(); this.save();
    if (settings.undoRules.clipboard) this.audit.add({ action: 'clipboard-captured', path: item.type, clipboardItemId: item.id, restorable: true, source: 'clipboard', program: item.program });
    return structuredClone(item);
  }

  cleanup() {
    const settings = this.settingsStore.get();
    const cutoff = Date.now() - settings.clipboard.retentionDays * 86400000;
    const protectedItems = []; const regular = [];
    for (const item of this.items) {
      if (item.favorite || item.pinned || item.protected) protectedItems.push(item);
      else if (new Date(item.createdAt).getTime() >= cutoff) regular.push(item);
      else this.deleteImage(item);
    }
    const allowedRegular = Math.max(0, settings.clipboard.maxItems - protectedItems.length);
    for (const item of regular.slice(allowedRegular)) this.deleteImage(item);
    this.items = [...protectedItems, ...regular.slice(0, allowedRegular)].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  deleteImage(item) { if (item?.imagePath) { try { fs.unlinkSync(item.imagePath); } catch {} } }

  publicItem(item) {
    const value = structuredClone(item);
    delete value.imagePath;
    value.hasImage = Boolean(item.imagePath);
    return value;
  }

  list(query = '') {
    const q = String(query).toLowerCase();
    return this.items.filter((item) => !q || item.text.toLowerCase().includes(q) || item.filePaths?.some((p) => p.toLowerCase().includes(q)) || item.program.toLowerCase().includes(q)).map((item) => this.publicItem(item));
  }

  get(itemId) { return this.items.find((entry) => entry.id === itemId) || null; }

  preview(itemId) {
    const item = this.get(itemId);
    if (!item) throw new Error('Clipboard item not found');
    const settings = this.settingsStore.get();
    if (settings.privacy.privateMode || settings.privacy.disablePreviews) return { available: false, reason: 'previews-disabled' };
    if (!item.imagePath || !fs.existsSync(item.imagePath)) return { available: false, reason: 'no-image' };
    const raw = fs.readFileSync(item.imagePath);
    const png = path.extname(item.imagePath) === '.rwi' && this.crypto ? this.crypto.decrypt(raw) : raw;
    return { available: true, type: 'image', dataUrl: `data:image/png;base64,${png.toString('base64')}` };
  }

  currentSnapshot() {
    if (!this.clipboard) return { text: '', filePaths: [] };
    const text = this.clipboard.readText();
    return { text, filePaths: this.readFilePaths(text) };
  }

  restoreSnapshot(snapshot = {}) {
    if (!this.clipboard) return false;
    this.clipboard.writeText(String(snapshot.text || (snapshot.filePaths || []).join('\n')));
    this.lastSignature = '';
    return true;
  }

  copy(itemId) {
    const item = this.get(itemId);
    if (!item || !this.clipboard) throw new Error('Clipboard item not found');
    if (item.imagePath && this.nativeImage) {
      const raw = fs.readFileSync(item.imagePath);
      const png = path.extname(item.imagePath) === '.rwi' && this.crypto ? this.crypto.decrypt(raw) : raw;
      this.clipboard.writeImage(this.nativeImage.createFromBuffer(png));
      if (item.text) this.clipboard.writeText(item.text);
    } else this.clipboard.writeText(item.text || (item.filePaths || []).join('\n'));
    this.lastSignature = '';
    return true;
  }

  setFlag(itemId, key, value) {
    const item = this.get(itemId);
    if (!item) return null;
    item[key] = Boolean(value); this.save(); return this.publicItem(item);
  }
  favorite(itemId, value) { return this.setFlag(itemId, 'favorite', value); }
  pin(itemId, value) { return this.setFlag(itemId, 'pinned', value); }
  protect(itemId, value) { return this.setFlag(itemId, 'protected', value); }

  remove(itemId) {
    const item = this.get(itemId); this.deleteImage(item);
    this.items = this.items.filter((entry) => entry.id !== itemId); this.save(); return true;
  }

  clear({ includeProtected = false } = {}) {
    const keep = [];
    for (const item of this.items) {
      if (!includeProtected && (item.favorite || item.pinned || item.protected)) keep.push(item); else this.deleteImage(item);
    }
    this.items = keep; this.save(); return { remaining: keep.length };
  }

  save() { if (this.crypto) writeSecureJson(this.paths.clipboardFile, this.items, this.crypto, this.settingsStore.get().privacy.databaseEncryption !== false); }
}

module.exports = { ClipboardService };
