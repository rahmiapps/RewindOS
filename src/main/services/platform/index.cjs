const { WindowsAdapter } = require('./windowsAdapter.cjs');
const { LinuxAdapter } = require('./linuxAdapter.cjs');

function createPlatformAdapter() {
  if (process.platform === 'win32') return new WindowsAdapter();
  return new LinuxAdapter();
}

module.exports = { createPlatformAdapter };
