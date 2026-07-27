const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, payload = {}) => ipcRenderer.invoke(channel, payload);
const listeners = new Map();

contextBridge.exposeInMainWorld('rewindOS', Object.freeze({
  auth: Object.freeze({
    status: () => invoke('auth:status'), activity: () => invoke('auth:activity'), verify: (pin) => invoke('auth:verify', { pin }),
    setPin: (pin) => invoke('auth:set-pin', { pin }), clearPin: (pin) => invoke('auth:clear-pin', { pin }), lock: () => invoke('auth:lock')
  }),
  app: Object.freeze({ getState: () => invoke('app:get-state'), openDataFolder: () => invoke('app:open-data-folder'), openPath: (target) => invoke('app:open-path', { target }) }),
  settings: Object.freeze({
    get: () => invoke('settings:get'), update: (patch) => invoke('settings:update', { patch }), reset: () => invoke('settings:reset'),
    completeFirstRun: (language, setup = {}) => invoke('settings:complete-first-run', { language, setup })
  }),
  dialog: Object.freeze({
    chooseFolder: (title, writable = true) => invoke('dialog:choose-folder', { title, writable }),
    chooseSave: (payload) => invoke('dialog:choose-save', payload), chooseFile: (payload) => invoke('dialog:choose-file', payload)
  }),
  watch: Object.freeze({
    addFolder: (folder) => invoke('watch:add-folder', { folder }), removeFolder: (folder) => invoke('watch:remove-folder', { folder }),
    resolveProtectRequest: (token, accept) => invoke('watch:resolve-protect-request', { token, accept }),
    pause: () => invoke('watch:pause'), resume: () => invoke('watch:resume'), status: () => invoke('watch:status'), emergency: (paths = null) => invoke('watch:emergency', { paths })
  }),
  security: Object.freeze({ alerts: () => invoke('security:alerts'), respond: (alertId, action) => invoke('security:respond', { alertId, action }) }),
  timeline: Object.freeze({
    list: (filters) => invoke('timeline:list', filters), group: (groupId) => invoke('timeline:group', { groupId }),
    favorite: (eventId, favorite) => invoke('timeline:favorite', { eventId, favorite })
  }),
  undo: Object.freeze({
    preview: (eventId, options) => invoke('undo:preview', { eventId, options }), execute: (eventId, options) => invoke('undo:execute', { eventId, options }),
    selection: (eventIds, options) => invoke('undo:selection', { eventIds, options }), group: (groupId, options) => invoke('undo:group', { groupId, options }),
    last: (options) => invoke('undo:last', { options })
  }),
  vault: Object.freeze({
    list: (filePath) => invoke('vault:list', { filePath }), trash: () => invoke('vault:trash'), preview: (versionId) => invoke('vault:preview', { versionId }),
    testRestore: (versionId) => invoke('vault:test-restore', { versionId }),
    trashPreview: (itemId) => invoke('vault:trash-preview', { itemId }), restore: (payload) => invoke('vault:restore', payload),
    restoreTrash: (itemId, conflictRule = 'rename') => invoke('vault:restore-trash', { itemId, conflictRule }),
    favorite: (versionId, favorite) => invoke('vault:favorite', { versionId, favorite }),
    trashFavorite: (itemId, favorite) => invoke('vault:trash-favorite', { itemId, favorite }),
    permanentDelete: (target) => invoke('vault:permanent-delete', { target }), compare: (versionAId, versionBId) => invoke('vault:compare', { versionAId, versionBId })
  }),
  checkpoints: Object.freeze({
    list: () => invoke('checkpoints:list'), create: (payload) => invoke('checkpoints:create', payload),
    preview: (checkpointId, options = {}) => invoke('checkpoints:preview', { checkpointId, options }),
    restore: (checkpointId, options) => invoke('checkpoints:restore', { checkpointId, options }),
    favorite: (checkpointId, favorite) => invoke('checkpoints:favorite', { checkpointId, favorite }), remove: (checkpointId) => invoke('checkpoints:remove', { checkpointId })
  }),
  clipboard: Object.freeze({
    list: (query) => invoke('clipboard:list', { query }), preview: (itemId) => invoke('clipboard:preview', { itemId }), copy: (itemId) => invoke('clipboard:copy', { itemId }),
    favorite: (itemId, favorite) => invoke('clipboard:favorite', { itemId, favorite }), pin: (itemId, pinned) => invoke('clipboard:pin', { itemId, pinned }),
    protect: (itemId, protectedValue) => invoke('clipboard:protect', { itemId, protectedValue }), remove: (itemId) => invoke('clipboard:remove', { itemId }),
    clear: (includeProtected = false) => invoke('clipboard:clear', { includeProtected })
  }),
  workspaces: Object.freeze({
    list: () => invoke('workspaces:list'), screenshot: (workspaceId, index = 0) => invoke('workspaces:screenshot', { workspaceId, index }),
    capture: (payload) => invoke('workspaces:capture', payload), restore: (workspaceId) => invoke('workspaces:restore', { workspaceId }), remove: (workspaceId) => invoke('workspaces:remove', { workspaceId })
  }),
  profiles: Object.freeze({ list: () => invoke('profiles:list'), save: (profile) => invoke('profiles:save', profile), remove: (profileId) => invoke('profiles:remove', { profileId }) }),
  projects: Object.freeze({ list: () => invoke('projects:list'), save: (space) => invoke('projects:save', space), remove: (spaceId) => invoke('projects:remove', { spaceId }) }),
  search: (query, options) => invoke('search:query', { query, options }),
  integrity: Object.freeze({ scan: (full = false) => invoke('integrity:scan', { full }), repair: (options = {}) => invoke('integrity:repair', options) }),
  storage: Object.freeze({ migrateVault: (destination) => invoke('storage:migrate-vault', { destination }) }),
  retention: Object.freeze({ forecast: () => invoke('retention:forecast'), cleanup: () => invoke('retention:cleanup') }),
  mirror: Object.freeze({ run: (passphrase, remember = false) => invoke('mirror:run', { passphrase, remember }), status: () => invoke('mirror:status'), clearCredential: () => invoke('mirror:clear-credential') }),
  diagnostics: Object.freeze({ get: () => invoke('diagnostics:get'), export: (destination) => invoke('diagnostics:export', { destination }) }),
  statistics: () => invoke('statistics:get'),
  rescue: Object.freeze({ candidates: () => invoke('rescue:candidates'), analyze: (eventId) => invoke('rescue:analyze', { eventId }) }),
  updates: Object.freeze({ check: () => invoke('updates:check') }),
  integration: Object.freeze({ status: () => invoke('integration:status'), install: () => invoke('integration:install'), uninstall: () => invoke('integration:uninstall') }),
  export: Object.freeze({
    settings: (destination) => invoke('export:settings', { destination }), timeline: (destination, format) => invoke('export:timeline', { destination, format }),
    archive: (destinationFolder) => invoke('export:archive', { destinationFolder }), offlineRescue: (destinationFolder, passphrase) => invoke('export:offline-rescue', { destinationFolder, passphrase }),
    recoveryBundle: (destinationFolder, passphrase) => invoke('export:recovery-bundle', { destinationFolder, passphrase })
  }),
  import: Object.freeze({ settings: (source) => invoke('import:settings', { source }), recoveryBundle: (sourceFolder, passphrase) => invoke('import:recovery-bundle', { sourceFolder, passphrase }) }),
  events: Object.freeze({
    on: (channel, callback) => {
      const allowed = ['watcher:event', 'watcher:status', 'watcher:suspicious', 'app:navigate', 'update:available', 'auth:locked', 'app:protect-request'];
      if (!allowed.includes(channel) || typeof callback !== 'function') return () => {};
      const wrapped = (_event, payload) => callback(payload); ipcRenderer.on(channel, wrapped); listeners.set(callback, { channel, wrapped });
      return () => { ipcRenderer.removeListener(channel, wrapped); listeners.delete(callback); };
    },
    off: (callback) => { const item = listeners.get(callback); if (item) ipcRenderer.removeListener(item.channel, item.wrapped); listeners.delete(callback); }
  })
}));
