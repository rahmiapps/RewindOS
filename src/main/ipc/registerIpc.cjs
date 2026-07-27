const path = require('node:path');
const { stripDangerousKeys, safeString, isWithin } = require('../../shared/securityUtils.cjs');

const MAX_IPC_BYTES = 2 * 1024 * 1024;

function safeError(error) {
  const allowedCodes = new Set(['PATH_NOT_GRANTED', 'APP_LOCKED', 'PIN_LOCKED', 'VALIDATION_ERROR']);
  const message = String(error?.message || 'The operation failed').replace(/[\r\n\t\0-\x1f\x7f]+/g, ' ').slice(0, 500);
  return { ok: false, error: message || 'The operation failed', code: allowedCodes.has(error?.code) ? error.code : 'OPERATION_FAILED' };
}

function payloadSize(payload) {
  try { return Buffer.byteLength(JSON.stringify(payload || {}), 'utf8'); } catch { return MAX_IPC_BYTES + 1; }
}

function registerIpc({ ipcMain, dialog, shell, app, appService, services, getWindow, afterSettingsUpdate = null, resolveProtectionRequest = null }) {
  const registered = new Set();
  const trustedSender = (event) => {
    const current = getWindow();
    if (!current || current.isDestroyed() || event.sender.id !== current.webContents.id) return false;
    if (!event.senderFrame || event.senderFrame !== current.webContents.mainFrame) return false;
    const url = String(event.senderFrame.url || '');
    return Boolean(url) && url === current.webContents.getURL();
  };

  const handle = (channel, fn, guarded = true) => {
    ipcMain.removeHandler(channel);
    registered.add(channel);
    ipcMain.handle(channel, async (event, rawPayload) => {
      try {
        if (!trustedSender(event)) throw new Error('Untrusted renderer request');
        if (payloadSize(rawPayload) > MAX_IPC_BYTES) throw new Error('Request payload is too large');
        if (guarded) services.authService.assertUnlocked();
        const payload = stripDangerousKeys(rawPayload || {});
        return await fn(payload, event);
      } catch (error) {
        services.logger.error(`IPC ${channel} failed`, { code: error.code || 'ERROR', message: error.message });
        return safeError(error);
      }
    });
  };

  const grantChosen = (target, options = {}) => target ? services.pathGrantService.grant(target, options) : null;
  const assertPath = (target, options = {}) => services.pathGrantService.assertAllowed(target, options);
  const assertRestorePath = (target, { mustExist = false } = {}) => {
    const absolute = assertPath(target, { mustExist, write: true });
    if (isWithin(services.paths.baseDir, absolute) || isWithin(services.paths.vaultDir, absolute)) {
      throw new Error('User files cannot be restored inside RewindOS application data');
    }
    return absolute;
  };
  const authorizeUndoEvent = async (eventId, options = {}) => {
    const preview = services.undoService.preview(eventId, options);
    for (const step of preview.steps || []) {
      if (step.type === 'move-to-protected-trash') assertRestorePath(step.path, { mustExist: true });
      else if (step.type === 'create-directory') assertRestorePath(step.path);
      else if (step.type === 'restore-version') assertRestorePath(step.targetPath);
      else if (step.type === 'move') { assertRestorePath(step.from, { mustExist: true }); assertRestorePath(step.to); }
      else if (step.type === 'restore-trash') {
        const item = await services.vaultService.previewTrash(step.itemId);
        if (item?.item?.originalPath) assertRestorePath(item.item.originalPath);
      }
    }
    return preview;
  };
  const authorizeCheckpointRestore = async (checkpointId, options = {}) => {
    const preview = await services.checkpointService.previewRestore(checkpointId, options);
    for (const result of preview.previews || []) {
      const target = result?.preview?.targetPath;
      if (target) assertRestorePath(target);
    }
    for (const root of preview.checkpoint?.roots || []) {
      const destination = options.destinationRoot ? path.join(options.destinationRoot, path.basename(root.root)) : root.root;
      assertRestorePath(destination);
    }
    return preview;
  };
  const configuredOrGranted = (target, configured = [], options = {}) => {
    const absolute = path.resolve(String(target || ''));
    if ((configured || []).some((item) => path.resolve(String(item || '')) === absolute)) return absolute;
    return assertPath(absolute, options);
  };
  const validateSettingsPaths = (clean, before) => {
    if (clean.monitoring?.watchedFolders) clean.monitoring.watchedFolders = clean.monitoring.watchedFolders.map((item) => configuredOrGranted(item, before.monitoring.watchedFolders, { mustExist: true }));
    if (clean.monitoring?.excludedFolders) clean.monitoring.excludedFolders = clean.monitoring.excludedFolders.map((item) => configuredOrGranted(item, before.monitoring.excludedFolders, { mustExist: true }));
    if (clean.privacy?.sensitiveFolders) clean.privacy.sensitiveFolders = clean.privacy.sensitiveFolders.map((item) => configuredOrGranted(item, before.privacy.sensitiveFolders, { mustExist: true }));
    if (clean.storage?.mirrorPath) clean.storage.mirrorPath = configuredOrGranted(clean.storage.mirrorPath, before.storage.mirrorPath ? [before.storage.mirrorPath] : [], { mustExist: true, write: true });
    if (Array.isArray(clean.customTrashRules)) {
      const existing = (before.customTrashRules || []).map((rule) => rule.folder).filter(Boolean);
      clean.customTrashRules = clean.customTrashRules.map((rule) => ({ ...rule, folder: rule.folder ? configuredOrGranted(rule.folder, existing, { mustExist: true }) : '' }));
    }
    return clean;
  };

  const applyUndoRuntime = async (result) => {
    const items = result?.results || [];
    const settingsUndo = result?.preview?.event?.action === 'settings-changed' || items.some((item) => item?.preview?.event?.action === 'settings-changed');
    if (settingsUndo) {
      await services.watcherService.restart(); services.clipboardService.start();
      if (afterSettingsUpdate) await afterSettingsUpdate({}, services.settingsStore.get());
    }
    return result;
  };

  handle('app:get-state', async () => ({ ok: true, data: appService.getState() }), false);
  handle('auth:status', async () => ({ ok: true, data: services.authService.status() }), false);
  handle('auth:activity', async () => ({ ok: true, data: services.authService.touch() }), false);
  handle('auth:verify', async ({ pin }) => ({ ok: true, data: { valid: services.authService.verify(safeString(pin, { maxLength: 128 })), status: services.authService.status() } }), false);
  handle('auth:set-pin', async ({ pin }) => ({ ok: true, data: services.authService.setPin(safeString(pin, { maxLength: 128 })) }));
  handle('auth:clear-pin', async ({ pin }) => ({ ok: true, data: services.authService.clearPin(safeString(pin, { maxLength: 128 })) }));
  handle('auth:lock', async () => { if (services.settingsStore.get().privacy.clearClipboardOnLock) services.clipboardService.clear(); return { ok: true, data: services.authService.lock() }; });
  handle('app:open-data-folder', async () => ({ ok: true, data: await shell.openPath(services.paths.baseDir) }));
  handle('app:open-path', async ({ target }) => ({ ok: true, data: await shell.openPath(assertPath(target, { mustExist: true })) }));

  handle('settings:get', async () => ({ ok: true, data: services.settingsStore.getPublic() }));
  handle('settings:update', async ({ patch }) => {
    const clean = stripDangerousKeys(patch || {});
    if (clean.privacy) { delete clean.privacy.pinSalt; delete clean.privacy.pinHash; delete clean.privacy.appPinEnabled; clean.privacy.localOnly = true; }
    if (clean.storage) delete clean.storage.vaultPath;
    const before = services.settingsStore.get(); const beforePublic = services.settingsStore.getPublic();
    validateSettingsPaths(clean, before);
    const value = services.settingsStore.update(clean);
    const valuePublic = services.settingsStore.getPublic();
    if (JSON.stringify(before.monitoring) !== JSON.stringify(value.monitoring) || before.privacy.privateMode !== value.privacy.privateMode || JSON.stringify(before.privacy.sensitiveFolders) !== JSON.stringify(value.privacy.sensitiveFolders)) await services.watcherService.restart();
    if (before.general.launchAtStartup !== value.general.launchAtStartup) services.autoStartService.apply(value.general.launchAtStartup);
    if (JSON.stringify(before.performance) !== JSON.stringify(value.performance)) await services.performanceService.evaluate();
    services.clipboardService.start();
    if (value.undoRules.settings && JSON.stringify(beforePublic) !== JSON.stringify(valuePublic)) services.auditStore.add({ action: 'settings-changed', path: 'RewindOS settings', previousSettings: beforePublic, nextSettings: valuePublic, restorable: true, source: 'application' });
    if (afterSettingsUpdate) await afterSettingsUpdate(before, value);
    return { ok: true, data: valuePublic };
  });
  handle('settings:reset', async () => {
    const before = services.settingsStore.get(); const value = services.settingsStore.reset({ preserveLanguage: true });
    await services.watcherService.restart(); services.clipboardService.start();
    if (afterSettingsUpdate) await afterSettingsUpdate(before, value);
    return { ok: true, data: services.settingsStore.getPublic() };
  });
  handle('settings:complete-first-run', async ({ language, setup = {} }) => {
    const cleanSetup = stripDangerousKeys(setup || {});
    const watchedFolders = (cleanSetup.watchedFolders || []).map((folder) => assertPath(folder, { mustExist: true }));
    const excludedFolders = (cleanSetup.excludedFolders || []).map((folder) => assertPath(folder, { mustExist: true }));
    let vaultPath = services.paths.vaultDir;
    if (cleanSetup.vaultPath) {
      vaultPath = assertPath(cleanSetup.vaultPath, { mustExist: true, write: true });
      if (path.resolve(vaultPath) !== path.resolve(services.paths.vaultDir)) services.paths.configureVault(vaultPath);
    }
    const patch = {
      language: language === 'en' ? 'en' : 'de', firstRunComplete: true,
      storage: { maxVaultBytes: Number(cleanSetup.maxVaultBytes || services.settingsStore.get().storage.maxVaultBytes), vaultPath },
      monitoring: { enabled: cleanSetup.monitoringEnabled !== false, watchedFolders, excludedFolders: [...services.settingsStore.get().monitoring.excludedFolders, ...excludedFolders] },
      privacy: { localOnly: true, privateMode: Boolean(cleanSetup.privateMode) },
      general: { launchAtStartup: Boolean(cleanSetup.launchAtStartup) }
    };
    const value = services.settingsStore.update(patch);
    const firstRunPin = safeString(cleanSetup.pin || '', { maxLength: 128 });
    if (firstRunPin) services.authService.setPin(firstRunPin);
    services.autoStartService.apply(value.general.launchAtStartup);
    await services.watcherService.restart();
    if (afterSettingsUpdate) await afterSettingsUpdate({}, value);
    return { ok: true, data: services.settingsStore.getPublic() };
  }, false);

  handle('dialog:choose-folder', async ({ title, writable = true }) => {
    const result = await dialog.showOpenDialog(getWindow(), { title: safeString(title || 'Choose folder', { maxLength: 200 }), properties: ['openDirectory', 'createDirectory'] });
    const selected = result.canceled ? null : result.filePaths[0];
    return { ok: true, data: grantChosen(selected, { directory: true, writable: Boolean(writable), ttlMs: 60 * 60 * 1000 }) };
  });
  handle('dialog:choose-save', async ({ title, defaultPath, filters }) => {
    const result = await dialog.showSaveDialog(getWindow(), { title: safeString(title || 'Save', { maxLength: 200 }), defaultPath: defaultPath ? path.basename(safeString(defaultPath, { maxLength: 240 })) : undefined, filters: Array.isArray(filters) ? filters.slice(0, 20) : undefined });
    const selected = result.canceled ? null : result.filePath;
    return { ok: true, data: grantChosen(selected, { writable: true, ttlMs: 60 * 60 * 1000 }) };
  });
  handle('dialog:choose-file', async ({ title, filters }) => {
    const result = await dialog.showOpenDialog(getWindow(), { title: safeString(title || 'Choose file', { maxLength: 200 }), filters: Array.isArray(filters) ? filters.slice(0, 20) : undefined, properties: ['openFile'] });
    const selected = result.canceled ? null : result.filePaths[0];
    return { ok: true, data: grantChosen(selected, { writable: false, ttlMs: 60 * 60 * 1000 }) };
  });

  handle('watch:add-folder', async ({ folder }) => { const value = services.settingsStore.addWatchedFolder(assertPath(folder, { mustExist: true })); await services.watcherService.restart(); return { ok: true, data: value }; });
  handle('watch:resolve-protect-request', async ({ token, accept }) => {
    if (typeof resolveProtectionRequest !== 'function') throw new Error('Folder-protection requests are unavailable');
    const folder = await resolveProtectionRequest(safeString(token, { maxLength: 200 }), Boolean(accept));
    if (!folder) return { ok: true, data: { accepted: false } };
    const value = services.settingsStore.addWatchedFolder(folder);
    await services.watcherService.restart();
    return { ok: true, data: { accepted: true, folder, watchedFolders: value } };
  });
  handle('watch:remove-folder', async ({ folder }) => { const value = services.settingsStore.removeWatchedFolder(assertPath(folder, { mustExist: false })); await services.watcherService.restart(); return { ok: true, data: value }; });
  handle('watch:pause', async () => ({ ok: true, data: await services.watcherService.pause() }));
  handle('watch:resume', async () => ({ ok: true, data: await services.watcherService.resume() }));
  handle('watch:status', async () => ({ ok: true, data: services.watcherService.status() }));
  handle('watch:emergency', async ({ paths = null } = {}) => ({ ok: true, data: await services.watcherService.emergencySnapshot({ paths: paths?.map((item) => assertPath(item, { mustExist: true })) || null }) }));
  handle('security:alerts', async () => ({ ok: true, data: services.watcherService.listAlerts() }));
  handle('security:respond', async ({ alertId, action }) => ({ ok: true, data: await services.watcherService.respondToAlert(safeString(alertId, { maxLength: 200 }), safeString(action, { maxLength: 80 })) }));

  handle('timeline:list', async (filters) => ({ ok: true, data: services.auditStore.list(filters) }));
  handle('timeline:group', async ({ groupId }) => ({ ok: true, data: services.auditStore.group(groupId) }));
  handle('timeline:favorite', async ({ eventId, favorite }) => ({ ok: true, data: services.auditStore.setFavorite(eventId, favorite) }));
  handle('undo:preview', async ({ eventId, options }) => ({ ok: true, data: services.undoService.preview(eventId, options) }));
  handle('undo:execute', async ({ eventId, options }) => { await authorizeUndoEvent(eventId, options); return { ok: true, data: await applyUndoRuntime(await services.undoService.execute(eventId, options)) }; });
  handle('undo:selection', async ({ eventIds, options }) => { for (const eventId of [...new Set(eventIds || [])].slice(0, 10000)) await authorizeUndoEvent(eventId, options); return { ok: true, data: await applyUndoRuntime(await services.undoService.executeSelection(eventIds, options)) }; });
  handle('undo:group', async ({ groupId, options }) => { for (const event of services.auditStore.group(groupId).filter((item) => item.restorable && !item.restored)) await authorizeUndoEvent(event.id, options); return { ok: true, data: await applyUndoRuntime(await services.undoService.executeGroup(groupId, options)) }; });
  handle('undo:last', async ({ options }) => { const event = services.auditStore.list({ restorable: true, limit: 100 }).find((item) => !item.restored); if (event) await authorizeUndoEvent(event.id, options); return { ok: true, data: await applyUndoRuntime(await services.undoService.undoLast(options || { dryRun: false, conflictRule: 'rename' })) }; });

  handle('vault:list', async ({ filePath }) => ({ ok: true, data: services.vaultService.listVersions(filePath ? assertPath(filePath, { mustExist: false }) : '') }));
  handle('vault:trash', async () => ({ ok: true, data: services.vaultService.listTrash() }));
  handle('vault:preview', async ({ versionId }) => ({ ok: true, data: await services.vaultService.previewVersion(versionId) }));
  handle('vault:test-restore', async ({ versionId }) => ({ ok: true, data: await services.vaultService.testRestoreVersion(versionId) }));
  handle('vault:trash-preview', async ({ itemId }) => ({ ok: true, data: await services.vaultService.previewTrash(itemId) }));
  handle('vault:restore', async ({ versionId, targetPath, conflictRule, dryRun }) => { const version = services.vaultService.findVersion(versionId); if (!version) throw new Error('Version not found'); const destination = assertRestorePath(targetPath || version.path); return { ok: true, data: await services.vaultService.restoreVersion(versionId, destination, conflictRule, dryRun) }; });
  handle('vault:restore-trash', async ({ itemId, conflictRule }) => { const preview = await services.vaultService.previewTrash(itemId); if (!preview?.item?.originalPath) throw new Error('Protected trash item not found'); assertRestorePath(preview.item.originalPath); return { ok: true, data: await services.vaultService.restoreTrash(itemId, conflictRule) }; });
  handle('vault:favorite', async ({ versionId, favorite }) => ({ ok: true, data: services.vaultService.setFavorite(versionId, favorite) }));
  handle('vault:trash-favorite', async ({ itemId, favorite }) => ({ ok: true, data: services.vaultService.setTrashFavorite(itemId, favorite) }));
  handle('vault:permanent-delete', async ({ target }) => ({ ok: true, data: await services.vaultService.permanentDelete(target) }));
  handle('vault:compare', async ({ versionAId, versionBId }) => ({ ok: true, data: await services.versionComparisonService.compare(versionAId, versionBId) }));

  handle('checkpoints:list', async () => ({ ok: true, data: services.checkpointService.list() }));
  handle('checkpoints:create', async (payload) => { if (payload.paths) payload.paths = payload.paths.map((item) => assertPath(item, { mustExist: true })); return { ok: true, data: await services.checkpointService.create(payload) }; });
  handle('checkpoints:preview', async ({ checkpointId, options }) => ({ ok: true, data: await services.checkpointService.previewRestore(checkpointId, options) }));
  handle('checkpoints:restore', async ({ checkpointId, options = {} }) => { if (options.destinationRoot) options.destinationRoot = assertRestorePath(options.destinationRoot); await authorizeCheckpointRestore(checkpointId, options); return { ok: true, data: await services.checkpointService.restore(checkpointId, options) }; });
  handle('checkpoints:favorite', async ({ checkpointId, favorite }) => ({ ok: true, data: services.checkpointService.setFavorite(checkpointId, favorite) }));
  handle('checkpoints:remove', async ({ checkpointId }) => ({ ok: true, data: services.checkpointService.remove(checkpointId) }));

  handle('clipboard:list', async ({ query }) => ({ ok: true, data: services.clipboardService.list(query) }));
  handle('clipboard:preview', async ({ itemId }) => ({ ok: true, data: services.clipboardService.preview(itemId) }));
  handle('clipboard:copy', async ({ itemId }) => ({ ok: true, data: services.clipboardService.copy(itemId) }));
  handle('clipboard:favorite', async ({ itemId, favorite }) => ({ ok: true, data: services.clipboardService.favorite(itemId, favorite) }));
  handle('clipboard:pin', async ({ itemId, pinned }) => ({ ok: true, data: services.clipboardService.pin(itemId, pinned) }));
  handle('clipboard:protect', async ({ itemId, protectedValue }) => ({ ok: true, data: services.clipboardService.protect(itemId, protectedValue) }));
  handle('clipboard:remove', async ({ itemId }) => ({ ok: true, data: services.clipboardService.remove(itemId) }));
  handle('clipboard:clear', async ({ includeProtected = false } = {}) => ({ ok: true, data: services.clipboardService.clear({ includeProtected }) }));

  handle('workspaces:list', async () => ({ ok: true, data: services.workspaceService.list() }));
  handle('workspaces:screenshot', async ({ workspaceId, index = 0 }) => ({ ok: true, data: services.workspaceService.screenshotData(workspaceId, index) }));
  handle('workspaces:capture', async (payload) => {
    if (Array.isArray(payload.projectFolders)) payload.projectFolders = payload.projectFolders.slice(0, 100).map((folder) => assertPath(folder, { mustExist: true }));
    return { ok: true, data: await services.workspaceService.capture(payload) };
  });
  handle('workspaces:restore', async ({ workspaceId }) => ({ ok: true, data: await services.workspaceService.restore(workspaceId) }));
  handle('workspaces:remove', async ({ workspaceId }) => ({ ok: true, data: services.workspaceService.remove(workspaceId) }));

  handle('profiles:list', async () => ({ ok: true, data: appService.listProfiles() }));
  handle('profiles:save', async (profile) => ({ ok: true, data: appService.saveProfile(profile) }));
  handle('profiles:remove', async ({ profileId }) => ({ ok: true, data: appService.removeProfile(profileId) }));
  handle('projects:list', async () => ({ ok: true, data: appService.listProjectSpaces() }));
  handle('projects:save', async (space) => { if (space.folders) space.folders = space.folders.map((item) => assertPath(item, { mustExist: true })); return { ok: true, data: appService.saveProjectSpace(space) }; });
  handle('projects:remove', async ({ spaceId }) => ({ ok: true, data: appService.removeProjectSpace(spaceId) }));

  handle('search:query', async ({ query, options }) => ({ ok: true, data: services.searchService.query(query, options) }));
  handle('integrity:scan', async ({ full }) => ({ ok: true, data: await services.integrityService.scan({ full }) }));
  handle('integrity:repair', async (options) => ({ ok: true, data: await services.integrityService.repair(options) }));
  handle('storage:migrate-vault', async ({ destination }) => ({ ok: true, data: await appService.migrateVault(assertPath(destination, { mustExist: true, write: true })) }));
  handle('retention:forecast', async () => ({ ok: true, data: services.retentionService.forecast() }));
  handle('retention:cleanup', async () => ({ ok: true, data: services.retentionService.cleanup() }));
  handle('mirror:run', async ({ passphrase, remember = false }) => ({ ok: true, data: services.performanceService.canRunHeavyTask() ? await services.backupMirrorService.mirror(passphrase, { remember: Boolean(remember), reason: 'manual' }) : { skipped: true, reason: 'ac-power-required' } }));
  handle('mirror:status', async () => ({ ok: true, data: services.backupMirrorService.status() }));
  handle('mirror:clear-credential', async () => ({ ok: true, data: services.backupMirrorService.clearCredential() }));
  handle('diagnostics:get', async () => ({ ok: true, data: services.diagnosticsService.get() }));
  handle('diagnostics:export', async ({ destination }) => ({ ok: true, data: services.diagnosticsService.export(assertPath(destination, { write: true })) }));
  handle('statistics:get', async () => ({ ok: true, data: appService.statistics() }));
  handle('rescue:candidates', async () => ({ ok: true, data: appService.crashRecovery || null }));
  handle('rescue:analyze', async ({ eventId }) => ({ ok: true, data: services.rescueService.analyzeCandidate(eventId) }));
  handle('updates:check', async () => ({ ok: true, data: await services.updateService.check() }));
  handle('integration:status', async () => ({ ok: true, data: await services.fileManagerIntegrationService.status() }));
  handle('integration:install', async () => ({ ok: true, data: await services.fileManagerIntegrationService.install() }));
  handle('integration:uninstall', async () => ({ ok: true, data: await services.fileManagerIntegrationService.uninstall() }));

  handle('export:settings', async ({ destination }) => ({ ok: true, data: services.exportService.exportSettings(assertPath(destination, { write: true })) }));
  handle('export:timeline', async ({ destination, format }) => ({ ok: true, data: services.exportService.exportTimeline(assertPath(destination, { write: true }), format) }));
  handle('export:archive', async ({ destinationFolder }) => ({ ok: true, data: await services.exportService.createPortableArchive(assertPath(destinationFolder, { mustExist: true, write: true })) }));
  handle('export:offline-rescue', async ({ destinationFolder, passphrase }) => ({ ok: true, data: await services.exportService.createRecoveryBundle(assertPath(destinationFolder, { mustExist: true, write: true }), passphrase, { type: 'password-protected-recovery-bundle' }) }));
  handle('export:recovery-bundle', async ({ destinationFolder, passphrase }) => ({ ok: true, data: await services.exportService.createRecoveryBundle(assertPath(destinationFolder, { mustExist: true, write: true }), passphrase) }));
  handle('import:recovery-bundle', async ({ sourceFolder, passphrase }) => {
    await services.watcherService.stop(); services.clipboardService.stop();
    const result = await services.exportService.restoreRecoveryBundle(assertPath(sourceFolder, { mustExist: true }), passphrase);
    app.relaunch(); app.exit(0); return { ok: true, data: result };
  });
  handle('import:settings', async ({ source }) => { const value = services.exportService.importSettings(assertPath(source, { mustExist: true })); await services.watcherService.restart(); return { ok: true, data: value }; });

  return () => { for (const channel of registered) ipcMain.removeHandler(channel); };
}

module.exports = { registerIpc };
