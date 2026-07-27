const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs');
const path = require('node:path');
const execFileAsync = promisify(execFile);

const CRITICAL_PROCESSES = new Set([
  'system', 'registry', 'smss', 'csrss', 'wininit', 'services', 'lsass', 'winlogon',
  'svchost', 'dwm', 'fontdrvhost', 'memory compression', 'secure system'
]);

const WINDOW_SCRIPT = String.raw`
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public class RWWin {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
$items = New-Object System.Collections.Generic.List[Object]
[RWWin]::EnumWindows({ param($h,$l)
  if ([RWWin]::IsWindowVisible($h)) {
    $sb = New-Object Text.StringBuilder 1024
    [void][RWWin]::GetWindowText($h,$sb,$sb.Capacity)
    if ($sb.Length -gt 0) {
      $pidValue = 0; [void][RWWin]::GetWindowThreadProcessId($h,[ref]$pidValue)
      $r = New-Object RWWin+RECT; [void][RWWin]::GetWindowRect($h,[ref]$r)
      $p = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
      $items.Add([pscustomobject]@{ title=$sb.ToString(); pid=$pidValue; process=$p.ProcessName; executable=$p.Path; x=$r.Left; y=$r.Top; width=($r.Right-$r.Left); height=($r.Bottom-$r.Top) })
    }
  }
  return $true
},[IntPtr]::Zero) | Out-Null
$items | ConvertTo-Json -Compress
`;

function normalizedProcessName(value) {
  return String(value || '').trim().toLowerCase().replace(/\.exe$/i, '');
}

function sameExecutable(left, right) {
  if (!left || !right) return true;
  try { return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase(); }
  catch { return false; }
}

class WindowsAdapter {
  capabilities() {
    return {
      platform: 'windows', recursiveFileWatch: true, globalShortcuts: true,
      windowCapture: true, windowPositionRestore: 'best-effort', processAttribution: 'foreground-app-only',
      activeProcessBlocking: false, manualProcessTermination: true, manualProcessSuspension: false,
      fileManagerIntegration: true, filesystemSnapshots: 'ntfs-dependent',
      pathClassification: true, systemStateCapture: 'user-settings', systemStateRestore: 'best-effort-user-settings'
    };
  }

  async powershell(script, options = {}) {
    return execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], {
      windowsHide: true, timeout: options.timeout || 15000, maxBuffer: options.maxBuffer || 10 * 1024 * 1024,
      env: { ...process.env, ...(options.env || {}) }
    });
  }

  async getPowerStatus() {
    try {
      const script = "$b=Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1; if($null -eq $b){'{\"available\":false,\"charging\":true,\"percent\":null}'}else{[pscustomobject]@{available=$true;charging=($b.BatteryStatus -in 2,6,7,8,9,11);percent=[int]$b.EstimatedChargeRemaining}|ConvertTo-Json -Compress}";
      const { stdout } = await this.powershell(script, { timeout: 10000 });
      return JSON.parse(stdout.trim());
    } catch { return { available: false, charging: true, percent: null }; }
  }

  async classifyPath(targetPath) {
    const absolute = path.resolve(String(targetPath || ''));
    const lower = absolute.toLowerCase();
    const systemRoots = [process.env.SystemRoot, process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.ProgramData]
      .filter(Boolean).map((value) => path.resolve(value).toLowerCase());
    const system = systemRoots.some((root) => lower === root || lower.startsWith(`${root}${path.sep}`));
    if (/^\\\\/.test(String(targetPath || ''))) return { type: 'network', system, path: absolute, source: 'unc' };
    const drive = path.parse(absolute).root.replace(/[\\/]+$/, '');
    if (!drive) return { type: 'unknown', system, path: absolute };
    const script = "$d=Get-CimInstance Win32_LogicalDisk -ErrorAction SilentlyContinue | Where-Object {$_.DeviceID -eq $env:REWINDOS_DRIVE} | Select-Object -First 1; if($null -eq $d){''}else{[string]$d.DriveType}";
    try {
      const { stdout } = await this.powershell(script, { timeout: 10000, env: { REWINDOS_DRIVE: drive } });
      const driveType = Number(stdout.trim());
      const type = driveType === 2 ? 'removable' : driveType === 4 ? 'network' : driveType === 3 ? 'fixed' : 'unknown';
      return { type, system, path: absolute, drive, driveType };
    } catch { return { type: 'unknown', system, path: absolute, drive }; }
  }

  async getActiveApplication() {
    const script = String.raw`Add-Type @"
using System; using System.Runtime.InteropServices;
public class RWActive { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId); }
"@
$h=[RWActive]::GetForegroundWindow(); $pidValue=0; [void][RWActive]::GetWindowThreadProcessId($h,[ref]$pidValue); $p=Get-Process -Id $pidValue -ErrorAction SilentlyContinue; [pscustomobject]@{pid=$pidValue;process=$p.ProcessName;executable=$p.Path} | ConvertTo-Json -Compress`;
    try {
      const { stdout } = await this.powershell(script, { timeout: 10000 });
      return stdout.trim() ? JSON.parse(stdout) : null;
    } catch { return null; }
  }

  async getProcessInfo(pid) {
    const value = Number(pid);
    if (!Number.isInteger(value) || value <= 4 || value === process.pid) throw new Error('Invalid process ID');
    const script = String.raw`$idValue=[int]$env:REWINDOS_PID; $p=Get-Process -Id $idValue -ErrorAction Stop; $w=Get-CimInstance Win32_Process -Filter ("ProcessId="+$idValue) -ErrorAction SilentlyContinue; $owner=''; if($null -ne $w){$o=Invoke-CimMethod -InputObject $w -MethodName GetOwner -ErrorAction SilentlyContinue; if($null -ne $o){$owner=($o.Domain+'\\'+$o.User)}}; [pscustomobject]@{pid=$p.Id;process=$p.ProcessName;executable=$p.Path;sessionId=$p.SessionId;owner=$owner} | ConvertTo-Json -Compress`;
    const { stdout } = await this.powershell(script, { timeout: 10000, env: { REWINDOS_PID: String(value) } });
    if (!stdout.trim()) throw new Error('Process not found');
    return JSON.parse(stdout);
  }

  validateProcessIdentity(info, expected = {}) {
    if (!info || !Number.isInteger(Number(info.pid))) throw new Error('Process identity could not be verified');
    const name = normalizedProcessName(info.process);
    if (!name || CRITICAL_PROCESSES.has(name)) throw new Error('Critical Windows processes cannot be controlled by RewindOS');
    if (expected.process && normalizedProcessName(expected.process) !== name) throw new Error('Process identity changed after the alert');
    if (expected.executable && !sameExecutable(expected.executable, info.executable)) throw new Error('Process executable changed after the alert');
    return true;
  }

  async listWindows() {
    try {
      const { stdout } = await this.powershell(WINDOW_SCRIPT, { timeout: 20000 });
      const parsed = stdout.trim() ? JSON.parse(stdout) : [];
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch { return []; }
  }

  async launchExecutable(executable) {
    if (!executable || !path.isAbsolute(executable) || !fs.existsSync(executable)) return false;
    const encoded = Buffer.from(String(executable), 'utf8').toString('base64');
    const script = "$p=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:REWINDOS_EXE)); Start-Process -FilePath $p";
    try {
      await this.powershell(script, { timeout: 15000, env: { REWINDOS_EXE: encoded } });
      return true;
    } catch { return false; }
  }

  async restoreWindows(items, { position = true } = {}) {
    const safeItems = (items || []).filter((item) => item.executable && path.isAbsolute(item.executable) && fs.existsSync(item.executable)).slice(0, 200).map((item) => ({
      executable: item.executable, process: item.process || '', title: item.title || '',
      x: Number(item.x || 0), y: Number(item.y || 0), width: Math.max(100, Number(item.width || 1000)), height: Math.max(100, Number(item.height || 700))
    }));
    if (!safeItems.length) return { launched: [], positioned: false, note: 'No restorable executable paths were available.' };
    const payload = Buffer.from(JSON.stringify({ items: safeItems, position }), 'utf8').toString('base64');
    const script = String.raw`
Add-Type @"
using System; using System.Runtime.InteropServices;
public class RWPosition { [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint flags); }
"@
$data=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:REWINDOS_WINDOWS)) | ConvertFrom-Json
$results=@()
foreach($item in $data.items){
  try {
    $p=Start-Process -FilePath $item.executable -PassThru
    $deadline=(Get-Date).AddSeconds(12); $target=$null
    do { Start-Sleep -Milliseconds 300; $p.Refresh(); if($p.MainWindowHandle -ne 0){$target=$p;break} } while((Get-Date) -lt $deadline -and -not $p.HasExited)
    $positioned=$false
    if($data.position -and $null -ne $target){$positioned=[RWPosition]::SetWindowPos($target.MainWindowHandle,[IntPtr]::Zero,[int]$item.x,[int]$item.y,[int]$item.width,[int]$item.height,0x0040)}
    $results += [pscustomobject]@{executable=$item.executable;launched=$true;positioned=$positioned;pid=$p.Id}
  } catch { $results += [pscustomobject]@{executable=$item.executable;launched=$false;positioned=$false;error=$_.Exception.Message} }
}
$results | ConvertTo-Json -Compress`;
    try {
      const { stdout } = await this.powershell(script, { timeout: 180000, env: { REWINDOS_WINDOWS: payload } });
      const parsed = stdout.trim() ? JSON.parse(stdout) : [];
      const launched = Array.isArray(parsed) ? parsed : [parsed];
      return { launched, positioned: launched.some((item) => item.positioned), note: 'Window placement is best-effort because applications control their own startup behavior.' };
    } catch (error) { return { launched: [], positioned: false, error: error.message }; }
  }

  async captureSystemState() {
    const script = String.raw`$desktop=Get-ItemProperty 'HKCU:\Control Panel\Desktop' -ErrorAction SilentlyContinue; $theme=Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -ErrorAction SilentlyContinue; [pscustomobject]@{platform='windows';wallpaper=[string]$desktop.WallPaper;appsUseLightTheme=[int]$theme.AppsUseLightTheme;systemUsesLightTheme=[int]$theme.SystemUsesLightTheme} | ConvertTo-Json -Compress`;
    try {
      const { stdout } = await this.powershell(script, { timeout: 10000 });
      return stdout.trim() ? JSON.parse(stdout) : null;
    } catch { return null; }
  }

  async restoreSystemState(state) {
    if (!state || state.platform !== 'windows') return { restored: false, reason: 'unsupported-state' };
    const payload = {
      appsUseLightTheme: Number(state.appsUseLightTheme) === 0 ? 0 : 1,
      systemUsesLightTheme: Number(state.systemUsesLightTheme) === 0 ? 0 : 1,
      wallpaper: typeof state.wallpaper === 'string' && path.isAbsolute(state.wallpaper) && fs.existsSync(state.wallpaper) ? state.wallpaper.slice(0, 32768) : ''
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    const script = String.raw`$data=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:REWINDOS_STATE)) | ConvertFrom-Json; $key='HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'; New-Item -Path $key -Force | Out-Null; Set-ItemProperty -Path $key -Name AppsUseLightTheme -Type DWord -Value ([int]$data.appsUseLightTheme); Set-ItemProperty -Path $key -Name SystemUsesLightTheme -Type DWord -Value ([int]$data.systemUsesLightTheme); $wallpaperRestored=$false; if(-not [string]::IsNullOrWhiteSpace([string]$data.wallpaper) -and (Test-Path -LiteralPath ([string]$data.wallpaper) -PathType Leaf)){ Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name WallPaper -Value ([string]$data.wallpaper); Add-Type @"
using System; using System.Runtime.InteropServices; public class RWDesktop { [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern bool SystemParametersInfo(int a,int b,string c,int d); }
"@; $wallpaperRestored=[RWDesktop]::SystemParametersInfo(20,0,[string]$data.wallpaper,3) }; [pscustomobject]@{restored=$true;themeRestored=$true;wallpaperRestored=$wallpaperRestored} | ConvertTo-Json -Compress`;
    try {
      const { stdout } = await this.powershell(script, { timeout: 20000, env: { REWINDOS_STATE: encoded } });
      return stdout.trim() ? JSON.parse(stdout) : { restored: true };
    } catch (error) { return { restored: false, error: error.message }; }
  }

  async openFolder(folder) {
    const absolute = path.resolve(String(folder || ''));
    if (!path.isAbsolute(absolute) || !fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) return false;
    try { await execFileAsync('explorer.exe', [absolute], { windowsHide: true, timeout: 10000 }); return true; }
    catch { return false; }
  }

  async terminateProcess(pid, expected = {}) {
    const value = Number(pid);
    const info = await this.getProcessInfo(value);
    this.validateProcessIdentity(info, expected);
    try {
      await execFileAsync('taskkill.exe', ['/PID', String(value), '/T', '/F'], { windowsHide: true, timeout: 15000 });
      return { stopped: true, process: info.process, pid: value };
    } catch (error) { throw new Error(`Unable to stop process: ${error.message}`); }
  }
}

module.exports = { WindowsAdapter, CRITICAL_PROCESSES };
