const fs = require('node:fs');
const path = require('node:path');
const { id, nowIso, safeFileName, atomicWriteBuffer } = require('../../shared/utils.cjs');
const { readSecureJson, writeSecureJson } = require('./secureJson.cjs');

class WorkspaceService {
  constructor(paths, platformAdapter, logger, desktopCapturer = null, cryptoService = null, settingsStore = null, clipboardService = null) {
    this.paths = paths;
    this.platform = platformAdapter;
    this.logger = logger;
    this.desktopCapturer = desktopCapturer;
    this.crypto = cryptoService;
    this.settingsStore = settingsStore;
    this.clipboardService = clipboardService;
    this.items = cryptoService ? readSecureJson(paths.workspacesFile, [], cryptoService) : [];
  }

  async capture({ name, note = '', includeScreenshot = true, clipboardText = undefined, projectFolders = [] } = {}) {
    const settings = this.settingsStore?.get() || {};
    const windows = await this.platform.listWindows();
    const screenshotPaths = [];
    const previewsAllowed = !settings.privacy?.privateMode && !settings.privacy?.disablePreviews;
    if (includeScreenshot && previewsAllowed && this.desktopCapturer) {
      try {
        const sources = await this.desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 }, fetchWindowIcons: false });
        for (let index = 0; index < sources.length; index += 1) {
          const png = sources[index].thumbnail.toPNG();
          const screenshotPath = path.join(this.paths.workspacesDir, `${Date.now()}-${index}-${safeFileName(name || 'workspace')}.rwi`);
          atomicWriteBuffer(screenshotPath, this.crypto ? this.crypto.encrypt(png) : png, 0o600);
          screenshotPaths.push(screenshotPath);
        }
      } catch (error) { this.logger.warn('Workspace screenshot capture failed', { message: error.message }); }
    }
    const clipboardSnapshot = clipboardText !== undefined
      ? { text: String(clipboardText), filePaths: [] }
      : settings.workspace?.includeClipboard !== false ? this.clipboardService?.currentSnapshot?.() || null : null;
    const workspace = {
      id: id('workspace'), name: name || `Workspace ${new Date().toLocaleString()}`, note,
      createdAt: nowIso(), windows, screenshotPaths, screenshotPath: screenshotPaths[0] || '',
      clipboardSnapshot, clipboardText: clipboardSnapshot?.text || '',
      projectFolders: [...new Set((projectFolders || []).map((folder) => path.resolve(folder)))],
      capabilities: this.platform.capabilities()
    };
    this.items.unshift(workspace); this.save(); return this.publicItem(workspace);
  }

  publicItem(workspace) {
    const copy = structuredClone(workspace);
    copy.screenshotCount = (workspace.screenshotPaths || (workspace.screenshotPath ? [workspace.screenshotPath] : [])).length;
    delete copy.screenshotPaths;
    delete copy.screenshotPath;
    return copy;
  }

  list() { return this.items.map((item) => this.publicItem(item)); }

  screenshotData(workspaceId, index = 0) {
    const workspace = this.items.find((item) => item.id === workspaceId);
    const paths = workspace?.screenshotPaths || (workspace?.screenshotPath ? [workspace.screenshotPath] : []);
    const screenshotPath = paths[index];
    if (!screenshotPath || !fs.existsSync(screenshotPath)) return null;
    const settings = this.settingsStore?.get();
    if (settings?.privacy?.privateMode || settings?.privacy?.disablePreviews) return null;
    const raw = fs.readFileSync(screenshotPath);
    const png = path.extname(screenshotPath).toLowerCase() === '.rwi' && this.crypto ? this.crypto.decrypt(raw) : raw;
    return `data:image/png;base64,${png.toString('base64')}`;
  }

  async restore(workspaceId) {
    const workspace = this.items.find((item) => item.id === workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    const settings = this.settingsStore?.get() || {};
    const result = await this.platform.restoreWindows(workspace.windows, { position: settings.workspace?.restoreWindowPositions !== false });
    const projectFolders = [];
    if (typeof this.platform.openFolder === 'function') {
      for (const folder of (workspace.projectFolders || []).slice(0, 100)) {
        if (!path.isAbsolute(folder) || !fs.existsSync(folder)) { projectFolders.push({ folder, opened: false, reason: 'missing' }); continue; }
        try { projectFolders.push({ folder, opened: Boolean(await this.platform.openFolder(folder)) }); }
        catch (error) { projectFolders.push({ folder, opened: false, reason: error.message }); }
      }
    }
    let clipboardRestored = false;
    if (settings.workspace?.restoreClipboard !== false && workspace.clipboardSnapshot && this.clipboardService) clipboardRestored = this.clipboardService.restoreSnapshot(workspace.clipboardSnapshot);
    workspace.lastRestoredAt = nowIso(); this.save();
    return { workspace: this.publicItem(workspace), result, projectFolders, clipboardRestored };
  }

  remove(workspaceId) {
    const workspace = this.items.find((item) => item.id === workspaceId);
    const paths = workspace?.screenshotPaths || (workspace?.screenshotPath ? [workspace.screenshotPath] : []);
    for (const screenshotPath of paths) { try { fs.unlinkSync(screenshotPath); } catch {} }
    this.items = this.items.filter((item) => item.id !== workspaceId); this.save(); return true;
  }

  save() { if (this.crypto) writeSecureJson(this.paths.workspacesFile, this.items, this.crypto, this.settingsStore?.get().privacy.databaseEncryption !== false); }
}

module.exports = { WorkspaceService };
