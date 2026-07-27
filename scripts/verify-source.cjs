const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const failures = [];
const note = (message) => process.stdout.write(`✓ ${message}\n`);
const fail = (message) => failures.push(message);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

for (const file of walk(path.join(root, 'src')).concat(walk(path.join(root, 'tests')))) {
  if (!/\.(?:c?js)$/.test(file)) continue;
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) fail(`Syntax error in ${path.relative(root, file)}: ${result.stderr.trim()}`);
}
if (!failures.length) note('JavaScript and CommonJS syntax');

const renderer = fs.readFileSync(path.join(root, 'src/renderer/app.js'), 'utf8');
const start = renderer.indexOf('const T = ');
const navStart = renderer.indexOf('const navItems', start);
if (start < 0 || navStart < 0) fail('Renderer translation table could not be located.');
else {
  try {
    const literal = renderer.slice(start + 'const T = '.length, navStart).trim().replace(/;\s*$/, '');
    const table = vm.runInNewContext(`(${literal})`, Object.create(null));
    const de = Object.keys(table.de).sort();
    const en = Object.keys(table.en).sort();
    if (JSON.stringify(de) !== JSON.stringify(en)) fail('Renderer German and English translation keys differ.');
    else note(`Renderer translations (${de.length} matching keys)`);
  } catch (error) { fail(`Renderer translations are invalid: ${error.message}`); }
}

try {
  const shared = require(path.join(root, 'src/shared/translations.cjs'));
  const de = Object.keys(shared.STRINGS.de).sort();
  const en = Object.keys(shared.STRINGS.en).sort();
  if (JSON.stringify(de) !== JSON.stringify(en)) fail('Shared German and English translation keys differ.');
  else note(`Shared translations (${de.length} matching keys)`);
} catch (error) { fail(`Shared translations failed to load: ${error.message}`); }

const html = fs.readFileSync(path.join(root, 'src/renderer/index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = ids.filter((value, index) => ids.indexOf(value) !== index);
if (duplicates.length) fail(`Duplicate HTML IDs: ${[...new Set(duplicates)].join(', ')}`);
const requiredIds = ['content', 'navigation', 'modalRoot', 'toastRoot', 'pageTitle', 'pageSubtitle', 'tagline', 'protectionButton', 'protectionLabel', 'settingsButton', 'refreshButton', 'emergencyButton'];
for (const id of requiredIds) if (!ids.includes(id)) fail(`Missing renderer root element #${id}`);
if (!duplicates.length && requiredIds.every((id) => ids.includes(id))) note('Renderer HTML structure');

const mainSource = fs.readFileSync(path.join(root, 'src/main/main.cjs'), 'utf8');
for (const pattern of [
  [/contextIsolation:\s*true/, 'context isolation'],
  [/sandbox:\s*true/, 'renderer sandbox'],
  [/nodeIntegration:\s*false/, 'Node integration disabled'],
  [/webviewTag:\s*false/, 'webviews disabled'],
  [/allowRunningInsecureContent:\s*false/, 'insecure content disabled']
]) if (!pattern[0].test(mainSource)) fail(`Missing security control: ${pattern[1]}`);
for (const directive of ["connect-src 'none'", "object-src 'none'", "frame-src 'none'", "worker-src 'none'"])
  if (!html.includes(directive)) fail(`Content Security Policy is missing ${directive}.`);
if (!failures.some((item) => item.includes('security control') || item.includes('Content Security Policy'))) note('Electron renderer security controls');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!packageJson.scripts?.audit || !packageJson.scripts?.smoke) fail('Security audit or smoke-test script is missing.');
else note('Dependency audit and startup smoke-test scripts');
if (packageJson.version !== '0.4.0' || packageJson.devDependencies?.electron !== '43.2.0' || packageJson.devDependencies?.['electron-builder'] !== '26.15.3') fail('Pinned release dependency versions are not the reviewed RewindOS 0.4.0 versions.');
else note('Pinned reviewed release dependency versions');

const features = fs.readFileSync(path.join(root, 'docs/FEATURES.md'), 'utf8');
for (let index = 1; index <= 30; index += 1) {
  if (!new RegExp(`^${index}\\.\\s`, 'm').test(features)) fail(`Feature map is missing accepted extension ${index}.`);
}
if ([...Array(30)].every((_, index) => new RegExp(`^${index + 1}\\.\\s`, 'm').test(features))) note('All 30 accepted extensions are mapped');

const builder = fs.readFileSync(path.join(root, 'electron-builder.yml'), 'utf8');
for (const target of ['nsis', 'portable', 'AppImage', 'deb', 'rpm']) {
  if (!builder.includes(target)) fail(`Installer target ${target} is missing.`);
}
if (['nsis', 'portable', 'AppImage', 'deb', 'rpm'].every((target) => builder.includes(target))) note('Windows and Linux installer targets');
for (const requirement of ['include: build/installer.nsh', 'install-linux-file-manager-integration.sh', 'uninstall-linux-file-manager-integration.sh', 'register-explorer-menu.ps1']) {
  if (!builder.includes(requirement)) fail(`Installer integration resource is missing: ${requirement}`);
}
const nsis = fs.readFileSync(path.join(root, 'build/installer.nsh'), 'utf8');
if (!/WriteRegStr HKCU/.test(nsis) || /WriteRegStr HKLM/.test(nsis) || !/customUnInstall/.test(nsis) || !/DeleteRegKey HKCU/.test(nsis)) fail('NSIS Explorer integration must be per-user and removed on uninstall.');
else note('Per-user Windows Explorer integration lifecycle');
const linuxBuild = fs.readFileSync(path.join(root, 'scripts/build-linux.sh'), 'utf8');
if (!/REWINDOS_SKIP_SMOKE/.test(linuxBuild) || !/exit 1/.test(linuxBuild)) fail('Linux build does not enforce the graphical smoke test by default.');
else note('Strict Linux graphical smoke-test gate');

if (failures.length) {
  process.stderr.write(`\nVerification failed (${failures.length}):\n${failures.map((item) => `- ${item}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write('\nRewindOS source verification passed.\n');
