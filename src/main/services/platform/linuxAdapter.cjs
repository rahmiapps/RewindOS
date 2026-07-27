const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs');
const path = require('node:path');
const execFileAsync = promisify(execFile);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const NETWORK_FILESYSTEMS = new Set([
  'nfs', 'nfs4', 'cifs', 'smb3', 'smbfs', 'sshfs', 'fuse.sshfs', 'davfs', 'davfs2',
  '9p', 'ceph', 'glusterfs', 'afs', 'fuse.rclone', 'fuse.curlftpfs'
]);
const CRITICAL_PROCESSES = new Set([
  'systemd', 'init', 'kthreadd', 'ksoftirqd', 'rcu_sched', 'migration', 'watchdog',
  'dbus-daemon', 'systemd-logind', 'systemd-udevd', 'networkmanager', 'polkitd'
]);

function decodeMountPath(value) {
  return String(value || '').replace(/\\040/g, ' ').replace(/\\011/g, '\t').replace(/\\012/g, '\n').replace(/\\134/g, '\\');
}

function normalizedProcessName(value) {
  return String(value || '').trim().toLowerCase();
}

function sameExecutable(left, right) {
  if (!left || !right) return true;
  try { return path.resolve(left) === path.resolve(right); }
  catch { return false; }
}

class LinuxAdapter {
  capabilities() {
    const wayland = Boolean(process.env.WAYLAND_DISPLAY);
    return {
      platform: 'linux', desktopSession: process.env.XDG_CURRENT_DESKTOP || 'unknown', wayland,
      recursiveFileWatch: true, globalShortcuts: wayland ? 'desktop-dependent' : true,
      windowCapture: wayland ? 'portal-dependent' : 'wmctrl-dependent',
      windowPositionRestore: wayland ? false : 'wmctrl-best-effort', processAttribution: 'foreground-app-only',
      activeProcessBlocking: false, manualProcessTermination: true, manualProcessSuspension: true,
      fileManagerIntegration: 'desktop-dependent', filesystemSnapshots: 'btrfs/lvm-dependent',
      pathClassification: true, systemStateCapture: 'gnome-best-effort', systemStateRestore: 'gnome-best-effort'
    };
  }

  async getPowerStatus() {
    const root = '/sys/class/power_supply';
    try {
      const battery = fs.readdirSync(root).find((name) => /^BAT/i.test(name));
      if (!battery) return { available: false, charging: true, percent: null };
      const dir = path.join(root, battery);
      const percent = Number(fs.readFileSync(path.join(dir, 'capacity'), 'utf8').trim());
      const status = fs.readFileSync(path.join(dir, 'status'), 'utf8').trim().toLowerCase();
      return { available: true, charging: status === 'charging' || status === 'full', percent };
    } catch { return { available: false, charging: true, percent: null }; }
  }

  mountTable() {
    try {
      return fs.readFileSync('/proc/self/mountinfo', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
        const [left, right = ''] = line.split(' - ');
        const fields = left.split(' ');
        const extra = right.split(' ');
        return {
          mountPoint: decodeMountPath(fields[4]),
          options: fields[5] || '',
          fsType: extra[0] || '',
          source: decodeMountPath(extra[1] || '')
        };
      }).sort((a, b) => b.mountPoint.length - a.mountPoint.length);
    } catch { return []; }
  }

  async classifyPath(targetPath) {
    const absolute = path.resolve(String(targetPath || ''));
    const systemPrefixes = ['/proc', '/sys', '/dev', '/boot', '/run', '/snap'];
    const system = systemPrefixes.some((root) => absolute === root || absolute.startsWith(`${root}/`));
    const mount = this.mountTable().find((entry) => absolute === entry.mountPoint || absolute.startsWith(`${entry.mountPoint.replace(/\/$/, '')}/`));
    if (!mount) return { type: 'unknown', system, path: absolute };
    const fsType = String(mount.fsType || '').toLowerCase();
    const network = NETWORK_FILESYSTEMS.has(fsType) || /^(?:\/\/|[^/]+:)/.test(mount.source);
    const removable = absolute.startsWith('/media/') || absolute.startsWith('/run/media/') || mount.mountPoint.startsWith('/media/') || mount.mountPoint.startsWith('/run/media/');
    return {
      type: network ? 'network' : removable ? 'removable' : 'fixed', system,
      path: absolute, mountPoint: mount.mountPoint, fsType, source: mount.source
    };
  }

  async getActiveApplication() {
    try {
      const { stdout: id } = await execFileAsync('xdotool', ['getactivewindow'], { timeout: 5000 });
      const { stdout: pidText } = await execFileAsync('xdotool', ['getwindowpid', id.trim()], { timeout: 5000 });
      const pid = Number(pidText.trim());
      const info = await this.getProcessInfo(pid);
      return { pid, process: info.process, executable: info.executable };
    } catch { return null; }
  }

  async getProcessInfo(pid) {
    const value = Number(pid);
    if (!Number.isInteger(value) || value <= 1 || value === process.pid) throw new Error('Invalid process ID');
    const statusText = await fs.promises.readFile(`/proc/${value}/status`, 'utf8');
    const name = statusText.match(/^Name:\s*(.+)$/m)?.[1]?.trim() || '';
    const uid = Number(statusText.match(/^Uid:\s*(\d+)/m)?.[1]);
    let executable = '';
    try { executable = await fs.promises.readlink(`/proc/${value}/exe`); } catch {}
    return { pid: value, process: name, executable, uid };
  }

  validateProcessIdentity(info, expected = {}) {
    if (!info || !Number.isInteger(Number(info.pid))) throw new Error('Process identity could not be verified');
    if (typeof process.getuid === 'function' && Number(info.uid) !== Number(process.getuid())) throw new Error('RewindOS can only control processes owned by the current user');
    const name = normalizedProcessName(info.process);
    if (!name || CRITICAL_PROCESSES.has(name)) throw new Error('Critical Linux processes cannot be controlled by RewindOS');
    if (expected.process && normalizedProcessName(expected.process) !== name) throw new Error('Process identity changed after the alert');
    if (expected.executable && !sameExecutable(expected.executable, info.executable)) throw new Error('Process executable changed after the alert');
    return true;
  }

  async listWindows() {
    try {
      const { stdout } = await execFileAsync('wmctrl', ['-lGxp'], { maxBuffer: 10 * 1024 * 1024, timeout: 10000 });
      return stdout.split(/\r?\n/).filter(Boolean).map((line) => {
        const parts = line.trim().split(/\s+/);
        const [id, desktop, x, y, width, height, host, processName] = parts.slice(0, 8);
        let executable = '';
        const pidMatch = processName?.match(/^(\d+)\./);
        if (pidMatch) { try { executable = fs.readlinkSync(`/proc/${pidMatch[1]}/exe`); } catch {} }
        return { id, desktop, x: Number(x), y: Number(y), width: Number(width), height: Number(height), host, process: processName, executable, title: parts.slice(8).join(' ') };
      });
    } catch { return []; }
  }

  async launchExecutable(executable) {
    if (!executable || !path.isAbsolute(executable) || !fs.existsSync(executable)) return false;
    try {
      const child = spawn(executable, [], { detached: true, stdio: 'ignore', shell: false });
      child.unref(); return true;
    } catch { return false; }
  }

  async restoreWindows(items, { position = true } = {}) {
    const launched = [];
    for (const item of (items || []).slice(0, 200)) {
      if (!item.executable) continue;
      const success = await this.launchExecutable(item.executable);
      let positioned = false;
      if (success && position && !process.env.WAYLAND_DISPLAY && item.title) {
        await delay(1000);
        try {
          await execFileAsync('wmctrl', ['-r', item.title, '-e', `0,${Number(item.x || 0)},${Number(item.y || 0)},${Math.max(100, Number(item.width || 1000))},${Math.max(100, Number(item.height || 700))}`], { timeout: 5000 });
          positioned = true;
        } catch {}
      }
      launched.push({ executable: item.executable, launched: success, positioned });
    }
    return { launched, positioned: launched.some((item) => item.positioned), note: 'Exact restoration depends on the desktop environment and Wayland/X11 permissions.' };
  }

  async captureSystemState() {
    const read = async (schema, key) => {
      try { const { stdout } = await execFileAsync('gsettings', ['get', schema, key], { timeout: 5000 }); return stdout.trim(); }
      catch { return null; }
    };
    const state = {
      platform: 'linux', desktop: process.env.XDG_CURRENT_DESKTOP || '',
      colorScheme: await read('org.gnome.desktop.interface', 'color-scheme'),
      pictureUri: await read('org.gnome.desktop.background', 'picture-uri'),
      pictureUriDark: await read('org.gnome.desktop.background', 'picture-uri-dark')
    };
    return Object.values(state).some((value, index) => index > 1 && value) ? state : null;
  }

  async restoreSystemState(state) {
    if (!state || state.platform !== 'linux') return { restored: false, reason: 'unsupported-state' };
    const allowedColorSchemes = new Set(["'default'", "'prefer-dark'", "'prefer-light'"]);
    const operations = [];
    if (allowedColorSchemes.has(state.colorScheme)) operations.push(['org.gnome.desktop.interface', 'color-scheme', state.colorScheme]);
    for (const [key, value] of [['picture-uri', state.pictureUri], ['picture-uri-dark', state.pictureUriDark]]) {
      if (typeof value === 'string' && value.length <= 32768 && /^'(?:file:\/\/|)'/.test(value)) operations.push(['org.gnome.desktop.background', key, value]);
    }
    const results = [];
    for (const args of operations) {
      try { await execFileAsync('gsettings', ['set', ...args], { timeout: 5000 }); results.push({ key: args[1], restored: true }); }
      catch (error) { results.push({ key: args[1], restored: false, error: error.message }); }
    }
    return { restored: results.some((item) => item.restored), results };
  }

  async openFolder(folder) {
    const absolute = path.resolve(String(folder || ''));
    if (!path.isAbsolute(absolute) || !fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) return false;
    try {
      const child = spawn('xdg-open', [absolute], { detached: true, stdio: 'ignore', shell: false });
      child.unref(); return true;
    } catch { return false; }
  }

  async terminateProcess(pid, expected = {}) {
    const value = Number(pid);
    const info = await this.getProcessInfo(value);
    this.validateProcessIdentity(info, expected);
    process.kill(value, 'SIGTERM');
    return { stopped: true, process: info.process, pid: value };
  }

  async suspendProcess(pid, expected = {}) {
    const value = Number(pid);
    const info = await this.getProcessInfo(value);
    this.validateProcessIdentity(info, expected);
    process.kill(value, 'SIGSTOP');
    return { suspended: true, process: info.process, pid: value };
  }

  async resumeProcess(pid, expected = {}) {
    const value = Number(pid);
    const info = await this.getProcessInfo(value);
    this.validateProcessIdentity(info, expected);
    process.kill(value, 'SIGCONT');
    return { resumed: true, process: info.process, pid: value };
  }
}

module.exports = { LinuxAdapter, NETWORK_FILESYSTEMS, CRITICAL_PROCESSES };
