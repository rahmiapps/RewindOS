const https = require('node:https');

function parseVersion(value) {
  return String(value || '').replace(/^v/i, '').split('.').slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
}
function compareVersions(a, b) {
  const left = parseVersion(a); const right = parseVersion(b);
  for (let i = 0; i < 3; i += 1) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}

class UpdateService {
  constructor(settingsStore, app, logger) { this.settings = settingsStore; this.app = app; this.logger = logger; }

  check() {
    const settings = this.settings.get();
    if (!settings.updates.enabled) return Promise.resolve({ skipped: true, reason: 'disabled', currentVersion: this.app.getVersion() });
    const repository = String(settings.updates.repository || 'rahmiapps/RewindOS');
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid update repository');
    return new Promise((resolve, reject) => {
      const request = https.get({
        hostname: 'api.github.com', path: `/repos/${repository}/releases/latest`, method: 'GET',
        timeout: 10000, headers: { 'User-Agent': `RewindOS/${this.app.getVersion()}`, Accept: 'application/vnd.github+json' }
      }, (response) => {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { raw += chunk; if (raw.length > 1024 * 1024) request.destroy(new Error('Update response is too large')); });
        response.on('end', () => {
          if (response.statusCode === 404) return resolve({ skipped: false, available: false, currentVersion: this.app.getVersion(), reason: 'no-release' });
          if (response.statusCode !== 200) return reject(new Error(`Update service returned HTTP ${response.statusCode}`));
          try {
            const release = JSON.parse(raw);
            const latestVersion = String(release.tag_name || '').replace(/^v/i, '');
            resolve({ skipped: false, available: compareVersions(latestVersion, this.app.getVersion()) > 0, currentVersion: this.app.getVersion(), latestVersion, publishedAt: release.published_at || null, releasePage: release.html_url || null });
          } catch (error) { reject(error); }
        });
      });
      request.on('timeout', () => request.destroy(new Error('Update check timed out')));
      request.on('error', (error) => { this.logger?.warn('Update check failed', { message: error.message }); reject(error); });
    });
  }
}

module.exports = { UpdateService, compareVersions };
