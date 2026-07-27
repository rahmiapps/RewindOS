const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ensureDir } = require('../../shared/utils.cjs');

class AutoStartService {
  constructor(electronApp, logger) {
    this.app = electronApp;
    this.logger = logger;
  }

  apply(enabled) {
    if (process.platform === 'win32' || process.platform === 'darwin') {
      try {
        this.app.setLoginItemSettings({
          openAtLogin: Boolean(enabled),
          openAsHidden: true,
          args: ['--background']
        });
        return { enabled: Boolean(enabled), platform: process.platform };
      } catch (error) {
        this.logger.warn('Unable to update login item', { message: error.message });
        return { enabled: false, error: error.message };
      }
    }

    const autostartDir = ensureDir(path.join(os.homedir(), '.config', 'autostart'));
    const desktopFile = path.join(autostartDir, 'rewindos.desktop');
    if (!enabled) {
      try { fs.rmSync(desktopFile, { force: true }); } catch {}
      return { enabled: false, platform: 'linux' };
    }
    const executable = process.execPath.replace(/"/g, '\\"');
    const content = `[Desktop Entry]\nType=Application\nName=RewindOS\nComment=Local undo and recovery center\nExec="${executable}" --background\nTerminal=false\nX-GNOME-Autostart-enabled=true\nCategories=Utility;System;\n`;
    fs.writeFileSync(desktopFile, content, { mode: 0o644 });
    return { enabled: true, platform: 'linux', file: desktopFile };
  }
}

module.exports = { AutoStartService };
