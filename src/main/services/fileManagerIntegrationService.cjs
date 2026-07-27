const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

class FileManagerIntegrationService {
  constructor(app, logger) {
    this.app = app;
    this.logger = logger;
  }

  get platform() { return process.platform; }

  toolPath(name) {
    const root = this.app.isPackaged ? path.join(process.resourcesPath, 'tools') : path.resolve(__dirname, '../../../scripts');
    const target = path.join(root, name);
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('The integration tool is unavailable or unsafe');
    return target;
  }

  executablePath() {
    const candidate = this.platform === 'linux' && process.env.APPIMAGE ? process.env.APPIMAGE : this.app.getPath('exe');
    const resolved = fs.realpathSync(candidate);
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) throw new Error('The RewindOS executable could not be verified');
    if (this.platform === 'linux' && (stat.mode & 0o111) === 0) throw new Error('The RewindOS executable is not executable');
    return resolved;
  }

  assertPackaged() {
    if (!this.app.isPackaged && process.env.REWINDOS_ALLOW_DEV_INTEGRATION !== '1') {
      throw new Error('File-manager integration is available only in a packaged RewindOS build');
    }
  }

  async run(file, args = []) {
    const result = await execFileAsync(file, args, {
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env }
    });
    return { stdout: String(result.stdout || '').trim(), stderr: String(result.stderr || '').trim() };
  }

  async status() {
    if (this.platform === 'win32') {
      try {
        await this.run('reg.exe', ['query', 'HKCU\\Software\\Classes\\Directory\\shell\\RewindOS\\command', '/ve']);
        return { supported: true, installed: true, platform: 'windows' };
      } catch { return { supported: true, installed: false, platform: 'windows' }; }
    }
    if (this.platform === 'linux') {
      const home = os.homedir();
      const targets = [
        path.join(home, '.local/share/nautilus/scripts/Protect with RewindOS'),
        path.join(home, '.local/share/nemo/scripts/Protect with RewindOS'),
        path.join(home, '.local/share/kio/servicemenus/rewindos-protect.desktop'),
        path.join(home, '.local/share/kservices5/ServiceMenus/rewindos-protect.desktop')
      ];
      return { supported: true, installed: targets.some((target) => fs.existsSync(target)), platform: 'linux', targets: targets.filter((target) => fs.existsSync(target)).length };
    }
    return { supported: false, installed: false, platform: this.platform };
  }

  async install() {
    this.assertPackaged();
    const executable = this.executablePath();
    if (this.platform === 'win32') {
      const script = this.toolPath('register-explorer-menu.ps1');
      await this.run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-ExecutablePath', executable]);
    } else if (this.platform === 'linux') {
      await this.run('/usr/bin/env', ['bash', this.toolPath('install-linux-file-manager-integration.sh'), executable]);
    } else throw new Error('File-manager integration is not supported on this platform');
    const current = await this.status();
    if (!current.installed) throw new Error('The file-manager integration could not be verified after installation');
    this.logger.info('File-manager integration installed', { platform: this.platform });
    return current;
  }

  async uninstall() {
    this.assertPackaged();
    if (this.platform === 'win32') {
      await this.run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', this.toolPath('unregister-explorer-menu.ps1')]);
    } else if (this.platform === 'linux') {
      await this.run('/usr/bin/env', ['bash', this.toolPath('uninstall-linux-file-manager-integration.sh')]);
    } else throw new Error('File-manager integration is not supported on this platform');
    const current = await this.status();
    if (current.installed) throw new Error('The file-manager integration could not be verified as removed');
    this.logger.info('File-manager integration removed', { platform: this.platform });
    return current;
  }
}

module.exports = { FileManagerIntegrationService };
