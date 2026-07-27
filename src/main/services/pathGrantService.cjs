const fs = require('node:fs');
const path = require('node:path');
const { isWithin, safeLocalPath, assertNoSymlinkComponents } = require('../../shared/securityUtils.cjs');

class PathGrantService {
  constructor(paths, settingsStore, logger) {
    this.paths = paths;
    this.settings = settingsStore;
    this.logger = logger;
    this.grants = new Map();
    this.maxGrants = 256;
  }

  grant(target, { directory = false, ttlMs = 30 * 60 * 1000, writable = false } = {}) {
    const absolute = safeLocalPath(target, { mustExist: !writable, allowSymlink: false });
    if (fs.existsSync(absolute)) assertNoSymlinkComponents(absolute);
    const key = process.platform === 'win32' ? absolute.toLowerCase() : absolute;
    this.grants.set(key, { path: absolute, directory, writable, expiresAt: Date.now() + Math.max(1000, Math.min(ttlMs, 24 * 60 * 60 * 1000)) });
    if (this.grants.size > this.maxGrants) this.grants.delete(this.grants.keys().next().value);
    return absolute;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, grant] of this.grants) if (grant.expiresAt <= now) this.grants.delete(key);
  }

  roots() {
    const settings = this.settings.get();
    return [
      this.paths.baseDir,
      this.paths.vaultDir,
      ...(settings.monitoring.watchedFolders || []),
      ...(settings.projectSpaces || []).flatMap((space) => space.folders || [])
    ].filter(Boolean).map((item) => path.resolve(item));
  }

  assertAllowed(target, { write = false, mustExist = false, allowInternal = true } = {}) {
    this.cleanup();
    const absolute = safeLocalPath(target, { mustExist, allowSymlink: false });
    if (fs.existsSync(absolute)) assertNoSymlinkComponents(absolute);
    if (allowInternal && this.roots().some((root) => isWithin(root, absolute))) return absolute;
    const key = process.platform === 'win32' ? absolute.toLowerCase() : absolute;
    for (const grant of this.grants.values()) {
      if (write && !grant.writable) continue;
      const grantKey = process.platform === 'win32' ? grant.path.toLowerCase() : grant.path;
      if (key === grantKey || (grant.directory && isWithin(grant.path, absolute))) return absolute;
    }
    const error = new Error('The requested path was not selected or granted by the user');
    error.code = 'PATH_NOT_GRANTED';
    this.logger?.warn('Blocked ungranted path request', { target: absolute, write });
    throw error;
  }

  revoke(target) {
    const absolute = path.resolve(String(target || ''));
    this.grants.delete(process.platform === 'win32' ? absolute.toLowerCase() : absolute);
  }
}

module.exports = { PathGrantService };
