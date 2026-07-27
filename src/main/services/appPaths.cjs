const path = require('node:path');
const os = require('node:os');
const { ensureDir } = require('../../shared/utils.cjs');

class AppPaths {
  constructor(baseDir) {
    this.baseDir = ensureDir(baseDir || path.join(os.homedir(), '.rewindos'));
    this.configDir = ensureDir(path.join(this.baseDir, 'config'));
    this.dataDir = ensureDir(path.join(this.baseDir, 'data'));
    this.exportsDir = ensureDir(path.join(this.baseDir, 'exports'));
    this.logsDir = ensureDir(path.join(this.baseDir, 'logs'));
    this.tempDir = ensureDir(path.join(this.baseDir, 'temp'));
    this.testRestoresDir = ensureDir(path.join(this.baseDir, 'test-restores'));
    this.recoveryStagingDir = ensureDir(path.join(this.baseDir, 'recovery-staging'));

    this.settingsFile = path.join(this.configDir, 'settings.json');
    this.masterKeyFile = path.join(this.configDir, 'master.key');
    this.securityStateFile = path.join(this.configDir, 'security-state.json');
    this.mirrorCredentialFile = path.join(this.configDir, 'mirror-credential.bin');
    this.mirrorStateFile = path.join(this.configDir, 'mirror-state.json');
    this.schedulerStateFile = path.join(this.configDir, 'scheduler-state.json');
    this.auditFile = path.join(this.dataDir, 'timeline.json');
    this.versionsFile = path.join(this.dataDir, 'versions.json');
    this.trashFile = path.join(this.dataDir, 'trash.json');
    this.checkpointsFile = path.join(this.dataDir, 'checkpoints.json');
    this.clipboardFile = path.join(this.dataDir, 'clipboard.json');
    this.workspacesFile = path.join(this.dataDir, 'workspaces.json');
    this.diagnosticsFile = path.join(this.dataDir, 'diagnostics.json');

    this.configureVault(path.join(this.baseDir, 'vault'));
  }

  configureVault(vaultDir) {
    this.vaultDir = ensureDir(path.resolve(vaultDir || path.join(this.baseDir, 'vault')));
    this.objectsDir = ensureDir(path.join(this.vaultDir, 'objects'));
    this.trashDir = ensureDir(path.join(this.vaultDir, 'trash'));
    this.checkpointsDir = ensureDir(path.join(this.vaultDir, 'checkpoints'));
    this.workspacesDir = ensureDir(path.join(this.vaultDir, 'workspaces'));
    this.clipboardDir = ensureDir(path.join(this.vaultDir, 'clipboard'));
    return this.vaultDir;
  }
}

module.exports = { AppPaths };
