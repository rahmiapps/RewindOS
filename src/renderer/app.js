(() => {
  'use strict';

  const api = window.rewindOS;
  const content = document.getElementById('content');
  const navigation = document.getElementById('navigation');
  const modalRoot = document.getElementById('modalRoot');
  const toastRoot = document.getElementById('toastRoot');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const tagline = document.getElementById('tagline');
  const protectionButton = document.getElementById('protectionButton');
  const protectionLabel = document.getElementById('protectionLabel');

  const T = {
    de: {
      tagline: 'Dein Computer kann zurückspulen.', dashboard: 'Übersicht', timeline: 'Aktivitäts-Timeline', checkpoints: 'Zeitpunkte',
      vault: 'Sichere Löschablage', versions: 'Dateiversionen', clipboard: 'Zwischenablage', workspaces: 'Arbeitsbereiche',
      projects: 'Schutzräume', profiles: 'Schutzprofile', search: 'Intelligente Suche', statistics: 'Statistiken',
      diagnostics: 'Diagnosezentrum', security: 'Sicherheitszentrum', importExport: 'Import & Export', settings: 'Einstellungen', protectionActive: 'Schutz aktiv', protectionPaused: 'Schutz pausiert',
      localProtection: 'Lokaler Schutz und sichere Wiederherstellung', todayChanges: 'Änderungen heute', protectedFiles: 'Geschützte Dateien',
      restorable: 'Rückgängig-Aktionen', storageUsed: 'Verwendeter Speicher', lastUndo: 'Letzte Aktion rückgängig', checkpoint: 'Zeitpunkt erstellen',
      protectFolder: 'Ordner schützen', emergency: 'Notfall-Sicherung', recentActivity: 'Letzte Aktivitäten', safetyStatus: 'Sicherheitsstatus',
      allReady: 'Alle lokalen Kerndienste sind bereit.', limitation: 'RewindOS ist eine zusätzliche Schutzschicht und ersetzt kein vollständiges Backup.',
      noData: 'Noch keine Daten vorhanden.', action: 'Aktion', path: 'Pfad', date: 'Datum', size: 'Größe', status: 'Status', program: 'Programm',
      preview: 'Vorschau', restore: 'Wiederherstellen', cancel: 'Abbrechen', close: 'Schließen', confirm: 'Bestätigen', refresh: 'Aktualisieren',
      searchPlaceholder: 'Zum Beispiel: gestern gelöschte Bilder', searchNow: 'Suchen', created: 'Erstellt', copied: 'Kopiert', modified: 'Geändert', deleted: 'Gelöscht',
      restored: 'Wiederhergestellt', moved: 'Verschoben', skipped: 'Übersprungen', checkpointCreated: 'Zeitpunkt erstellt', suspicious: 'Verdächtige Aktivität',
      dryRun: 'Nur prüfen, nichts verändern', testRestore: 'Zuerst in Testordner wiederherstellen', conflictRule: 'Konfliktregel', replace: 'Ersetzen',
      rename: 'Automatisch umbenennen', keepNewer: 'Neuere behalten', keepOlder: 'Ältere behalten', whatWouldHappen: 'Was würde passieren?',
      undoPreview: 'Rückgängig-Vorschau', selectedFolders: 'Ausgewählte Ordner', remove: 'Entfernen', open: 'Öffnen', create: 'Erstellen',
      note: 'Notiz', name: 'Name', category: 'Kategorie', manual: 'Manuell', versionsCount: 'Versionen', favorite: 'Favorit',
      deletePermanently: 'Endgültig löschen', captureWorkspace: 'Arbeitsbereich speichern', restoreWorkspace: 'Wiederherstellen',
      projectName: 'Projektname', folder: 'Ordner', retention: 'Aufbewahrung', maxVersions: 'Maximale Versionen', profileName: 'Profilname',
      extensions: 'Dateiendungen', priority: 'Priorität', high: 'Hoch', normal: 'Normal', low: 'Niedrig', save: 'Speichern', clear: 'Leeren',
      integrityScan: 'Integritätsprüfung starten', cleanup: 'Bereinigung starten', mirror: 'Spiegelung ausführen', openData: 'Datenordner öffnen',
      exportSettings: 'Einstellungen exportieren', exportTimeline: 'Timeline exportieren', offlineRescue: 'Offline-Rettungsordner erstellen',
      general: 'Allgemein', appearance: 'Darstellung', storage: 'Speicher', monitoring: 'Überwachung', undoRules: 'Rückgängig-Regeln',
      privacy: 'Datenschutz', notifications: 'Benachrichtigungen', hotkeys: 'Tastenkürzel', accessibility: 'Barrierefreiheit', performance: 'Leistung & Akku',
      language: 'Sprache', theme: 'Design', dark: 'Dunkel', light: 'Hell', system: 'System', launchAtStartup: 'Mit System starten',
      startBackground: 'Im Hintergrund starten', closeToTray: 'Beim Schließen im Infobereich weiterlaufen', animations: 'Animationen',
      transparency: 'Transparenz', highContrast: 'Hoher Kontrast', reducedMotion: 'Reduzierte Bewegung', encryption: 'Lokale Verschlüsselung',
      autoCleanup: 'Automatische Bereinigung', maxStorage: 'Maximaler Speicher in GB', retentionDays: 'Aufbewahrung in Tagen',
      maxFileSize: 'Maximale Dateigröße in MB', mirrorBackup: 'Externe Backup-Spiegelung', mirrorPath: 'Spiegelungsordner',
      snapshotExisting: 'Vorhandene Dateien beim Start versionieren', includeHidden: 'Versteckte Dateien einbeziehen', healthChecks: 'Datei-Gesundheitsprüfung',
      adaptive: 'Adaptive Versionierung', massThreshold: 'Warnschwelle für Massenänderungen', undoCreate: 'Erstellen rückgängig machen',
      undoDelete: 'Löschen rückgängig machen', undoModify: 'Änderungen rückgängig machen', undoMass: 'Undo-Ketten und Massenaktionen',
      dryRunDefault: 'Standardmäßig Vorschau verwenden', testRestoreDefault: 'Standardmäßig Test-Wiederherstellung', localOnly: 'Ausschließlich lokal',
      privateMode: 'Inkognito-Modus', hideNames: 'Dateinamen in der Oberfläche verbergen', disablePreviews: 'Dateivorschauen deaktivieren',
      clipboardEnabled: 'Zwischenablage-Verlauf', captureImages: 'Bilder aus Zwischenablage speichern', notificationsEnabled: 'Benachrichtigungen',
      suspiciousNotifications: 'Bei verdächtigen Aktionen warnen', lowStorageNotifications: 'Bei wenig Speicher warnen', quietMode: 'Ruhemodus',
      batteryThreshold: 'Bei Akkustand unter % pausieren', onlyAC: 'Schwere Aufgaben nur am Stromnetz', keyboardNav: 'Vollständige Tastaturbedienung',
      screenReader: 'Screenreader-Beschriftungen', firstRunTitle: 'Willkommen bei RewindOS', firstRunText: 'Wähle zuerst deine Sprache. Du kannst sie später jederzeit ändern.',
      german: 'Deutsch', english: 'English', continue: 'Weiter', success: 'Erfolgreich', error: 'Fehler', warning: 'Warnung',
      storageForecast: 'Speicherprognose', daysRemaining: 'Geschätzte verbleibende Tage', capability: 'Systemfähigkeit', health: 'Gesundheit',
      crashRecovery: 'Absturz-Wiederherstellung', previousCrash: 'Der vorherige RewindOS-Lauf wurde nicht sauber beendet. Prüfe die zuletzt veränderten Dateien.',
      nothingToUndo: 'Keine wiederherstellbare Aktion gefunden.', protectedTrashEmpty: 'Die sichere Löschablage ist leer.', chooseFolder: 'Ordner auswählen',
      exportDone: 'Export wurde erstellt.', monitoringPaused: 'Überwachung wurde pausiert.', monitoringResumed: 'Überwachung läuft wieder.',
      emergencyDone: 'Notfall-Sicherung wurde erstellt.', checkpointDone: 'Zeitpunkt wurde erstellt.', integrityHealthy: 'Integritätsprüfung abgeschlossen.',
      notAvailable: 'Nicht verfügbar', bestEffort: 'Bestmöglich', unknown: 'Unbekannt', groupedUndo: 'Komplette Vorgangsgruppe zurücksetzen'
    },
    en: {
      tagline: 'Your computer can rewind.', dashboard: 'Dashboard', timeline: 'Activity timeline', checkpoints: 'Checkpoints',
      vault: 'Protected trash', versions: 'File versions', clipboard: 'Clipboard', workspaces: 'Workspaces', projects: 'Protection spaces',
      profiles: 'Protection profiles', search: 'Smart search', statistics: 'Statistics', diagnostics: 'Diagnostics', security: 'Security center', importExport: 'Import & Export', settings: 'Settings',
      protectionActive: 'Protection active', protectionPaused: 'Protection paused', localProtection: 'Local protection and safe recovery',
      todayChanges: 'Changes today', protectedFiles: 'Protected files', restorable: 'Undo actions', storageUsed: 'Storage used',
      lastUndo: 'Undo last action', checkpoint: 'Create checkpoint', protectFolder: 'Protect folder', emergency: 'Emergency snapshot',
      recentActivity: 'Recent activity', safetyStatus: 'Safety status', allReady: 'All local core services are ready.',
      limitation: 'RewindOS is an additional protection layer and does not replace a complete backup.', noData: 'No data yet.', action: 'Action',
      path: 'Path', date: 'Date', size: 'Size', status: 'Status', program: 'Program', preview: 'Preview', restore: 'Restore', cancel: 'Cancel',
      close: 'Close', confirm: 'Confirm', refresh: 'Refresh', searchPlaceholder: 'For example: images deleted yesterday', searchNow: 'Search',
      created: 'Created', copied: 'Copied', modified: 'Modified', deleted: 'Deleted', restored: 'Restored', moved: 'Moved', skipped: 'Skipped',
      checkpointCreated: 'Checkpoint created', suspicious: 'Suspicious activity', dryRun: 'Check only, do not change anything',
      testRestore: 'Restore to a test folder first', conflictRule: 'Conflict rule', replace: 'Replace', rename: 'Rename automatically',
      keepNewer: 'Keep newer', keepOlder: 'Keep older', whatWouldHappen: 'What would happen?', undoPreview: 'Undo preview',
      selectedFolders: 'Selected folders', remove: 'Remove', open: 'Open', create: 'Create', note: 'Note', name: 'Name', category: 'Category',
      manual: 'Manual', versionsCount: 'Versions', favorite: 'Favorite', deletePermanently: 'Delete permanently',
      captureWorkspace: 'Capture workspace', restoreWorkspace: 'Restore', projectName: 'Project name', folder: 'Folder', retention: 'Retention',
      maxVersions: 'Maximum versions', profileName: 'Profile name', extensions: 'File extensions', priority: 'Priority', high: 'High', normal: 'Normal',
      low: 'Low', save: 'Save', clear: 'Clear', integrityScan: 'Run integrity scan', cleanup: 'Run cleanup', mirror: 'Run mirror',
      openData: 'Open data folder', exportSettings: 'Export settings', exportTimeline: 'Export timeline', offlineRescue: 'Create offline rescue folder',
      general: 'General', appearance: 'Appearance', storage: 'Storage', monitoring: 'Monitoring', undoRules: 'Undo rules', privacy: 'Privacy',
      notifications: 'Notifications', hotkeys: 'Hotkeys', accessibility: 'Accessibility', performance: 'Performance & battery', language: 'Language',
      theme: 'Theme', dark: 'Dark', light: 'Light', system: 'System', launchAtStartup: 'Launch with system', startBackground: 'Start in background',
      closeToTray: 'Keep running in tray when closed', animations: 'Animations', transparency: 'Transparency', highContrast: 'High contrast',
      reducedMotion: 'Reduced motion', encryption: 'Local encryption', autoCleanup: 'Automatic cleanup', maxStorage: 'Maximum storage in GB',
      retentionDays: 'Retention days', maxFileSize: 'Maximum file size in MB', mirrorBackup: 'External backup mirror', mirrorPath: 'Mirror folder',
      snapshotExisting: 'Version existing files on startup', includeHidden: 'Include hidden files', healthChecks: 'File health checks',
      adaptive: 'Adaptive versioning', massThreshold: 'Mass-change warning threshold', undoCreate: 'Undo file creation', undoDelete: 'Undo deletion',
      undoModify: 'Undo modifications', undoMass: 'Undo chains and mass actions', dryRunDefault: 'Use preview by default',
      testRestoreDefault: 'Use test restore by default', localOnly: 'Local only', privateMode: 'Private mode', hideNames: 'Hide file names in UI',
      disablePreviews: 'Disable file previews', clipboardEnabled: 'Clipboard history', captureImages: 'Capture clipboard images',
      notificationsEnabled: 'Notifications', suspiciousNotifications: 'Warn about suspicious actions', lowStorageNotifications: 'Warn about low storage',
      quietMode: 'Quiet mode', batteryThreshold: 'Pause below battery %', onlyAC: 'Heavy tasks only on AC power', keyboardNav: 'Complete keyboard navigation',
      screenReader: 'Screen reader labels', firstRunTitle: 'Welcome to RewindOS', firstRunText: 'Choose your language first. You can change it later.',
      german: 'Deutsch', english: 'English', continue: 'Continue', success: 'Success', error: 'Error', warning: 'Warning',
      storageForecast: 'Storage forecast', daysRemaining: 'Estimated days remaining', capability: 'System capability', health: 'Health',
      crashRecovery: 'Crash recovery', previousCrash: 'The previous RewindOS run did not close cleanly. Review the most recently changed files.',
      nothingToUndo: 'No restorable action found.', protectedTrashEmpty: 'Protected trash is empty.', chooseFolder: 'Choose folder', exportDone: 'Export created.',
      monitoringPaused: 'Monitoring paused.', monitoringResumed: 'Monitoring resumed.', emergencyDone: 'Emergency snapshot created.',
      checkpointDone: 'Checkpoint created.', integrityHealthy: 'Integrity scan completed.', notAvailable: 'Not available', bestEffort: 'Best effort', unknown: 'Unknown',
      groupedUndo: 'Undo complete operation group'
    }
  };

  const navItems = [
    { section: 'Protection', items: [
      ['dashboard', '⌂'], ['timeline', '↶'], ['checkpoints', '◷'], ['vault', '♜'], ['versions', '▤']
    ]},
    { section: 'Memory', items: [
      ['clipboard', '▣'], ['workspaces', '▦'], ['projects', '⬡'], ['profiles', '◫'], ['search', '⌕']
    ]},
    { section: 'System', items: [
      ['statistics', '▥'], ['security', '⚠'], ['diagnostics', '◇'], ['settings', '⚙']
    ]}
  ];

  const state = {
    app: null,
    currentPage: 'dashboard',
    language: 'de',
    settingsTab: 'general',
    timelineFilter: '',
    mirrorStatus: { hasStoredPassphrase: false },
    fileManagerStatus: { supported: false, installed: false },
    selectedLanguage: 'de',
    setupStep: 0,
    setup: { watchedFolders: [], excludedFolders: [], maxVaultBytes: 20 * 1073741824, vaultPath: '', monitoringEnabled: true, privateMode: false, launchAtStartup: false, pin: '' }
  };

  const t = (key) => T[state.language]?.[key] ?? T.de[key] ?? key;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const escapeAttr = escapeHtml;
  const safeClassToken = (value, fallback = 'unknown') => { const token = String(value ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64); return token || fallback; };
  const safeColor = (value, fallback = '#6d7cff') => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
  const formatDate = (value) => { try { const date = new Date(value); return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(state.language === 'de' ? 'de-DE' : 'en-US', { dateStyle: 'short', timeStyle: 'medium' }).format(date) : '—'; } catch { return '—'; } };
  const formatBytes = (bytes) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']; let value = Number(bytes || 0); let index = 0;
    if (!Number.isFinite(value) || value < 0) value = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
    return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
  };
  const unwrap = (result) => {
    if (!result?.ok) throw new Error(result?.error || 'Unknown error');
    return result.data;
  };

  function toast(message, type = 'success') {
    const element = document.createElement('div');
    element.className = `toast ${type}`;
    element.textContent = message;
    toastRoot.appendChild(element);
    setTimeout(() => element.remove(), 3800);
  }

  let modalKeyHandler = null;
  let modalPreviousFocus = null;

  function openModal({ title, subtitle = '', body = '', wide = false, closeable = true, actions = [], onOpen }) {
    closeModal(false);
    modalPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const titleId = `modal-title-${Date.now()}`;
    modalRoot.innerHTML = `
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1">
        <div class="modal-header">
          <div><h2 id="${titleId}">${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div>
          ${closeable ? `<button class="modal-close" aria-label="${escapeHtml(t('close'))}">×</button>` : ''}
        </div>
        <div class="modal-body">${body}</div>
        ${actions.length ? `<div class="modal-footer">${actions.map((action, index) => `<button class="btn ${safeClassToken(action.style || '', '')}" data-modal-action="${index}">${escapeHtml(action.label)}</button>`).join('')}</div>` : ''}
      </div>`;
    const modal = modalRoot.querySelector('.modal');
    if (closeable) {
      modalRoot.querySelector('.modal-close')?.addEventListener('click', closeModal);
      modalRoot.onmousedown = (event) => { if (event.target === modalRoot) closeModal(); };
    } else modalRoot.onmousedown = null;
    actions.forEach((action, index) => {
      modal.querySelector(`[data-modal-action="${index}"]`)?.addEventListener('click', async () => {
        try { await action.handler?.(modal); } catch (error) { toast(error.message, 'error'); }
      });
    });
    modalKeyHandler = (event) => {
      if (event.key === 'Escape' && closeable) { event.preventDefault(); closeModal(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((item) => item.offsetParent !== null);
      if (!focusable.length) { event.preventDefault(); modal.focus(); return; }
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', modalKeyHandler);
    onOpen?.(modal);
    const initial = modal.querySelector('[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
    (initial || modal).focus();
    return modal;
  }

  function closeModal(restoreFocus = true) {
    if (modalKeyHandler) document.removeEventListener('keydown', modalKeyHandler);
    modalKeyHandler = null;
    modalRoot.onmousedown = null;
    modalRoot.innerHTML = '';
    if (restoreFocus && modalPreviousFocus?.isConnected) modalPreviousFocus.focus();
    modalPreviousFocus = null;
  }

  function setNested(target, dotted, value) {
    const keys = dotted.split('.'); let cursor = target;
    for (let index = 0; index < keys.length - 1; index += 1) cursor = cursor[keys[index]] ||= {};
    cursor[keys.at(-1)] = value;
    return target;
  }

  function applyAppearance(settings) {
    const appearance = settings.appearance || {};
    const theme = appearance.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : appearance.theme;
    document.body.dataset.theme = theme;
    document.body.dataset.highContrast = Boolean(appearance.highContrast || settings.accessibility?.highContrast);
    document.body.dataset.reducedMotion = Boolean(appearance.reducedMotion || settings.accessibility?.reducedMotion);
    document.body.dataset.compact = Boolean(appearance.compact);
    document.body.dataset.transparency = Boolean(appearance.transparency);
    document.body.dataset.timelineDensity = appearance.timelineDensity || 'comfortable';
    document.documentElement.style.setProperty('--accent', appearance.accent || '#6d7cff');
    const accessibilityScale = settings.accessibility?.largeText ? 1.15 : 1;
    const effectiveScale = (appearance.fontScale || 1) * accessibilityScale;
    document.documentElement.style.setProperty('--font-scale', String(effectiveScale));
    document.body.dataset.largeLayout = effectiveScale >= 1.16 ? 'true' : 'false';
  }

  function renderNavigation() {
    navigation.innerHTML = navItems.map((section) => `
      <div class="nav-section">${section.section}</div>
      ${section.items.map(([id, icon]) => `<button class="nav-item ${state.currentPage === id ? 'active' : ''}" data-page="${escapeAttr(id)}"><span class="nav-icon">${icon}</span><span>${t(id)}</span></button>`).join('')}
    `).join('');
    navigation.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.page)));
    tagline.textContent = t('tagline');
  }

  function updateProtection() {
    const paused = state.app?.watcher?.paused || !state.app?.watcher?.running;
    protectionButton.classList.toggle('paused', paused);
    protectionLabel.textContent = paused ? t('protectionPaused') : t('protectionActive');
  }

  async function refreshState() {
    state.app = unwrap(await api.app.getState());
    state.language = state.app.settings.language || 'de';
    applyAppearance(state.app.settings);
    renderNavigation();
    updateProtection();
    return state.app;
  }

  async function navigate(page) {
    state.currentPage = page;
    renderNavigation();
    pageTitle.textContent = t(page);
    pageSubtitle.textContent = page === 'dashboard' ? t('localProtection') : pageSubtitleFor(page);
    content.innerHTML = '<div class="empty">…</div>';
    const renderers = {
      dashboard: renderDashboard, timeline: renderTimeline, checkpoints: renderCheckpoints, vault: renderVault,
      versions: renderVersions, clipboard: renderClipboard, workspaces: renderWorkspaces, projects: renderProjects,
      profiles: renderProfiles, search: renderSearch, statistics: renderStatistics, security: renderSecurity, diagnostics: renderDiagnostics,
      settings: renderSettings
    };
    await renderers[page]?.();
  }

  function pageSubtitleFor(page) {
    const texts = {
      timeline: state.language === 'de' ? 'Alle erkannten Änderungen, Gruppen und Wiederherstellungen' : 'All detected changes, groups and restorations',
      checkpoints: state.language === 'de' ? 'Kommentierte Zeitpunkte und Wiederherstellungs-Sammlungen' : 'Commented checkpoints and recovery collections',
      vault: state.language === 'de' ? 'Geschützte Ablage für rückgängig gemachte Löschungen' : 'Protected storage for reversed deletions',
      versions: state.language === 'de' ? 'Vorherige Dateistände vergleichen und wiederherstellen' : 'Compare and restore previous file states',
      clipboard: state.language === 'de' ? 'Lokaler Verlauf für Texte und Bilder' : 'Local history for text and images',
      workspaces: state.language === 'de' ? 'Programme, Fenster und Desktop-Zustände merken' : 'Remember apps, windows and desktop states',
      projects: state.language === 'de' ? 'Wichtige Projekte mit strengeren Regeln schützen' : 'Protect important projects with stricter rules',
      profiles: state.language === 'de' ? 'Eigene Regeln für Dokumente, Code, Fotos und mehr' : 'Custom rules for documents, code, photos and more',
      search: state.language === 'de' ? 'Natürlich nach Dateien, Aktionen und Zwischenablage suchen' : 'Search files, actions and clipboard naturally',
      statistics: state.language === 'de' ? 'Schutzwirkung, Nutzung und Speicherentwicklung' : 'Protection impact, usage and storage trends',
      security: state.language === 'de' ? 'Verdächtige Vorgänge, Notfallmaßnahmen und Sicherheitsregeln' : 'Suspicious activity, emergency actions and security rules',
      diagnostics: state.language === 'de' ? 'Systemfähigkeiten, Integrität und verständliche Fehlergründe' : 'Capabilities, integrity and clear failure reasons',
      settings: state.language === 'de' ? 'Alle Funktionen, Regeln, Datenschutz- und Leistungsoptionen' : 'All features, rules, privacy and performance options'
    };
    return texts[page] || '';
  }

  function eventLabel(action) {
    const map = { created: t('created'), copied: t('copied'), 'directory-created': t('created'), 'directory-deleted': t('deleted'), modified: t('modified'), deleted: t('deleted'), restored: t('restored'), moved: t('moved'), renamed: t('moved'), skipped: t('skipped'), 'checkpoint-created': t('checkpointCreated'), 'suspicious-activity': t('suspicious'), 'settings-changed': state.language === 'de' ? 'Einstellungen geändert' : 'Settings changed', 'clipboard-captured': state.language === 'de' ? 'Zwischenablage gespeichert' : 'Clipboard captured', 'workspace-captured': state.language === 'de' ? 'Arbeitsbereich gespeichert' : 'Workspace captured' };
    return map[action] || action;
  }

  function eventDisplayName(event) {
    if (event?.action === 'settings-changed') return state.language === 'de' ? 'RewindOS-Einstellungen' : 'RewindOS settings';
    if (event?.action === 'clipboard-captured') {
      const types = { image: state.language === 'de' ? 'Zwischenablagebild' : 'Clipboard image', text: state.language === 'de' ? 'Zwischenablagetext' : 'Clipboard text', link: state.language === 'de' ? 'Zwischenablagelink' : 'Clipboard link', files: state.language === 'de' ? 'Zwischenablagedateien' : 'Clipboard files' };
      return types[event.path] || (state.language === 'de' ? 'Zwischenablageeintrag' : 'Clipboard item');
    }
    const value = String(event?.path || '');
    if (!value) return '—';
    const parts = value.split(/[\/]/).filter(Boolean);
    return parts.at(-1) || value;
  }

  function renderEventRows(events, compact = false) {
    if (!events?.length) return `<div class="empty">${t('noData')}</div>`;
    if (compact) return `<div class="list">${events.map((event) => `
      <div class="list-item">
        <div class="list-item-main"><div class="list-item-title"><span class="action-badge ${safeClassToken(event.action)}">${escapeHtml(eventLabel(event.action))}</span> ${escapeHtml(eventDisplayName(event))}</div><div class="list-item-meta">${formatDate(event.timestamp)} · ${formatBytes(event.size)}${event.program ? ` · ${escapeHtml(event.program)}` : ''}${event.source === 'filesystem' ? ` · <span class="code">${escapeHtml(displayPath(event.path))}</span>` : ''}</div></div>
        <div class="button-row"><button class="btn small ghost" aria-label="${escapeHtml(t('favorite'))}" data-event-favorite="${escapeAttr(event.id)}" data-value="${!event.favorite}">${event.favorite ? '★' : '☆'}</button>${event.restorable && !event.restored ? `<button class="btn small" data-undo-preview="${escapeAttr(event.id)}">${t('preview')}</button>` : ''}</div>
      </div>`).join('')}</div>`;
    return `<div class="table-wrap"><table><thead><tr><th>${t('action')}</th><th>${t('path')}</th><th>${t('date')}</th><th>${t('program')}</th><th>${t('size')}</th><th>${t('status')}</th><th></th></tr></thead><tbody>
      ${events.map((event) => `<tr>
        <td><span class="action-badge ${safeClassToken(event.action)}">${escapeHtml(eventLabel(event.action))}</span></td>
        <td class="path-cell" title="${escapeHtml(event.path || '')}">${escapeHtml(displayPath(event.path))}</td>
        <td>${formatDate(event.timestamp)}</td><td>${escapeHtml(event.program || '—')}</td><td>${formatBytes(event.size)}</td>
        <td>${event.restored ? t('restored') : event.restorable ? t('preview') : '—'}</td>
        <td><div class="button-row"><button class="btn small ghost" aria-label="${escapeHtml(t('favorite'))}" data-event-favorite="${escapeAttr(event.id)}" data-value="${!event.favorite}">${event.favorite ? '★' : '☆'}</button>${event.restorable && !event.restored ? `<button class="btn small primary" data-undo-preview="${escapeAttr(event.id)}">${t('preview')}</button>` : ''}${event.operationGroup ? `<button class="btn small ghost" aria-label="${escapeHtml(t('groupedUndo'))}" data-group-preview="${escapeAttr(event.operationGroup)}">⛓</button>` : ''}</div></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  function displayPath(value) {
    if (!value) return '—';
    return state.app?.settings?.privacy?.hideFileNames ? '•••••• / ••••••' : value;
  }

  function bindEventButtons(root = content) {
    root.querySelectorAll('[data-undo-preview]').forEach((button) => button.addEventListener('click', () => showUndoPreview(button.dataset.undoPreview)));
    root.querySelectorAll('[data-group-preview]').forEach((button) => button.addEventListener('click', () => showGroupPreview(button.dataset.groupPreview)));
    root.querySelectorAll('[data-event-favorite]').forEach((button) => button.addEventListener('click', async () => {
      unwrap(await api.timeline.favorite(button.dataset.eventFavorite, button.dataset.value === 'true'));
      if (state.currentPage === 'timeline') await renderTimeline(); else if (state.currentPage === 'dashboard') await renderDashboard();
    }));
  }

  async function renderDashboard() {
    await refreshState();
    const s = state.app.stats;
    const crash = state.app.crashRecovery?.crashedPreviously;
    const recentRestorations = state.app.recentRestorations || [];
    const recentWarnings = state.app.recentWarnings || [];
    const securityAlerts = state.app.securityAlerts || [];
    const watchedFolders = state.app.settings.monitoring?.watchedFolders || [];
    const recentEvents = state.app.recentEvents || [];
    content.innerHTML = `
      ${crash ? `<div class="card" style="border-color:rgba(255,189,88,.35);margin-bottom:16px"><div class="card-header"><div><h2>⚠ ${t('crashRecovery')}</h2><p class="card-subtitle">${t('previousCrash')}</p></div><button class="btn warning" data-page-jump="timeline">${t('open')}</button></div></div>` : ''}
      ${watchedFolders.length === 0 ? `<div class="card search-guidance" style="margin-bottom:16px"><div class="card-header"><div><h2>${state.language === 'de' ? 'Noch kein Ordner geschützt' : 'No folder is protected yet'}</h2><p class="card-subtitle">${state.language === 'de' ? 'Damit gelöschte Bilder und Dateien wiederhergestellt werden können, muss ihr Ordner vorher geschützt sein.' : 'To restore deleted pictures and files, their folder must be protected before deletion.'}</p></div><button class="btn primary" id="dashboardProtectFirstFolder">＋ ${t('protectFolder')}</button></div></div>` : ''}
      <div class="grid stats">
        ${statCard('↶', t('todayChanges'), s.todayChanges, state.language === 'de' ? 'Seit Mitternacht' : 'Since midnight')}
        ${statCard('▣', t('protectedFiles'), s.protectedFiles, `${s.versions} ${t('versionsCount').toLowerCase()}`)}
        ${statCard('◷', t('restorable'), s.restorable, state.language === 'de' ? 'Sicher verfügbar' : 'Safely available')}
        ${statCard('◫', t('storageUsed'), s.storageFormatted, `${s.storagePercent.toFixed(1)}%`)}
      </div>
      <div class="card section-gap">
        <div class="card-header"><div><h2>${state.language === 'de' ? 'Schnellaktionen' : 'Quick actions'}</h2><p class="card-subtitle">${state.language === 'de' ? 'Wichtige Aktionen ohne Umwege' : 'Important actions without extra steps'}</p></div></div>
        <div class="quick-actions">
          <button class="quick-action" id="quickUndo"><strong>↶ ${t('lastUndo')}</strong><span>${state.language === 'de' ? 'Mit sicherer Vorschau' : 'With safe preview'}</span></button>
          <button class="quick-action" id="quickCheckpoint"><strong>◷ ${t('checkpoint')}</strong><span>${state.language === 'de' ? 'Aktuellen Stand markieren' : 'Mark current state'}</span></button>
          <button class="quick-action" id="quickFolder"><strong>＋ ${t('protectFolder')}</strong><span>${state.language === 'de' ? 'Neuen Ordner überwachen' : 'Watch a new folder'}</span></button>
          <button class="quick-action" id="quickEmergency"><strong>⚡ ${t('emergency')}</strong><span>${state.language === 'de' ? 'Alle aktuellen Versionen sichern' : 'Protect all current versions'}</span></button>
        </div>
      </div>
      <div class="grid two section-gap dashboard-summary-grid">
        <button class="card dashboard-launcher" id="openRecentActivitiesPopup">
          <div class="card-header"><div><h2>${t('recentActivity')}</h2><p class="card-subtitle">${state.language === 'de' ? 'Als Pop-up öffnen, ohne lange zu scrollen' : 'Open as a popup without a long page'}</p></div><span class="btn small">${t('open')}</span></div>
          <div class="launcher-count">${recentEvents.length}</div>
          <div class="launcher-hint">${recentEvents.length ? escapeHtml(displayPath(recentEvents[0].path)) : t('noData')}</div>
        </button>
        <div class="card">
          <div class="card-header"><div><h2>${t('safetyStatus')}</h2><p class="card-subtitle">${state.app.platform.os} · ${state.app.platform.arch}</p></div></div>
          <div class="status-row"><span><i class="status-dot ${state.app.watcher.running ? '' : 'warn'}"></i>${t('protectionActive')}</span><strong>${state.app.watcher.running ? 'OK' : t('protectionPaused')}</strong></div>
          <div class="status-row"><span><i class="status-dot"></i>${t('encryption')}</span><strong>${state.app.settings.storage.encryptionEnabled ? 'AES-256-GCM' : 'OFF'}</strong></div>
          <div class="status-row"><span><i class="status-dot ${state.app.capabilities.windowPositionRestore === false ? 'warn' : ''}"></i>${t('capability')}</span><strong>${state.app.capabilities.windowPositionRestore === false ? t('bestEffort') : 'OK'}</strong></div>
          <div class="status-row"><span>${t('storageForecast')}</span><strong>${s.forecast.estimatedDaysRemaining == null ? '∞' : Math.round(s.forecast.estimatedDaysRemaining)} ${t('daysRemaining').split(' ')[0]}</strong></div>
          <div class="progress" style="margin-top:14px"><span style="width:${Math.max(0, Math.min(100, Number(s.storagePercent) || 0))}%"></span></div>
          <p class="card-subtitle" style="margin-top:14px">${t('limitation')}</p>
        </div>
      </div>
      ${(recentRestorations.length || recentWarnings.length || securityAlerts.length) ? `<div class="grid two section-gap">
        <div class="card"><div class="card-header"><div><h2>${state.language === 'de' ? 'Letzte Wiederherstellungen' : 'Latest restorations'}</h2><p class="card-subtitle">${state.language === 'de' ? 'Zuletzt erfolgreich zurückgeholte Dateien und Vorgänge' : 'Recently restored files and operations'}</p></div><button class="btn small" data-page-jump="timeline">${t('open')}</button></div>${renderEventRows(recentRestorations, true)}</div>
        <div class="card"><div class="card-header"><div><h2>${state.language === 'de' ? 'Warnungen' : 'Warnings'}</h2><p class="card-subtitle">${securityAlerts.length} ${state.language === 'de' ? 'offene Sicherheitswarnungen' : 'open security alerts'}</p></div><button class="btn small warning" data-page-jump="security">${t('open')}</button></div>${renderEventRows(recentWarnings, true)}${securityAlerts.length ? `<div class="status-row section-gap"><span>${state.language === 'de' ? 'Ungeklärte Massenänderungen' : 'Unresolved mass changes'}</span><strong>${securityAlerts.length}</strong></div>` : ''}</div>
      </div>` : ''}`;
    bindEventButtons();
    content.querySelectorAll('[data-page-jump]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.pageJump)));
    document.getElementById('quickUndo').addEventListener('click', quickUndo);
    document.getElementById('quickCheckpoint').addEventListener('click', showCheckpointCreate);
    document.getElementById('quickFolder').addEventListener('click', chooseProtectedFolder);
    document.getElementById('quickEmergency').addEventListener('click', runEmergency);
    document.getElementById('dashboardProtectFirstFolder')?.addEventListener('click', chooseProtectedFolder);
    document.getElementById('openRecentActivitiesPopup').addEventListener('click', showRecentActivitiesPopup);
  }

  function showRecentActivitiesPopup() {
    const events = state.app?.recentEvents || [];
    openModal({
      title: t('recentActivity'),
      subtitle: state.language === 'de' ? 'Die neuesten lokalen Ereignisse. Dateinamen und ursprüngliche Pfade werden vollständig angezeigt.' : 'Newest local events. File names and original paths are shown in full.',
      wide: true,
      body: renderEventRows(events, true),
      actions: [
        { label: t('close'), handler: closeModal },
        { label: state.language === 'de' ? 'Gesamte Timeline öffnen' : 'Open full timeline', style: 'primary', handler: async () => { closeModal(); await navigate('timeline'); } }
      ],
      onOpen: (modal) => bindEventButtons(modal)
    });
  }

  function statCard(icon, label, value, meta) {
    return `<div class="card stat-card"><div class="stat-label">${icon} ${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div><div class="stat-meta">${escapeHtml(meta)}</div></div>`;
  }

  async function renderTimeline() {
    const de = state.language === 'de';
    const filters = state.timelineFilters || (state.timelineFilters = { query: state.timelineFilter || '', action: '', program: '', drive: '', extension: '', from: '', to: '', status: 'all', favorite: false });
    const request = { limit: 5000, query: filters.query || undefined, action: filters.action || undefined, program: filters.program || undefined, drive: filters.drive || undefined, extension: filters.extension || undefined,
      from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
      to: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined,
      favorite: filters.favorite ? true : undefined };
    if (filters.status === 'restorable') request.restorable = true;
    if (filters.status === 'restored') request.restored = true;
    if (filters.status === 'not-restorable') request.restorable = false;
    const events = unwrap(await api.timeline.list(request));
    const actions = ['', 'created', 'copied', 'modified', 'deleted', 'moved', 'renamed', 'directory-created', 'directory-deleted', 'restored', 'checkpoint-created', 'suspicious-activity'];
    content.innerHTML = `
      <div class="card"><div class="toolbar" style="flex-wrap:wrap"><input id="timelineSearch" class="search-input" placeholder="${t('searchPlaceholder')}" value="${escapeHtml(filters.query)}"><select id="timelineAction">${actions.map((action) => `<option value="${action}" ${filters.action===action?'selected':''}>${action ? escapeHtml(eventLabel(action)) : t('action')}</option>`).join('')}</select><input id="timelineProgram" class="field" placeholder="${t('program')}" value="${escapeHtml(filters.program)}"><input id="timelineDrive" class="field code" placeholder="${de?'Laufwerk, z. B. C:':'Drive, e.g. C:'}" value="${escapeHtml(filters.drive)}"><input id="timelineExtension" class="field code" placeholder="${de?'Dateityp, z. B. .png':'File type, e.g. .png'}" value="${escapeHtml(filters.extension)}"><input id="timelineFrom" class="field" type="date" aria-label="${de?'Von':'From'}" value="${escapeHtml(filters.from)}"><input id="timelineTo" class="field" type="date" aria-label="${de?'Bis':'To'}" value="${escapeHtml(filters.to)}"><select id="timelineStatus"><option value="all" ${filters.status==='all'?'selected':''}>${de?'Alle Status':'All statuses'}</option><option value="restorable" ${filters.status==='restorable'?'selected':''}>${t('restorable')}</option><option value="restored" ${filters.status==='restored'?'selected':''}>${t('restored')}</option><option value="not-restorable" ${filters.status==='not-restorable'?'selected':''}>${de?'Nicht wiederherstellbar':'Not restorable'}</option></select><label class="button-row"><input id="timelineFavorite" type="checkbox" ${filters.favorite?'checked':''}> ${t('favorite')}</label><button class="btn" id="timelineFilterButton">${t('searchNow')}</button><button class="btn" id="timelineResetButton">${de?'Filter zurücksetzen':'Reset filters'}</button><button class="btn" id="exportTimelineButton">${t('exportTimeline')}</button></div><div id="timelineResults">${renderEventRows(events)}</div></div>`;
    bindEventButtons();
    document.getElementById('timelineFilterButton').addEventListener('click', async () => {
      state.timelineFilter = document.getElementById('timelineSearch').value.trim();
      state.timelineFilters = { query: state.timelineFilter, action: document.getElementById('timelineAction').value, program: document.getElementById('timelineProgram').value.trim(), drive: document.getElementById('timelineDrive').value.trim(), extension: document.getElementById('timelineExtension').value.trim(), from: document.getElementById('timelineFrom').value, to: document.getElementById('timelineTo').value, status: document.getElementById('timelineStatus').value, favorite: document.getElementById('timelineFavorite').checked };
      await renderTimeline();
    });
    document.getElementById('timelineResetButton').addEventListener('click', async () => { state.timelineFilter = ''; state.timelineFilters = { query: '', action: '', program: '', drive: '', extension: '', from: '', to: '', status: 'all', favorite: false }; await renderTimeline(); });
    document.getElementById('exportTimelineButton').addEventListener('click', exportTimeline);
  }

  function conflictRuleOptions(selected) {
    return [['rename', t('rename')], ['replace', t('replace')], ['keep-newer', t('keepNewer')], ['keep-older', t('keepOlder')], ['skip', t('skipped')]]
      .map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
  }

  async function showUndoPreview(eventId) {
    const preview = unwrap(await api.undo.preview(eventId, { dryRun: true }));
    const de = state.language === 'de';
    openModal({
      title: t('undoPreview'), subtitle: preview.warning || t('whatWouldHappen'), wide: true,
      body: `
        <div class="card" style="box-shadow:none"><div class="status-row"><span>${t('action')}</span><strong>${escapeHtml(eventLabel(preview.event.action))}</strong></div><div class="status-row"><span>${de ? 'Name' : 'Name'}</span><strong>${escapeHtml(eventDisplayName(preview.event))}</strong></div><div class="status-row"><span>${t('path')}</span><strong class="code" style="overflow-wrap:anywhere;text-align:right">${escapeHtml(displayPath(preview.event.path))}</strong></div><div class="status-row"><span>${t('status')}</span><strong>${preview.supported ? '✓' : '✕'} ${preview.supported ? t('preview') : t('notAvailable')}</strong></div></div>
        <div class="section-gap"><label class="field-label">${t('conflictRule')}</label><select id="undoConflict" class="field" style="width:100%">${conflictRuleOptions(preview.conflictRule || state.app.settings.undoRules.defaultConflictRule)}</select></div>
        <div class="section-gap"><h3>${t('whatWouldHappen')}</h3><div class="list">${preview.steps.map((step) => `<div class="list-item"><div class="list-item-main"><div class="list-item-title">${escapeHtml(step.type)}</div><div class="list-item-meta code">${escapeHtml(step.targetPath || step.path || `${step.from} → ${step.to}`)}</div></div><span>${formatBytes(step.bytes)}</span></div>`).join('') || `<div class="empty">${escapeHtml(preview.warning || t('notAvailable'))}</div>`}</div></div>
        <p class="muted section-gap">${de ? '„Wiederherstellen“ schreibt die Datei wirklich an den ursprünglichen Speicherort zurück. „Test-Wiederherstellung“ legt nur eine getrennte Kopie im Testordner an.' : 'Restore really writes the file back to its original location. Test restore only creates a separate copy in the test folder.'}</p>`,
      actions: [
        { label: t('cancel'), handler: closeModal },
        { label: t('dryRun'), style: 'ghost', handler: async (modal) => { const result = unwrap(await api.undo.execute(eventId, { dryRun: true, conflictRule: modal.querySelector('#undoConflict').value })); toast(result.preview.supported ? t('success') : t('warning')); } },
        { label: t('testRestore'), handler: async (modal) => { if (!preview.supported) throw new Error(preview.warning || t('notAvailable')); const result = unwrap(await api.undo.execute(eventId, { dryRun: false, conflictRule: modal.querySelector('#undoConflict').value, testRestore: true })); toast(`${de ? 'Testordner' : 'Test folder'}: ${result.folder}`); } },
        { label: t('restore'), style: 'primary', handler: async (modal) => {
          if (!preview.supported) throw new Error(preview.warning || t('notAvailable'));
          const result = unwrap(await api.undo.execute(eventId, { dryRun: false, conflictRule: modal.querySelector('#undoConflict').value, testRestore: false }));
          closeModal(); toast(`${t('success')}${result.results?.[0]?.restoredPath ? `: ${result.results[0].restoredPath}` : ''}`); await navigate(state.currentPage);
        } }
      ]
    });
  }

  async function showGroupPreview(groupId) {
    const result = unwrap(await api.undo.group(groupId, { dryRun: true }));
    const defaultRule = state.app.settings.undoRules.defaultConflictRule;
    const de = state.language === 'de';
    openModal({ title: t('groupedUndo'), subtitle: `${result.previews.length} ${t('action').toLowerCase()}${result.collapsed?.length ? ` · ${result.collapsed.length} ${de?'zusammengefasst':'collapsed'}` : ''}`, wide: true,
      body: `<div><label class="field-label">${t('conflictRule')}</label><select id="groupConflict" class="field" style="width:100%">${conflictRuleOptions(defaultRule)}</select></div><div class="list section-gap">${result.previews.map((preview) => `<div class="list-item"><div class="list-item-main"><div class="list-item-title">${escapeHtml(eventLabel(preview.event.action))} · ${escapeHtml(eventDisplayName(preview.event))}</div><div class="list-item-meta code">${escapeHtml(displayPath(preview.event.path))}</div></div><span>${preview.supported ? '✓' : '—'}</span></div>`).join('')}</div><p class="muted section-gap">${de?'Die Schaltfläche „Wiederherstellen“ führt die Rückgängig-Kette wirklich aus.':'The Restore button actually executes the undo chain.'}</p>`,
      actions: [
        { label: t('cancel'), handler: closeModal },
        { label: t('dryRun'), handler: async (modal) => { unwrap(await api.undo.group(groupId, { dryRun: true, conflictRule: modal.querySelector('#groupConflict').value })); toast(t('success')); } },
        { label: t('restore'), style: 'primary', handler: async (modal) => { unwrap(await api.undo.group(groupId, { dryRun: false, conflictRule: modal.querySelector('#groupConflict').value, testRestore: false })); closeModal(); toast(t('success')); await navigate(state.currentPage); } }
      ]
    });
  }

  async function quickUndo() {
    const events = unwrap(await api.timeline.list({ restorable: true, limit: 100 }));
    const fileActions = new Set(['created','copied','deleted','modified','moved','renamed','directory-created','directory-deleted']);
    const event = events.find((item) => !item.restored && fileActions.has(item.action)) || events.find((item) => !item.restored);
    if (!event) return toast(t('nothingToUndo'), 'error');
    showUndoPreview(event.id);
  }

  async function renderCheckpoints() {
    const items = unwrap(await api.checkpoints.list());
    content.innerHTML = `<div class="card"><div class="card-header"><div><h2>${t('checkpoints')}</h2><p class="card-subtitle">${state.language === 'de' ? 'Manuelle, automatische und kommentierte Wiederherstellungspunkte' : 'Manual, automatic and commented recovery points'}</p></div><button class="btn primary" id="createCheckpointButton">＋ ${t('create')}</button></div>${items.length ? `<div class="list">${items.map((item) => `<div class="list-item"><div class="list-item-main"><div class="list-item-title"><span style="color:${safeColor(item.color)}">●</span> ${escapeHtml(item.name)} ${item.favorite?'★':''}</div><div class="list-item-meta">${formatDate(item.createdAt)} · ${item.versions.length} ${t('versionsCount').toLowerCase()} · ${escapeHtml(item.note)}</div></div><div class="button-row"><button class="btn small ghost" data-checkpoint-favorite="${escapeAttr(item.id)}" data-value="${!item.favorite}" aria-label="${escapeHtml(t('favorite'))}">${item.favorite?'★':'☆'}</button><button class="btn small" data-checkpoint-preview="${escapeAttr(item.id)}">${t('preview')}</button><button class="btn small primary" data-checkpoint-restore="${escapeAttr(item.id)}">${t('restore')}</button><button class="btn small danger" data-checkpoint-remove="${escapeAttr(item.id)}" aria-label="${escapeHtml(t('remove'))}">×</button></div></div>`).join('')}</div>` : `<div class="empty">${t('noData')}</div>`}</div>`;
    document.getElementById('createCheckpointButton').addEventListener('click', showCheckpointCreate);
    content.querySelectorAll('[data-checkpoint-preview]').forEach((button) => button.addEventListener('click', () => showCheckpointPreview(button.dataset.checkpointPreview, true)));
    content.querySelectorAll('[data-checkpoint-restore]').forEach((button) => button.addEventListener('click', () => showCheckpointPreview(button.dataset.checkpointRestore, false)));
    content.querySelectorAll('[data-checkpoint-favorite]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.checkpoints.favorite(button.dataset.checkpointFavorite, button.dataset.value === 'true')); await renderCheckpoints(); }));
    content.querySelectorAll('[data-checkpoint-remove]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.checkpoints.remove(button.dataset.checkpointRemove)); await renderCheckpoints(); }));
  }

  function showCheckpointCreate() {
    const de = state.language === 'de';
    const workspace = state.app.settings.workspace;
    openModal({ title: t('checkpoint'), wide: true, body: `<div class="form-grid"><div><label class="field-label">${t('name')}</label><input id="cpName" class="field" style="width:100%" autofocus></div><div><label class="field-label">${t('category')}</label><select id="cpCategory" class="field" style="width:100%"><option value="manual">${t('manual')}</option><option value="before-update">${de?'Vor Update':'Before update'}</option><option value="stable">${de?'Stabile Version':'Stable version'}</option><option value="before-refactor">${de?'Vor Umbau':'Before refactor'}</option></select></div><div><label class="field-label">${de?'Farbe':'Color'}</label><input id="cpColor" type="color" value="#6d7cff"></div><div class="full"><label class="field-label">${t('note')}</label><textarea id="cpNote" style="width:100%"></textarea></div></div><div class="grid two section-gap"><label class="setting-row"><span>${de?'Einstellungen aufnehmen':'Include settings'}</span><input id="cpSettings" type="checkbox" checked></label><label class="setting-row"><span>${de?'Arbeitsbereich aufnehmen':'Include workspace'}</span><input id="cpWorkspace" type="checkbox" checked></label><label class="setting-row"><span>${de?'Zwischenablage aufnehmen':'Include clipboard'}</span><input id="cpClipboard" type="checkbox" ${workspace.includeClipboard?'checked':''}></label><label class="setting-row"><span>${de?'Desktop-Screenshot':'Desktop screenshot'}</span><input id="cpScreenshot" type="checkbox" ${workspace.includeScreenshot?'checked':''}></label><label class="setting-row"><span>${de?'Ordnerstruktur aufnehmen':'Include folder structure'}</span><input id="cpStructure" type="checkbox" checked></label><label class="setting-row"><span>${de?'Ausgewählte Systemeinstellungen':'Selected system settings'}</span><input id="cpSystemState" type="checkbox" ${workspace.includeSystemState?'checked':''}></label></div>`, actions: [{ label: t('cancel'), handler: closeModal }, { label: t('create'), style: 'primary', handler: async (modal) => { unwrap(await api.checkpoints.create({ name: modal.querySelector('#cpName').value, note: modal.querySelector('#cpNote').value, color: modal.querySelector('#cpColor').value, category: modal.querySelector('#cpCategory').value, includeSettings: modal.querySelector('#cpSettings').checked, includeWorkspace: modal.querySelector('#cpWorkspace').checked, includeClipboard: modal.querySelector('#cpClipboard').checked, includeScreenshot: modal.querySelector('#cpScreenshot').checked, includeFolderStructure: modal.querySelector('#cpStructure').checked, includeSystemState: modal.querySelector('#cpSystemState').checked })); closeModal(); toast(t('checkpointDone')); await navigate(state.currentPage); } }] });
  }

  async function showCheckpointPreview(checkpointId, previewOnly) {
    const result = unwrap(await api.checkpoints.preview(checkpointId));
    const items = result.items || [];
    const de = state.language === 'de';
    openModal({ title: result.checkpoint.name, subtitle: `${items.length} ${t('versionsCount').toLowerCase()}`, wide: true,
      body: `<div class="button-row"><button class="btn small" id="cpSelectAll">${de?'Alle auswählen':'Select all'}</button><button class="btn small" id="cpSelectNone">${de?'Keine auswählen':'Select none'}</button></div><div class="list section-gap" style="max-height:320px;overflow:auto">${items.slice(0,2000).map((version) => `<label class="list-item"><input type="checkbox" data-cp-version="${escapeAttr(version.id)}" checked><div class="list-item-main"><div class="list-item-title">${escapeHtml(displayPath(version.path))}</div><div class="list-item-meta">${formatBytes(version.size)} · ${formatDate(version.createdAt)}</div></div></label>`).join('')}</div><div class="form-grid section-gap"><div><label class="field-label">${t('conflictRule')}</label><select id="cpConflict" class="field" style="width:100%">${conflictRuleOptions(state.app.settings.undoRules.defaultConflictRule)}</select></div><div><label class="field-label">${de?'Alternativer Zielordner':'Alternate destination'}</label><div class="button-row"><input id="cpDestination" class="field code" readonly style="width:100%"><button class="btn" id="cpChooseDestination">…</button></div></div></div><div class="grid two section-gap"><label class="setting-row"><span>${de?'Ordnerstruktur':'Folder structure'}</span><input id="cpRestoreStructure" type="checkbox" checked></label><label class="setting-row"><span>${de?'Einstellungen':'Settings'}</span><input id="cpRestoreSettings" type="checkbox" ${result.checkpoint.settingsSnapshot?'':'disabled'}></label><label class="setting-row"><span>${de?'Arbeitsbereich':'Workspace'}</span><input id="cpRestoreWorkspace" type="checkbox" ${result.checkpoint.workspaceId?'':'disabled'}></label><label class="setting-row"><span>${t('clipboard')}</span><input id="cpRestoreClipboard" type="checkbox" ${result.checkpoint.clipboardSnapshot?'':'disabled'}></label><label class="setting-row"><span>${de?'Systemeinstellungen':'System settings'}</span><input id="cpRestoreSystem" type="checkbox" ${result.checkpoint.systemState?'':'disabled'}></label></div>`,
      actions: [{ label: t('close'), handler: closeModal }, { label: previewOnly ? t('dryRun') : t('restore'), style: 'primary', handler: async (modal) => {
        const versionIds = [...modal.querySelectorAll('[data-cp-version]:checked')].map((input) => input.dataset.cpVersion);
        const options = { dryRun: previewOnly, conflictRule: modal.querySelector('#cpConflict').value, destinationRoot: modal.querySelector('#cpDestination').value, versionIds, restoreFolderStructure: modal.querySelector('#cpRestoreStructure').checked, restoreSettings: modal.querySelector('#cpRestoreSettings').checked, restoreWorkspace: modal.querySelector('#cpRestoreWorkspace').checked, restoreClipboard: modal.querySelector('#cpRestoreClipboard').checked, restoreSystemState: modal.querySelector('#cpRestoreSystem').checked };
        const restored = unwrap(await api.checkpoints.restore(checkpointId, options));
        if (previewOnly) toast(`${t('success')}: ${restored.selectedCount ?? versionIds.length}`); else { closeModal(); toast(t('success')); await renderCheckpoints(); }
      } }],
      onOpen: (modal) => {
        modal.querySelector('#cpSelectAll').addEventListener('click', () => modal.querySelectorAll('[data-cp-version]').forEach((input) => { input.checked = true; }));
        modal.querySelector('#cpSelectNone').addEventListener('click', () => modal.querySelectorAll('[data-cp-version]').forEach((input) => { input.checked = false; }));
        modal.querySelector('#cpChooseDestination').addEventListener('click', async () => { const folder = unwrap(await api.dialog.chooseFolder(de?'Alternativen Zielordner wählen':'Choose alternate destination')); if (folder) modal.querySelector('#cpDestination').value = folder; });
      }
    });
  }

  async function renderVault() {
    const items = unwrap(await api.vault.trash());
    const de = state.language === 'de';
    content.innerHTML = `<div class="card"><div class="card-header"><div><h2>${t('vault')}</h2><p class="card-subtitle">${de ? 'Eigene lokale Ablage mit individuellen Löschregeln' : 'Local protected storage with custom deletion rules'}</p></div></div>${items.length ? `<div class="list">${items.map((item) => `<div class="list-item"><div class="list-item-main"><div class="list-item-title">${item.isDirectory?'📁':'📄'} ${escapeHtml(item.name)} ${item.favorite?'★':''}</div><div class="list-item-meta code">${escapeHtml(displayPath(item.originalPath))} · ${formatBytes(item.size)} · ${item.fileCount || 1} ${de?'Dateien':'files'} · ${formatDate(item.modifiedAt)}</div></div><div class="button-row"><button class="btn small ghost" data-trash-favorite="${escapeAttr(item.id)}" data-value="${!item.favorite}" aria-label="${escapeHtml(t('favorite'))}">${item.favorite?'★':'☆'}</button><button class="btn small" data-trash-preview="${escapeAttr(item.id)}">${t('preview')}</button><button class="btn small primary" data-trash-restore="${escapeAttr(item.id)}">${t('restore')}</button><button class="btn small danger" data-trash-delete="${escapeAttr(item.id)}">${t('deletePermanently')}</button></div></div>`).join('')}</div>` : `<div class="empty">${t('protectedTrashEmpty')}</div>`}</div>`;
    content.querySelectorAll('[data-trash-favorite]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.vault.trashFavorite(button.dataset.trashFavorite, button.dataset.value === 'true')); await renderVault(); }));
    content.querySelectorAll('[data-trash-preview]').forEach((button) => button.addEventListener('click', async () => {
      const preview = unwrap(await api.vault.trashPreview(button.dataset.trashPreview));
      const item = preview.item;
      let body = '';
      if (preview.type === 'text') body = `<pre class="code" style="white-space:pre-wrap;max-height:420px;overflow:auto">${escapeHtml(preview.text)}</pre>`;
      else if (preview.type === 'image') body = `<img src="${preview.dataUrl}" alt="${escapeHtml(item?.name || '')}" style="max-width:100%;max-height:500px;border-radius:12px">`;
      else if (preview.type === 'directory') body = `<div class="list" style="max-height:440px;overflow:auto">${(preview.entries || []).map((entry) => `<div class="list-item"><span class="code">${escapeHtml(entry.relativePath)}</span><span>${formatBytes(entry.size)}</span></div>`).join('') || `<div class="empty">${t('noData')}</div>`}</div>`;
      else body = `<div class="empty">${de?'Für diesen Dateityp ist keine Vorschau verfügbar.':'No preview is available for this file type.'}</div>`;
      openModal({ title: item?.name || t('preview'), subtitle: displayPath(item?.originalPath), wide: true, body, actions: [{ label: t('close'), handler: closeModal }] });
    }));
    content.querySelectorAll('[data-trash-restore]').forEach((button) => button.addEventListener('click', async () => {
      const itemId = button.dataset.trashRestore;
      openModal({ title: t('restore'), body: `<label class="field-label">${t('conflictRule')}</label><select id="trashConflict" class="field" style="width:100%">${conflictRuleOptions(state.app.settings.undoRules.defaultConflictRule)}</select>`, actions: [{ label: t('cancel'), handler: closeModal }, { label: t('restore'), style: 'primary', handler: async (modal) => { const result = unwrap(await api.vault.restoreTrash(itemId, modal.querySelector('#trashConflict').value)); closeModal(); toast(result.restoredPath || t('success')); await renderVault(); } }] });
    }));
    content.querySelectorAll('[data-trash-delete]').forEach((button) => button.addEventListener('click', async () => {
      const itemId = button.dataset.trashDelete;
      openModal({ title: t('deletePermanently'), subtitle: de?'Dieser Vorgang kann nicht rückgängig gemacht werden.':'This action cannot be undone.', body: `<p>${de?'Nur der ausgewählte geschützte Eintrag und seine zugehörigen Versionen werden entfernt.':'Only the selected protected item and its associated versions will be removed.'}</p>`, actions: [{ label: t('cancel'), handler: closeModal }, { label: t('deletePermanently'), style: 'danger', handler: async () => { unwrap(await api.vault.permanentDelete(itemId)); closeModal(); toast(t('success')); await renderVault(); } }] });
    }));
  }

  async function renderVersions() {
    const items = unwrap(await api.vault.list());
    content.innerHTML = `<div class="card"><div class="toolbar"><input id="versionSearch" class="search-input" placeholder="${t('searchPlaceholder')}"><button class="btn" id="versionSearchButton">${t('searchNow')}</button></div><div id="versionList">${renderVersionList(items)}</div></div>`;
    document.getElementById('versionSearchButton').addEventListener('click', () => {
      const q = document.getElementById('versionSearch').value.toLowerCase();
      document.getElementById('versionList').innerHTML = renderVersionList(items.filter((item) => item.path.toLowerCase().includes(q)));
      bindVersionButtons();
    });
    bindVersionButtons();
  }

  function renderVersionList(items) {
    if (!items.length) return `<div class="empty">${t('noData')}</div>`;
    return `<div class="list">${items.map((item) => `<div class="list-item"><div class="list-item-main"><div class="list-item-title">${escapeHtml(displayPath(item.path))}</div><div class="list-item-meta">${item.count} ${t('versionsCount').toLowerCase()} · ${formatBytes(item.totalBytes)} · ${formatDate(item.latest?.createdAt)}</div></div><button class="btn small" data-version-details="${escapeAttr(item.path)}">${t('open')}</button></div>`).join('')}</div>`;
  }

  function bindVersionButtons() {
    content.querySelectorAll('[data-version-details]').forEach((button) => button.addEventListener('click', async () => {
      const filePath = button.dataset.versionDetails;
      const versions = unwrap(await api.vault.list(filePath));
      openModal({ title: displayPath(filePath), subtitle: `${versions.length} ${t('versionsCount').toLowerCase()}`, wide: true,
        body: `${versions.length >= 2 ? `<div class="button-row" style="margin-bottom:14px"><button class="btn" id="compareLatestVersions">${state.language === 'de' ? 'Letzte zwei Versionen vergleichen' : 'Compare latest two versions'}</button></div>` : ''}<div class="list">${versions.map((version) => `<div class="list-item"><div class="list-item-main"><div class="list-item-title">${formatDate(version.createdAt)} ${version.favorite ? '★' : ''}</div><div class="list-item-meta">${formatBytes(version.size)} · ${escapeHtml(version.reason)} · <span class="code">${escapeHtml(String(version.hash || '').slice(0, 12))}</span></div></div><div class="button-row"><button class="btn small" data-version-favorite="${escapeAttr(version.id)}" data-favorite="${!version.favorite}" aria-label="${escapeHtml(t('favorite'))}">${version.favorite?'★':'☆'}</button><button class="btn small" data-version-preview="${escapeAttr(version.id)}">${t('preview')}</button><button class="btn small primary" data-version-restore="${escapeAttr(version.id)}">${t('restore')}</button></div></div>`).join('')}</div>`,
        actions: [{ label: t('close'), handler: closeModal }],
        onOpen: (modal) => {
          modal.querySelector('#compareLatestVersions')?.addEventListener('click', async () => { const comparison = unwrap(await api.vault.compare(versions[1].id, versions[0].id)); showVersionComparison(comparison); });
          modal.querySelectorAll('[data-version-favorite]').forEach((item) => item.addEventListener('click', async () => { unwrap(await api.vault.favorite(item.dataset.versionFavorite, item.dataset.favorite === 'true')); toast(t('success')); closeModal(); await navigate('versions'); }));
          modal.querySelectorAll('[data-version-preview]').forEach((item) => item.addEventListener('click', () => showVersionPreview(item.dataset.versionPreview)));
          modal.querySelectorAll('[data-version-restore]').forEach((item) => item.addEventListener('click', () => showVersionRestore(item.dataset.versionRestore, filePath)));
        }
      });
    }));
  }


  async function showVersionPreview(versionId) {
    const preview = unwrap(await api.vault.preview(versionId));
    const de = state.language === 'de';
    if (!preview.available) {
      openModal({ title: t('preview'), body: `<p>${preview.reason === 'previews-disabled' ? (de?'Vorschauen sind durch die Datenschutzeinstellungen deaktiviert.':'Previews are disabled by privacy settings.') : (de?'Für diesen Dateityp ist keine sichere Vorschau verfügbar.':'No safe preview is available for this file type.')}</p>`, actions: [{ label: t('close'), handler: closeModal }] });
      return;
    }
    const body = preview.type === 'image'
      ? `<img class="preview-image" src="${preview.dataUrl}" alt="${escapeHtml(t('preview'))}">`
      : `<pre class="preview-text">${escapeHtml(preview.text || '')}</pre>`;
    openModal({ title: t('preview'), subtitle: displayPath(preview.version?.path || ''), wide: true, body, actions: [{ label: t('close'), handler: closeModal }] });
  }

  function showVersionRestore(versionId, originalPath) {
    const de = state.language === 'de';
    const defaultRule = state.app.settings.undoRules.defaultConflictRule;
    openModal({
      title: t('restore'),
      subtitle: de ? 'Die Originaldatei wird niemals ohne eine ausdrückliche Konfliktregel überschrieben.' : 'The original file is never overwritten without an explicit conflict rule.',
      wide: true,
      body: `<div class="form-grid"><div class="full"><label class="field-label">${de?'Zieldatei':'Target file'}</label><div class="button-row"><input id="versionRestoreTarget" class="field code" style="width:100%" readonly value="${escapeHtml(originalPath)}"><button class="btn" id="versionChooseTarget">…</button></div></div><div><label class="field-label">${t('conflictRule')}</label><select id="versionConflictRule" class="field" style="width:100%">${conflictRuleOptions(defaultRule)}</select></div></div><div class="notice section-gap">${de?'Nutze zuerst die Test-Wiederherstellung, um die Version in einem getrennten temporären Ordner zu prüfen.':'Use test restore first to inspect the version in a separate temporary folder.'}</div>`,
      actions: [
        { label: t('cancel'), handler: closeModal },
        { label: de?'Test-Wiederherstellung':'Test restore', handler: async () => { const result = unwrap(await api.vault.testRestore(versionId)); toast(`${de?'Testordner':'Test folder'}: ${result.folder}`); } },
        { label: t('dryRun'), handler: async (modal) => { const result = unwrap(await api.vault.restore({ versionId, targetPath: modal.querySelector('#versionRestoreTarget').value, conflictRule: modal.querySelector('#versionConflictRule').value, dryRun: true })); toast(`${t('preview')}: ${result.preview?.action || (result.skipped?'skip':'write')}`); } },
        { label: t('restore'), style: 'primary', handler: async (modal) => { const result = unwrap(await api.vault.restore({ versionId, targetPath: modal.querySelector('#versionRestoreTarget').value, conflictRule: modal.querySelector('#versionConflictRule').value, dryRun: false })); closeModal(); toast(result.restoredPath || (result.skipped ? (de?'Übersprungen':'Skipped') : t('success'))); } }
      ],
      onOpen: (modal) => modal.querySelector('#versionChooseTarget').addEventListener('click', async () => {
        const destination = unwrap(await api.dialog.chooseSave({ title: de?'Wiederherstellungsziel wählen':'Choose restore target', defaultPath: originalPath }));
        if (destination) modal.querySelector('#versionRestoreTarget').value = destination;
      })
    });
  }


  function showVersionComparison(comparison) {
    const de = state.language === 'de';
    if (comparison.type === 'binary') {
      openModal({
        title: de ? 'Versionsvergleich' : 'Version comparison',
        subtitle: de ? 'Binärdatei: Vergleich über Prüfsumme und Dateigröße' : 'Binary file: comparison by checksum and file size',
        body: `<div class="status-row"><span>${de ? 'Gleicher Inhalt' : 'Same content'}</span><strong>${comparison.sameContent ? '✓' : '—'}</strong></div><div class="status-row"><span>${de ? 'Größenänderung' : 'Size change'}</span><strong>${formatBytes(Math.abs(comparison.sizeDelta))} ${comparison.sizeDelta >= 0 ? '＋' : '−'}</strong></div>`,
        actions: [{ label: t('close'), handler: closeModal }]
      });
      return;
    }
    const rows = (comparison.changes || []).slice(0, 1000).map((change) => `<div class="diff-row ${safeClassToken(change.type)}"><div class="diff-line">${change.line}</div><div class="diff-before">${escapeHtml(change.before)}</div><div class="diff-after">${escapeHtml(change.after)}</div></div>`).join('');
    openModal({
      title: de ? 'Versionsvergleich' : 'Version comparison',
      subtitle: `${comparison.added} ${de ? 'hinzugefügt' : 'added'} · ${comparison.removed} ${de ? 'entfernt' : 'removed'} · ${comparison.changed} ${de ? 'geändert' : 'changed'}`,
      wide: true,
      body: `<div class="diff-head"><span>#</span><span>${de ? 'Vorher' : 'Before'}</span><span>${de ? 'Nachher' : 'After'}</span></div><div class="diff-list">${rows || `<div class="empty">${de ? 'Keine Inhaltsänderungen.' : 'No content changes.'}</div>`}</div>${comparison.truncated ? `<p class="muted section-gap">${de ? 'Die Vorschau wurde auf 5.000 Zeilen begrenzt.' : 'The preview was limited to 5,000 lines.'}</p>` : ''}`,
      actions: [{ label: t('close'), handler: closeModal }]
    });
  }

  async function renderClipboard() {
    const items = unwrap(await api.clipboard.list(''));
    const de = state.language === 'de';
    content.innerHTML = `<div class="card"><div class="toolbar"><input id="clipSearch" class="search-input" placeholder="${t('searchPlaceholder')}"><button class="btn" id="clipSearchButton">${t('searchNow')}</button><button class="btn danger" id="clearClipboardButton">${t('clear')}</button></div><div id="clipList">${renderClipboardList(items)}</div></div>`;
    document.getElementById('clipSearchButton').addEventListener('click', async () => { const data = unwrap(await api.clipboard.list(document.getElementById('clipSearch').value)); document.getElementById('clipList').innerHTML = renderClipboardList(data); bindClipboardButtons(); });
    document.getElementById('clearClipboardButton').addEventListener('click', async () => {
      openModal({ title: t('clear'), subtitle: de?'Favoriten, angeheftete und geschützte Einträge können erhalten bleiben.':'Favorites, pinned and protected items can be preserved.', body: `<label class="setting-row"><span>${de?'Auch geschützte Einträge entfernen':'Also remove protected items'}</span><input id="clearProtectedClipboard" type="checkbox"></label>`, actions: [{ label: t('cancel'), handler: closeModal }, { label: t('clear'), style: 'danger', handler: async (modal) => { unwrap(await api.clipboard.clear(modal.querySelector('#clearProtectedClipboard').checked)); closeModal(); toast(t('success')); await renderClipboard(); } }] });
    });
    bindClipboardButtons();
  }

  function renderClipboardList(items) {
    if (!items.length) return `<div class="empty">${t('noData')}</div>`;
    const de = state.language === 'de';
    return `<div class="list">${items.map((item) => `<div class="list-item"><div class="list-item-main"><div class="list-item-title">${item.pinned?'📌 ':''}${escapeHtml((item.text || `[${item.type}]`).slice(0, 160))}</div><div class="list-item-meta">${formatDate(item.createdAt)} · ${escapeHtml(item.type)} · ${escapeHtml(item.program || t('unknown'))}${item.protected ? ` · ${de?'geschützt':'protected'}` : ''}</div></div><div class="button-row">${item.hasImage ? `<button class="btn small" data-clip-preview="${escapeAttr(item.id)}">${t('preview')}</button>` : ''}<button class="btn small primary" data-clip-copy="${escapeAttr(item.id)}">${de?'Kopieren':'Copy'}</button><button class="btn small" data-clip-pin="${escapeAttr(item.id)}" data-value="${!item.pinned}" aria-label="${de?'Anheften':'Pin'}">📌</button><button class="btn small" data-clip-protect="${escapeAttr(item.id)}" data-value="${!item.protected}" aria-label="${de?'Schützen':'Protect'}">${item.protected?'🔒':'🔓'}</button><button class="btn small" data-clip-fav="${escapeAttr(item.id)}" data-value="${!item.favorite}">${item.favorite ? '★' : '☆'}</button><button class="btn small danger" data-clip-remove="${escapeAttr(item.id)}">×</button></div></div>`).join('')}</div>`;
  }

  function bindClipboardButtons() {
    content.querySelectorAll('[data-clip-copy]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.clipboard.copy(button.dataset.clipCopy)); toast(state.language==='de'?'In die Zwischenablage kopiert.':'Copied to clipboard.'); }));
    content.querySelectorAll('[data-clip-preview]').forEach((button) => button.addEventListener('click', async () => { const preview = unwrap(await api.clipboard.preview(button.dataset.clipPreview)); openModal({ title: t('preview'), body: preview.available ? `<img src="${preview.dataUrl}" alt="${escapeHtml(t('preview'))}" style="max-width:100%;max-height:520px;border-radius:12px">` : `<div class="empty">${t('notAvailable')}</div>`, actions: [{ label: t('close'), handler: closeModal }] }); }));
    content.querySelectorAll('[data-clip-pin]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.clipboard.pin(button.dataset.clipPin, button.dataset.value === 'true')); await renderClipboard(); }));
    content.querySelectorAll('[data-clip-protect]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.clipboard.protect(button.dataset.clipProtect, button.dataset.value === 'true')); await renderClipboard(); }));
    content.querySelectorAll('[data-clip-fav]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.clipboard.favorite(button.dataset.clipFav, button.dataset.value === 'true')); await renderClipboard(); }));
    content.querySelectorAll('[data-clip-remove]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.clipboard.remove(button.dataset.clipRemove)); await renderClipboard(); }));
  }

  async function renderWorkspaces() {
    const items = unwrap(await api.workspaces.list());
    content.innerHTML = `<div class="card"><div class="card-header"><div><h2>${t('workspaces')}</h2><p class="card-subtitle">${state.language === 'de' ? 'Fenster, Programme, Monitore, Zwischenablage und Desktop-Screenshot' : 'Windows, apps, monitors, clipboard and desktop screenshot'}</p></div><button class="btn primary" id="captureWorkspaceButton">＋ ${t('captureWorkspace')}</button></div>${items.length ? `<div class="grid two">${items.map((item) => `<div class="card" style="box-shadow:none"><div class="card-header"><div><h3>${escapeHtml(item.name)}</h3><p class="card-subtitle">${formatDate(item.createdAt)} · ${item.windows.length} windows</p></div></div>${item.screenshotCount ? `<img data-workspace-screenshot="${escapeAttr(item.id)}" alt="Workspace" style="display:none;width:100%;border-radius:12px;border:1px solid var(--border);margin-bottom:12px">` : ''}<p class="muted">${escapeHtml(item.note)}</p><div class="button-row"><button class="btn primary" data-workspace-restore="${escapeAttr(item.id)}">${t('restoreWorkspace')}</button><button class="btn danger" data-workspace-remove="${escapeAttr(item.id)}">${t('remove')}</button></div></div>`).join('')}</div>` : `<div class="empty">${t('noData')}</div>`}</div>`;
    for (const image of content.querySelectorAll('[data-workspace-screenshot]')) {
      try {
        const dataUrl = unwrap(await api.workspaces.screenshot(image.dataset.workspaceScreenshot));
        if (dataUrl) { image.src = dataUrl; image.style.display = 'block'; }
        else image.remove();
      } catch { image.remove(); }
    }
    document.getElementById('captureWorkspaceButton').addEventListener('click', () => {
      const projectFolders = [];
      const renderFolders = (modal) => {
        const target = modal.querySelector('#workspaceProjectFolders');
        target.innerHTML = projectFolders.length ? projectFolders.map((folder, index) => `<div class="status-row"><span class="code">${escapeHtml(displayPath(folder))}</span><button class="btn small danger" data-remove-workspace-folder="${index}">×</button></div>`).join('') : `<div class="muted">${state.language==='de'?'Keine Projektordner ausgewählt.':'No project folders selected.'}</div>`;
        target.querySelectorAll('[data-remove-workspace-folder]').forEach((button) => button.addEventListener('click', () => { projectFolders.splice(Number(button.dataset.removeWorkspaceFolder), 1); renderFolders(modal); }));
      };
      openModal({
        title: t('captureWorkspace'),
        wide: true,
        body: `<div><label class="field-label">${t('name')}</label><input id="workspaceName" class="field" style="width:100%" autofocus></div><div class="section-gap"><label class="field-label">${t('note')}</label><textarea id="workspaceNote" style="width:100%"></textarea></div><label class="setting-row section-gap"><span>${state.language==='de'?'Desktop-Screenshot aufnehmen':'Capture desktop screenshot'}</span><input id="workspaceScreenshot" type="checkbox" ${state.app.settings.workspace.includeScreenshot?'checked':''}></label><div class="section-gap"><div class="card-header"><div><label class="field-label">${state.language==='de'?'Projektordner':'Project folders'}</label><p class="card-subtitle">${state.language==='de'?'Diese Ordner werden beim Wiederherstellen erneut geöffnet.':'These folders will be reopened during restore.'}</p></div><button class="btn" id="workspaceAddFolder">＋ ${t('folder')}</button></div><div id="workspaceProjectFolders" class="list"></div></div>`,
        actions: [{ label: t('cancel'), handler: closeModal }, { label: t('create'), style: 'primary', handler: async (modal) => { unwrap(await api.workspaces.capture({ name: modal.querySelector('#workspaceName').value, note: modal.querySelector('#workspaceNote').value, includeScreenshot: modal.querySelector('#workspaceScreenshot').checked, projectFolders })); closeModal(); toast(t('success')); renderWorkspaces(); } }],
        onOpen: (modal) => {
          renderFolders(modal);
          modal.querySelector('#workspaceAddFolder').addEventListener('click', async () => { const folder = unwrap(await api.dialog.chooseFolder(state.language==='de'?'Projektordner auswählen':'Choose project folder')); if (folder && !projectFolders.includes(folder)) { projectFolders.push(folder); renderFolders(modal); } });
        }
      });
    });
    content.querySelectorAll('[data-workspace-restore]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.workspaces.restore(button.dataset.workspaceRestore)); toast(t('success')); }));
    content.querySelectorAll('[data-workspace-remove]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.workspaces.remove(button.dataset.workspaceRemove)); renderWorkspaces(); }));
  }

  async function renderProjects() {
    const items = unwrap(await api.projects.list());
    content.innerHTML = `<div class="card"><div class="card-header"><div><h2>${t('projects')}</h2><p class="card-subtitle">${state.language === 'de' ? 'Strengere Versionierung, längere Aufbewahrung und geschützte Favoriten' : 'Stricter versioning, longer retention and protected favorites'}</p></div><button class="btn primary" id="addProjectButton">＋ ${t('create')}</button></div>${items.length ? `<div class="grid two">${items.map((item) => `<div class="card" style="box-shadow:none;border-left:4px solid ${safeColor(item.color)}"><h3>${escapeHtml(item.name)}</h3><p class="card-subtitle">${item.folders.length} ${t('folder').toLowerCase()} · ${item.retentionDays} days · ${item.maxVersions} ${t('versionsCount').toLowerCase()}</p><div class="list section-gap">${item.folders.map((folder) => `<div class="list-item"><span class="code">${escapeHtml(folder)}</span></div>`).join('')}</div><div class="button-row section-gap"><button class="btn danger" data-project-remove="${escapeAttr(item.id)}">${t('remove')}</button></div></div>`).join('')}</div>` : `<div class="empty">${t('noData')}</div>`}</div>`;
    document.getElementById('addProjectButton').addEventListener('click', showProjectModal);
    content.querySelectorAll('[data-project-remove]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.projects.remove(button.dataset.projectRemove)); renderProjects(); }));
  }

  async function showProjectModal() {
    const chosen = await api.dialog.chooseFolder(t('chooseFolder')).then(unwrap);
    if (!chosen) return;
    openModal({ title: t('projects'), body: `<div class="form-grid"><div class="full"><label class="field-label">${t('projectName')}</label><input id="projectName" class="field" style="width:100%"></div><div class="full"><label class="field-label">${t('folder')}</label><input id="projectFolder" class="field code" style="width:100%" value="${escapeHtml(chosen)}" readonly></div><div><label class="field-label">${t('retentionDays')}</label><input id="projectRetention" class="field" type="number" value="180" style="width:100%"></div><div><label class="field-label">${t('maxVersions')}</label><input id="projectVersions" class="field" type="number" value="100" style="width:100%"></div></div>`, actions: [{ label: t('cancel'), handler: closeModal }, { label: t('save'), style: 'primary', handler: async (modal) => { unwrap(await api.projects.save({ name: modal.querySelector('#projectName').value, folders: [modal.querySelector('#projectFolder').value], retentionDays: Number(modal.querySelector('#projectRetention').value), maxVersions: Number(modal.querySelector('#projectVersions').value) })); closeModal(); toast(t('success')); renderProjects(); } }] });
  }

  async function renderProfiles() {
    const items = unwrap(await api.profiles.list());
    content.innerHTML = `<div class="card"><div class="card-header"><div><h2>${t('profiles')}</h2><p class="card-subtitle">${state.language === 'de' ? 'Regeln nach Dateityp, Priorität und Aufbewahrungsdauer' : 'Rules by file type, priority and retention'}</p></div><button class="btn primary" id="addProfileButton">＋ ${t('create')}</button></div><div class="grid two">${items.map((item) => `<div class="card" style="box-shadow:none"><div class="card-header"><div><h3>${escapeHtml(item.name?.[state.language] || item.name?.en || item.name)}</h3><p class="card-subtitle">${escapeHtml(item.priority)} · ${item.retentionDays} days · ${item.maxVersions} versions</p></div>${['documents','development','photos','gaming'].includes(item.id) ? '' : `<button class="btn small danger" data-profile-remove="${escapeAttr(item.id)}">×</button>`}</div><div class="code muted">${escapeHtml((item.extensions || []).join(', '))}</div></div>`).join('')}</div></div>`;
    document.getElementById('addProfileButton').addEventListener('click', () => openModal({ title: t('profiles'), body: `<div class="form-grid"><div><label class="field-label">${t('profileName')} DE</label><input id="profileDe" class="field" style="width:100%"></div><div><label class="field-label">${t('profileName')} EN</label><input id="profileEn" class="field" style="width:100%"></div><div class="full"><label class="field-label">${t('extensions')}</label><input id="profileExt" class="field" style="width:100%" placeholder=".psd, .blend, .kra"></div><div><label class="field-label">${t('retentionDays')}</label><input id="profileRetention" type="number" class="field" value="90" style="width:100%"></div><div><label class="field-label">${t('maxVersions')}</label><input id="profileVersions" type="number" class="field" value="30" style="width:100%"></div><div class="full"><label class="field-label">${t('priority')}</label><select id="profilePriority" style="width:100%"><option value="high">${t('high')}</option><option value="normal">${t('normal')}</option><option value="low">${t('low')}</option></select></div></div>`, actions: [{ label: t('cancel'), handler: closeModal }, { label: t('save'), style: 'primary', handler: async (modal) => { unwrap(await api.profiles.save({ name: { de: modal.querySelector('#profileDe').value, en: modal.querySelector('#profileEn').value }, extensions: modal.querySelector('#profileExt').value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean), retentionDays: Number(modal.querySelector('#profileRetention').value), maxVersions: Number(modal.querySelector('#profileVersions').value), priority: modal.querySelector('#profilePriority').value })); closeModal(); renderProfiles(); } }] }));
    content.querySelectorAll('[data-profile-remove]').forEach((button) => button.addEventListener('click', async () => { unwrap(await api.profiles.remove(button.dataset.profileRemove)); renderProfiles(); }));
  }

  async function renderSearch() {
    content.innerHTML = `<div class="card"><div class="toolbar"><input id="smartSearchInput" class="search-input" placeholder="${t('searchPlaceholder')}"><button class="btn primary" id="smartSearchButton">${t('searchNow')}</button></div><div id="searchResults"><div class="empty">${state.language === 'de' ? 'Suche nach Dateien, Aktionen, Programmen oder Zeiträumen.' : 'Search files, actions, programs or time ranges.'}</div></div></div>`;
    const run = async () => {
      const query = document.getElementById('smartSearchInput').value.trim();
      const result = unwrap(await api.search(query));
      const de = state.language === 'de';
      const total = result.timeline.length + result.versions.length + result.clipboard.length + (result.trash?.length || 0);
      let guidance = '';
      if (result.protection?.deletionQuery && result.protection.watchedFolders === 0) {
        guidance = `<div class="card search-guidance section-gap"><div class="card-header"><div><h3>${de ? 'Warum wurde die gelöschte Datei nicht gefunden?' : 'Why was the deleted file not found?'}</h3><p class="card-subtitle">${de ? 'RewindOS kann nur Dateien zurückholen, deren Ordner bereits vor dem Löschen geschützt und überwacht wurde. Aktuell ist kein Ordner geschützt.' : 'RewindOS can only restore files whose folder was protected and monitored before deletion. No folder is currently protected.'}</p></div><button class="btn primary" id="searchProtectFolder">＋ ${t('protectFolder')}</button></div></div>`;
      } else if (result.protection?.deletionQuery && result.protection.monitoringPaused) {
        guidance = `<div class="card search-guidance section-gap"><h3>${de ? 'Überwachung war pausiert' : 'Monitoring was paused'}</h3><p class="card-subtitle">${de ? 'Löschungen während einer Pause können nicht nachträglich rekonstruiert werden, wenn keine frühere Version vorhanden ist.' : 'Deletions during a pause cannot be reconstructed later unless an earlier version exists.'}</p></div>`;
      } else if (result.protection?.deletionQuery && total === 0) {
        guidance = `<div class="card search-guidance section-gap"><h3>${de ? 'Kein passender geschützter Eintrag' : 'No matching protected item'}</h3><p class="card-subtitle">${de ? 'Prüfe, ob der ursprüngliche Ordner unter Einstellungen → Überwachung geschützt ist. Der normale Windows-Papierkorb wird nicht automatisch vollständig durchsucht.' : 'Check whether the original folder is protected under Settings → Monitoring. The normal Windows Recycle Bin is not automatically searched in full.'}</p></div>`;
      }
      document.getElementById('searchResults').innerHTML = `<div class="grid stats"><div class="card stat-card"><div class="stat-label">Timeline</div><div class="stat-value">${result.timeline.length}</div></div><div class="card stat-card"><div class="stat-label">${t('vault')}</div><div class="stat-value">${result.trash?.length || 0}</div></div><div class="card stat-card"><div class="stat-label">${t('versions')}</div><div class="stat-value">${result.versions.length}</div></div><div class="card stat-card"><div class="stat-label">${t('clipboard')}</div><div class="stat-value">${result.clipboard.length}</div></div></div>${guidance}
        ${(result.trash?.length || 0) ? `<div class="card section-gap"><div class="card-header"><div><h3>${t('vault')}</h3><p class="card-subtitle">${de ? 'Gelöschte Dateien werden mit vollständigem Namen und ursprünglichem Speicherort angezeigt.' : 'Deleted files are shown with their full name and original location.'}</p></div></div><div class="list">${result.trash.map((item) => `<div class="list-item search-trash-item"><div class="list-item-main"><div class="list-item-title">${item.isDirectory ? '📁' : '🖼️'} ${escapeHtml(item.name)}</div><div class="list-item-meta code">${escapeHtml(displayPath(item.originalPath))} · ${formatBytes(item.size)} · ${formatDate(item.modifiedAt)}</div></div><div class="button-row"><button class="btn small" data-search-trash-preview="${escapeAttr(item.id)}">${t('preview')}</button><button class="btn small primary" data-search-trash-restore="${escapeAttr(item.id)}" data-search-trash-name="${escapeAttr(item.name)}" data-search-trash-path="${escapeAttr(item.originalPath)}">${t('restore')}</button></div></div>`).join('')}</div></div>` : ''}
        ${result.timeline.length ? `<div class="card section-gap"><div class="card-header"><h3>Timeline</h3></div>${renderEventRows(result.timeline)}</div>` : ''}
        ${result.versions.length ? `<div class="card section-gap"><h3>${t('versions')}</h3><div class="list section-gap">${result.versions.slice(0,100).map((item) => `<div class="list-item"><div class="list-item-main"><div class="list-item-title">${escapeHtml(displayPath(item.path))}</div><div class="list-item-meta">${item.count} ${t('versionsCount').toLowerCase()}</div></div></div>`).join('')}</div></div>` : ''}
        ${total === 0 && !guidance ? `<div class="empty section-gap">${t('noData')}</div>` : ''}`;
      const root = document.getElementById('searchResults');
      bindEventButtons(root);
      root.querySelector('#searchProtectFolder')?.addEventListener('click', chooseProtectedFolder);
      root.querySelectorAll('[data-search-trash-preview]').forEach((button) => button.addEventListener('click', async () => {
        const preview = unwrap(await api.vault.trashPreview(button.dataset.searchTrashPreview));
        const item = preview.item;
        let body = '';
        if (preview.type === 'image') body = `<img src="${preview.dataUrl}" alt="${escapeHtml(item?.name || '')}" style="max-width:100%;max-height:520px;border-radius:12px">`;
        else if (preview.type === 'text') body = `<pre class="code" style="white-space:pre-wrap;max-height:480px;overflow:auto">${escapeHtml(preview.text)}</pre>`;
        else body = `<div class="empty">${de ? 'Für diesen Dateityp ist keine Bild- oder Textvorschau verfügbar.' : 'No image or text preview is available for this file type.'}</div>`;
        openModal({ title: item?.name || t('preview'), subtitle: displayPath(item?.originalPath), wide: true, body, actions: [{ label: t('close'), handler: closeModal }] });
      }));
      root.querySelectorAll('[data-search-trash-restore]').forEach((button) => button.addEventListener('click', () => {
        const itemId = button.dataset.searchTrashRestore;
        const name = button.dataset.searchTrashName;
        const originalPath = button.dataset.searchTrashPath;
        openModal({
          title: `${t('restore')}: ${name}`,
          subtitle: de ? 'Die Datei wird an ihren ursprünglichen Speicherort zurückgeschrieben.' : 'The file will be written back to its original location.',
          body: `<div class="path-display code">${escapeHtml(displayPath(originalPath))}</div><div class="section-gap"><label class="field-label">${t('conflictRule')}</label><select id="searchTrashConflict" class="field" style="width:100%">${conflictRuleOptions(state.app.settings.undoRules.defaultConflictRule)}</select></div>`,
          actions: [
            { label: t('cancel'), handler: closeModal },
            { label: t('restore'), style: 'primary', handler: async (modal) => { const restored = unwrap(await api.vault.restoreTrash(itemId, modal.querySelector('#searchTrashConflict').value)); closeModal(); toast(`${t('success')}: ${restored.restoredPath || originalPath}`); await run(); } }
          ]
        });
      }));
    };
    document.getElementById('smartSearchButton').addEventListener('click', run);
    document.getElementById('smartSearchInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') run(); });
  }

  async function renderStatistics() {
    const stats = unwrap(await api.statistics());
    const days = Object.entries(stats.byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
    const max = Math.max(1, ...days.map(([, value]) => value));
    const successRate = stats.successRate == null ? '—' : `${Math.round(stats.successRate * 100)}%`;
    content.innerHTML = `<div class="grid stats">${statCard('▥', state.language === 'de' ? 'Alle Ereignisse' : 'All events', stats.totalEvents, '')}${statCard('↶', t('restored'), stats.restored, `${formatBytes(stats.recoveredBytes)} ${state.language==='de'?'wiederhergestellt':'recovered'}`)}${statCard('✓', state.language === 'de' ? 'Erfolgsquote' : 'Success rate', successRate, `${stats.failures} ${state.language==='de'?'Fehler':'failures'}`)}${statCard('▣', t('protectedFiles'), stats.vault.protectedFiles, `${stats.vault.versions} ${t('versionsCount').toLowerCase()}`)}${statCard('◫', t('storageUsed'), formatBytes(stats.vault.bytes), '')}</div><div class="grid two section-gap"><div class="card"><div class="card-header"><h2>${state.language === 'de' ? 'Aktivität der letzten 14 Tage' : 'Activity over the last 14 days'}</h2></div><div class="chart-bars">${days.map(([day, value]) => `<div class="chart-bar" style="height:${Math.max(4, value / max * 100)}%" title="${day}: ${value}"><span>${day.slice(5)}</span></div>`).join('')}</div></div><div class="card"><div class="card-header"><h2>${t('action')}</h2></div><div class="list">${Object.entries(stats.byAction).sort((a,b)=>b[1]-a[1]).map(([action,count])=>`<div class="status-row"><span>${escapeHtml(eventLabel(action))}</span><strong>${count}</strong></div>`).join('')}</div></div></div><div class="grid two section-gap"><div class="card"><div class="card-header"><h2>${state.language === 'de' ? 'Meistveränderte Ordner' : 'Most changed folders'}</h2></div><div class="list">${stats.topFolders.map((item)=>`<div class="list-item"><span class="code">${escapeHtml(displayPath(item.folder))}</span><strong>${item.count}</strong></div>`).join('') || `<div class="empty">${t('noData')}</div>`}</div></div><div class="card"><div class="card-header"><h2>${state.language === 'de' ? 'Häufigste Programme' : 'Top applications'}</h2></div><div class="list">${stats.topPrograms.map((item)=>`<div class="status-row"><span>${escapeHtml(item.program)}</span><strong>${item.count}</strong></div>`).join('') || `<div class="empty">${t('noData')}</div>`}</div></div></div>`;
  }

  async function renderSecurity() {
    const alerts = unwrap(await api.security.alerts());
    const settings = state.app.settings;
    const de = state.language === 'de';
    content.innerHTML = `<div class="grid stats">${statCard('⚠', de?'Offene Warnungen':'Open alerts', alerts.filter((item)=>!item.resolved).length, de?'Lokale Massenänderungserkennung':'Local mass-change detection')}${statCard('⌁', de?'Modus':'Mode', escapeHtml(settings.security.containmentMode), de?'Keine falsche Antivirus-Garantie':'No false antivirus guarantee')}${statCard('🔐', de?'Verschlüsselung':'Encryption', settings.storage.encryptionEnabled?'AES-256-GCM':(de?'Aus':'Off'), settings.privacy.databaseEncryption?(de?'Metadaten verschlüsselt':'Metadata encrypted'):(de?'Metadaten offen':'Metadata plain'))}${statCard('⏱', de?'Automatische Sperre':'Auto-lock', settings.security.lockAfterMinutes?`${settings.security.lockAfterMinutes} min`:(de?'Aus':'Off'), de?'Optionaler App-PIN':'Optional app PIN')}</div><div class="card section-gap"><div class="card-header"><div><h2>${de?'Sicherheitswarnungen':'Security alerts'}</h2><p class="card-subtitle">${de?'RewindOS kann Sicherungen anlegen, pausieren und – nur nach Freigabe – einen erkannten Prozess anhalten. Es ersetzt keinen Virenscanner.':'RewindOS can preserve versions, pause monitoring and—only when enabled—stop a detected process. It is not an antivirus.'}</p></div><button class="btn warning" id="securityEmergency">⚡ ${t('emergency')}</button></div>${alerts.length?`<div class="list">${alerts.map((alert)=>`<div class="list-item"><div class="list-item-main"><div class="list-item-title">${escapeHtml(alert.program||alert.executable||t('unknown'))} · ${Number(alert.count||0)} ${de?'Änderungen':'changes'}</div><div class="list-item-meta">${formatDate(alert.timestamp)} · PID ${escapeHtml(alert.pid||'—')} · ${alert.resolved?(de?'Erledigt':'Resolved'):(de?'Offen':'Open')}</div></div><div class="button-row">${!alert.resolved?`<button class="btn small" data-security-action="snapshot" data-alert-id="${escapeAttr(alert.id)}">${de?'Zusätzlich sichern':'Snapshot'}</button><button class="btn small warning" data-security-action="pause" data-alert-id="${escapeAttr(alert.id)}">${de?'Pausieren':'Pause'}</button>${settings.security.allowProcessTermination&&alert.pid?`<button class="btn small danger" data-security-action="terminate-process" data-alert-id="${escapeAttr(alert.id)}">${de?'Prozess beenden':'Terminate process'}</button>`:''}<button class="btn small" data-security-action="dismiss" data-alert-id="${escapeAttr(alert.id)}">${de?'Schließen':'Dismiss'}</button>`:''}</div></div>`).join('')}</div>`:`<div class="empty">${de?'Keine Sicherheitswarnungen vorhanden.':'No security alerts.'}</div>`}</div>`;
    document.getElementById('securityEmergency').addEventListener('click', runEmergency);
    content.querySelectorAll('[data-security-action]').forEach((button)=>button.addEventListener('click',async()=>{unwrap(await api.security.respond(button.dataset.alertId,button.dataset.securityAction));toast(t('success'));renderSecurity();}));
  }

  async function renderDiagnostics() {
    const data = unwrap(await api.diagnostics.get());
    content.innerHTML = `<div class="grid stats">${statCard('◇', t('health'), data.healthy ? 'OK' : t('warning'), `${data.issues.length} issues`)}${statCard('▣', t('protectedFiles'), data.vault.protectedFiles, `${data.vault.versions} versions`)}${statCard('◫', 'RAM', formatBytes(data.freeMemory), `${formatBytes(data.totalMemory)} total`)}${statCard('⌘', data.platform, data.arch, data.runtime?.electron ? `Electron ${data.runtime.electron}` : `Node ${data.runtime?.node || '—'}`)}</div><div class="grid two section-gap"><div class="card"><div class="card-header"><div><h2>${t('capability')}</h2><p class="card-subtitle">${state.language === 'de' ? 'Transparente Angaben zu Plattformgrenzen' : 'Transparent platform limitations'}</p></div></div><div class="list">${Object.entries(data.capabilities).map(([key,value])=>`<div class="status-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(typeof value === 'boolean' ? (value ? '✓' : '—') : value)}</strong></div>`).join('')}</div></div><div class="card"><div class="card-header"><div><h2>${state.language === 'de' ? 'Prüfungen' : 'Checks'}</h2></div><div class="button-row"><button class="btn" id="integrityButton">${t('integrityScan')}</button><button class="btn" id="repairIntegrityButton">${state.language==='de'?'Berechtigungen reparieren':'Repair permissions'}</button><button class="btn" id="cleanupButton">${t('cleanup')}</button></div></div><div id="diagnosticIssues">${data.issues.length ? `<div class="list">${data.issues.map((issue)=>`<div class="list-item"><div class="list-item-main"><div class="list-item-title">${escapeHtml(issue.code)}</div><div class="list-item-meta code">${escapeHtml(issue.path || '')}</div></div><span class="action-badge ${issue.severity === 'critical' ? 'deleted' : 'modified'}">${escapeHtml(issue.severity)}</span></div>`).join('')}</div>` : `<div class="empty">${state.language === 'de' ? 'Keine kritischen Probleme erkannt.' : 'No critical issues detected.'}</div>`}</div></div></div><div class="card section-gap"><div class="card-header"><h2>${state.language === 'de' ? 'Werkzeuge' : 'Tools'}</h2></div><div class="button-row"><button class="btn" id="mirrorButton">${t('mirror')}</button><button class="btn" id="openDataButton">${t('openData')}</button><button class="btn" id="offlineRescueButton">${t('offlineRescue')}</button><button class="btn" id="exportArchiveButton">${state.language==='de'?'Komplettes Archiv exportieren':'Export complete archive'}</button><button class="btn" id="recoveryBundleButton">${state.language==='de'?'Wiederherstellungspaket erstellen':'Create recovery bundle'}</button><button class="btn" id="restoreBundleButton">${state.language==='de'?'Wiederherstellungspaket einspielen':'Restore recovery bundle'}</button><button class="btn" id="importSettingsButton">${state.language==='de'?'Einstellungen importieren':'Import settings'}</button></div></div>`;
    document.getElementById('integrityButton').addEventListener('click', async () => { const result = unwrap(await api.integrity.scan(true)); toast(`${t('integrityHealthy')} ${result.healthy}/${result.checked}`); renderDiagnostics(); });
    document.getElementById('cleanupButton').addEventListener('click', async () => { const result = unwrap(await api.retention.cleanup()); toast(`${t('success')}: ${result.removedVersions}`); renderDiagnostics(); });
    document.getElementById('mirrorButton').addEventListener('click', runMirror);
    document.getElementById('repairIntegrityButton')?.addEventListener('click', async () => { const result = unwrap(await api.integrity.repair({ removeOrphans: false, tightenPermissions: true })); toast(`${t('success')}: ${result.actions.length}`); renderDiagnostics(); });
    document.getElementById('openDataButton').addEventListener('click', () => api.app.openDataFolder());
    document.getElementById('offlineRescueButton').addEventListener('click', createOfflineRescue);
    document.getElementById('exportArchiveButton').addEventListener('click', exportArchive);
    document.getElementById('recoveryBundleButton').addEventListener('click', createRecoveryBundle);
    document.getElementById('restoreBundleButton').addEventListener('click', restoreRecoveryBundle);
    document.getElementById('importSettingsButton').addEventListener('click', importSettings);
  }

  function toggleHtml(id, checked, settingPath = '') {
    return `<label class="switch"><input type="checkbox" id="${escapeAttr(id)}" ${settingPath ? `data-setting="${escapeAttr(settingPath)}"` : ''} ${checked ? 'checked' : ''}><span class="slider"></span></label>`;
  }

  const HOTKEY_DEFAULTS = Object.freeze({
    undoLast: 'CommandOrControl+Alt+Z', openTimeline: 'CommandOrControl+Alt+T', createCheckpoint: 'CommandOrControl+Alt+S',
    pauseMonitoring: 'CommandOrControl+Alt+P', openClipboard: 'CommandOrControl+Alt+C', emergencySnapshot: 'CommandOrControl+Alt+E'
  });

  function hotkeyLabel(key) {
    const labels = {
      undoLast: { de: 'Letzte Aktion rückgängig', en: 'Undo last action' },
      openTimeline: { de: 'Aktivitäts-Timeline öffnen', en: 'Open activity timeline' },
      createCheckpoint: { de: 'Zeitpunkt erstellen', en: 'Create checkpoint' },
      pauseMonitoring: { de: 'Überwachung pausieren oder fortsetzen', en: 'Pause or resume monitoring' },
      openClipboard: { de: 'Zwischenablage öffnen', en: 'Open clipboard' },
      emergencySnapshot: { de: 'Notfall-Sicherung erstellen', en: 'Create emergency snapshot' }
    };
    return labels[key]?.[state.language] || key;
  }

  function acceleratorParts(value) {
    return String(value || '').split('+').map((part) => part.trim()).filter(Boolean).map((part) => {
      if (part === 'CommandOrControl') return navigator.platform.toLowerCase().includes('mac') ? '⌘' : (state.language === 'de' ? 'Strg' : 'Ctrl');
      if (part === 'Control' || part === 'Ctrl') return state.language === 'de' ? 'Strg' : 'Ctrl';
      if (part === 'Command') return '⌘';
      if (part === 'Super') return 'Win';
      if (part === 'Alt') return 'Alt';
      if (part === 'Shift') return state.language === 'de' ? 'Umschalt' : 'Shift';
      return part.replace(/^Key/, '').toUpperCase();
    });
  }

  function hotkeyDisplay(value) {
    return `<span class="hotkey-display">${acceleratorParts(value).map((part) => `<kbd>${escapeHtml(part)}</kbd>`).join('')}</span>`;
  }

  function keyEventToAccelerator(event) {
    const modifiers = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('CommandOrControl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    const modifierOnly = new Set(['Control', 'Shift', 'Alt', 'Meta']);
    if (modifierOnly.has(event.key)) return null;
    if (!modifiers.length) throw new Error(state.language === 'de' ? 'Verwende mindestens Strg, Alt oder Umschalt zusammen mit einer Taste.' : 'Use at least Ctrl, Alt or Shift together with a key.');
    const aliases = { ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Escape: 'Esc', '+': 'Plus', '-': '-', ',': ',', '.': '.', '/': '/', ';': ';', "'": "'", '[': '[', ']': ']', '\\': '\\' };
    let key = aliases[event.key] || event.key;
    if (/^[a-z]$/i.test(key)) key = key.toUpperCase();
    if (!/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space|Tab|Enter|Esc|Up|Down|Left|Right|Home|End|PageUp|PageDown|Insert|Delete|Backspace|Plus|[-,./;'\[\]\\])$/.test(key)) {
      throw new Error(state.language === 'de' ? 'Diese Taste wird als globales Tastenkürzel nicht unterstützt.' : 'This key is not supported as a global shortcut.');
    }
    return [...new Set(modifiers), key].join('+');
  }

  function showHotkeyEditor(key) {
    const de = state.language === 'de';
    let candidate = state.app.settings.hotkeys[key] || HOTKEY_DEFAULTS[key];
    openModal({
      title: hotkeyLabel(key),
      subtitle: de ? 'Drücke jetzt die gewünschte Tastenkombination. Sie wird erst nach „Speichern“ übernommen.' : 'Press the desired key combination. It is applied only after Save.',
      body: `<div id="hotkeyCapture" class="hotkey-capture recording" tabindex="0"><div><div class="muted">${de ? 'Neue Kombination drücken' : 'Press new combination'}</div><div id="hotkeyCandidate" class="section-gap">${hotkeyDisplay(candidate)}</div><p id="hotkeyCaptureError" class="muted" style="color:var(--danger);min-height:1.4em"></p></div></div>`,
      actions: [
        { label: t('cancel'), handler: closeModal },
        { label: de ? 'Standard' : 'Default', handler: (modal) => { candidate = HOTKEY_DEFAULTS[key]; modal.querySelector('#hotkeyCandidate').innerHTML = hotkeyDisplay(candidate); modal.querySelector('#hotkeyCaptureError').textContent = ''; modal.querySelector('#hotkeyCapture').focus(); } },
        { label: t('save'), style: 'primary', handler: async () => {
          const duplicate = Object.entries(state.app.settings.hotkeys).find(([otherKey, value]) => otherKey !== key && value === candidate);
          if (duplicate) throw new Error(de ? `Diese Kombination wird bereits für „${hotkeyLabel(duplicate[0])}“ verwendet.` : `This combination is already used for “${hotkeyLabel(duplicate[0])}”.`);
          unwrap(await api.settings.update({ hotkeys: { [key]: candidate } }));
          closeModal(); await refreshState(); toast(t('success')); await renderSettings();
        } }
      ],
      onOpen: (modal) => {
        const capture = modal.querySelector('#hotkeyCapture');
        capture.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') return;
          event.preventDefault(); event.stopPropagation();
          try {
            const next = keyEventToAccelerator(event);
            if (!next) return;
            candidate = next;
            modal.querySelector('#hotkeyCandidate').innerHTML = hotkeyDisplay(candidate);
            modal.querySelector('#hotkeyCaptureError').textContent = '';
          } catch (error) { modal.querySelector('#hotkeyCaptureError').textContent = error.message; }
        });
        capture.focus();
      }
    });
  }

  function settingRow(title, description, control) {
    return `<div class="setting-row"><div class="setting-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></div>${control}</div>`;
  }

  async function renderSettings() {
    await refreshState();
    try { state.mirrorStatus = unwrap(await api.mirror.status()); } catch { state.mirrorStatus = { hasStoredPassphrase: false }; }
    try { state.fileManagerStatus = unwrap(await api.integration.status()); } catch { state.fileManagerStatus = { supported: false, installed: false }; }
    const tabs = ['general','appearance','storage','monitoring','undoRules','workspaces','privacy','security','notifications','hotkeys','accessibility','performance','importExport'];
    content.innerHTML = `<div class="settings-layout"><div class="card settings-tabs">${tabs.map((tab)=>`<button class="settings-tab ${state.settingsTab===tab?'active':''}" data-settings-tab="${escapeAttr(tab)}">${t(tab)}</button>`).join('')}</div><div class="card"><div id="settingsPanel">${settingsPanel(state.settingsTab)}</div><div class="button-row section-gap"><button class="btn primary" id="saveSettingsButton">${t('save')}</button>${state.settingsTab === 'storage' ? `<button class="btn" id="exportSettingsButton">${t('exportSettings')}</button>` : ''}</div></div></div>`;
    content.querySelectorAll('[data-settings-tab]').forEach((button)=>button.addEventListener('click',()=>{state.settingsTab=button.dataset.settingsTab;renderSettings();}));
    document.getElementById('saveSettingsButton').addEventListener('click', saveVisibleSettings);
    document.getElementById('exportSettingsButton')?.addEventListener('click', exportSettings);
    bindSettingFolderButtons();
    document.getElementById('configurePinButton')?.addEventListener('click', showPinSetup);
    document.getElementById('manageTrashRulesButton')?.addEventListener('click', showTrashRules);
    document.getElementById('resetSettingsButton')?.addEventListener('click', resetSettings);
    document.getElementById('migrateVaultButton')?.addEventListener('click', migrateVault);
    document.getElementById('settingsExportNow')?.addEventListener('click', exportSettings);
    document.getElementById('settingsImportNow')?.addEventListener('click', importSettings);
    document.getElementById('settingsRecoveryNow')?.addEventListener('click', createRecoveryBundle);
    document.getElementById('settingsRestoreNow')?.addEventListener('click', restoreRecoveryBundle);
    document.getElementById('checkUpdatesNow')?.addEventListener('click', checkForUpdates);
    document.getElementById('fileManagerIntegrationButton')?.addEventListener('click', changeFileManagerIntegration);
    document.getElementById('clearMirrorCredentialButton')?.addEventListener('click', async () => { unwrap(await api.mirror.clearCredential()); state.mirrorStatus = { hasStoredPassphrase: false }; toast(t('success')); renderSettings(); });
    content.querySelectorAll('[data-edit-hotkey]').forEach((button) => button.addEventListener('click', () => showHotkeyEditor(button.dataset.editHotkey)));
  }

  function settingsPanel(tab) {
    const s = state.app.settings;
    const de = state.language === 'de';
    const yesNo = (value, id, setting) => toggleHtml(id, Boolean(value), setting);
    const lines = (value) => escapeHtml((value || []).join('\n'));
    const csv = (value) => escapeHtml((value || []).join(', '));
    if (tab === 'general') return `
      ${settingRow(t('language'), de?'Alle Texte, Pop-ups und Meldungen vollständig umstellen.':'Switch all text, popups and messages.', `<select data-setting="language"><option value="de" ${s.language==='de'?'selected':''}>Deutsch</option><option value="en" ${s.language==='en'?'selected':''}>English</option></select>`)}
      ${settingRow(t('launchAtStartup'), de?'RewindOS automatisch bei der Anmeldung öffnen.':'Open RewindOS automatically after sign-in.', yesNo(s.general.launchAtStartup,'launchAtStartup','general.launchAtStartup'))}
      ${settingRow(t('startBackground'), de?'Ohne sichtbares Hauptfenster starten.':'Start without showing the main window.', yesNo(s.general.startInBackground,'startBackground','general.startInBackground'))}
      ${settingRow(t('closeToTray'), de?'Beim Schließen im Infobereich weiter schützen.':'Continue protecting in the system tray after closing.', yesNo(s.general.closeToTray,'closeToTray','general.closeToTray'))}
      ${settingRow(de?'Infobereich-Symbol':'Tray icon', de?'Schnellzugriff auf Timeline, Notfall-Sicherung und Beenden.':'Quick access to timeline, emergency snapshot and quit.', yesNo(s.general.trayIcon,'trayIcon','general.trayIcon'))}
      ${settingRow(de?'Startseite':'Home page', de?'Bereich, der nach dem Start geöffnet wird.':'Page opened at startup.', `<select data-setting="general.homePage">${['dashboard','timeline','checkpoints','vault','versions','clipboard','workspaces','projects','profiles','search','security','statistics','diagnostics'].map((page)=>`<option value="${page}" ${s.general.homePage===page?'selected':''}>${t(page)}</option>`).join('')}</select>`)}
      ${settingRow(de?'Im Vollbildmodus ruhig bleiben':'Stay quiet in fullscreen', de?'Unterdrückt Systemmeldungen bei Spielen und Videos.':'Suppress system notices during games and videos.', yesNo(s.general.quietFullscreen,'quietFullscreen','general.quietFullscreen'))}
      ${settingRow(t('notificationsEnabled'), de?'Lokale Systembenachrichtigungen erlauben.':'Allow local system notifications.', yesNo(s.general.notifications,'notificationsEnabled','general.notifications'))}
      ${settingRow(de?'Explorer-/Dateimanager-Menü':'Explorer/file-manager menu', de?'Fügt einen ausdrücklich bestätigten Befehl „Mit RewindOS schützen“ für Ordner hinzu.':'Adds an explicitly confirmed “Protect with RewindOS” command for folders.', state.fileManagerStatus.supported ? `<div class="button-row"><strong>${state.fileManagerStatus.installed ? (de?'Installiert':'Installed') : (de?'Nicht installiert':'Not installed')}</strong><button class="btn" id="fileManagerIntegrationButton">${state.fileManagerStatus.installed ? t('remove') : (de?'Installieren':'Install')}</button></div>` : `<span>${t('notAvailable')}</span>`)}
      <div class="section-gap button-row"><button class="btn danger" id="resetSettingsButton">${de?'Einstellungen zurücksetzen':'Reset settings'}</button></div>`;
    if (tab === 'appearance') return `
      ${settingRow(t('theme'), de?'Dunkel, hell oder Betriebssystem übernehmen.':'Dark, light or follow the operating system.', `<select data-setting="appearance.theme"><option value="system" ${s.appearance.theme==='system'?'selected':''}>${t('system')}</option><option value="dark" ${s.appearance.theme==='dark'?'selected':''}>${t('dark')}</option><option value="light" ${s.appearance.theme==='light'?'selected':''}>${t('light')}</option></select>`)}
      ${settingRow(de?'Akzentfarbe':'Accent color', de?'Hauptfarbe der Oberfläche.':'Primary interface color.', `<input type="color" data-setting="appearance.accent" value="${escapeHtml(s.appearance.accent)}">`)}
      ${settingRow(t('animations'), de?'Weiche Pop-ups und Übergänge.':'Smooth popups and transitions.', yesNo(s.appearance.animations,'animations','appearance.animations'))}
      ${settingRow(t('transparency'), de?'Transparente Karten und Hintergrundeffekte.':'Transparent cards and background effects.', yesNo(s.appearance.transparency,'transparency','appearance.transparency'))}
      ${settingRow(de?'Kompakte Ansicht':'Compact view', de?'Mehr Einträge mit weniger Abstand anzeigen.':'Show more items with less spacing.', yesNo(s.appearance.compact,'compactView','appearance.compact'))}
      ${settingRow(t('highContrast'), de?'Deutlichere Trennlinien und Texte.':'Stronger borders and text contrast.', yesNo(s.appearance.highContrast,'highContrast','appearance.highContrast'))}
      ${settingRow(t('reducedMotion'), de?'Animationen und Bewegungen reduzieren.':'Reduce animations and motion.', yesNo(s.appearance.reducedMotion,'reducedMotion','appearance.reducedMotion'))}
      ${settingRow(de?'Schriftgröße':'Font size', de?'Skalierung der gesamten Oberfläche.':'Scale the complete interface.', `<input type="range" min="0.85" max="1.35" step="0.05" data-setting="appearance.fontScale" value="${s.appearance.fontScale}">`)}
      ${settingRow(de?'Timeline-Dichte':'Timeline density', de?'Bequem, kompakt oder sehr kompakt.':'Comfortable, compact or dense.', `<select data-setting="appearance.timelineDensity"><option value="comfortable" ${s.appearance.timelineDensity==='comfortable'?'selected':''}>${de?'Bequem':'Comfortable'}</option><option value="compact" ${s.appearance.timelineDensity==='compact'?'selected':''}>${de?'Kompakt':'Compact'}</option><option value="dense" ${s.appearance.timelineDensity==='dense'?'selected':''}>${de?'Dicht':'Dense'}</option></select>`)}`;
    if (tab === 'storage') return `
      <div class="setting-row setting-row-stack"><div class="setting-copy"><strong>${de?'Speicherort der Sicherungen':'Backup storage location'}</strong><span>${de?'Kann sicher auf einen anderen lokalen Datenträger verschoben werden; danach ist ein Neustart erforderlich.':'Can be safely moved to another local drive; restart is required afterward.'}</span></div><div class="path-picker-row"><div class="path-display code" title="${escapeAttr(s.storage.vaultPath)}">${escapeHtml(s.storage.vaultPath)}</div><button class="btn" id="migrateVaultButton">${de?'Verschieben':'Move'}</button></div></div>
      ${settingRow(t('encryption'), de?'AES-256-GCM für gespeicherte Dateiinhalte.':'AES-256-GCM for stored file content.', yesNo(s.storage.encryptionEnabled,'encryption','storage.encryptionEnabled'))}
      ${settingRow(de?'Komprimierung':'Compression', de?'Vor der Verschlüsselung platzsparend komprimieren.':'Compress before encryption to save space.', yesNo(s.storage.compression,'compression','storage.compression'))}
      ${settingRow(t('autoCleanup'), de?'Alte, nicht favorisierte Versionen automatisch bereinigen.':'Automatically clean old non-favorite versions.', yesNo(s.storage.autoCleanup,'autoCleanup','storage.autoCleanup'))}
      ${settingRow(t('maxStorage'), de?'Gesamtes lokales Speicherlimit.':'Total local storage limit.', `<input class="field" type="number" min="1" data-setting="storage.maxVaultBytes" data-transform="gb" value="${Math.round(s.storage.maxVaultBytes/1073741824)}">`)}
      ${settingRow(de?'Freier Speicher reservieren (GB)':'Reserve free storage (GB)', de?'RewindOS stoppt neue Kopien, bevor das Laufwerk voll wird.':'RewindOS stops new copies before the drive becomes full.', `<input class="field" type="number" min="0" data-setting="storage.reserveBytes" data-transform="gb" value="${Math.round(s.storage.reserveBytes/1073741824)}">`)}
      ${settingRow(t('retentionDays'), de?'Globale Standardfrist.':'Global default retention.', `<input class="field" type="number" min="1" data-setting="storage.retentionDays" value="${s.storage.retentionDays}">`)}
      ${settingRow(de?'Maximale Versionen pro Datei':'Maximum versions per file', de?'Standardwert, sofern kein Schutzprofil greift.':'Default unless a protection profile applies.', `<input class="field" type="number" min="1" data-setting="storage.maxVersionsPerFile" value="${s.storage.maxVersionsPerFile}">`)}
      ${settingRow(de?'Sichere Löschablage in Tagen':'Protected trash days', de?'Standardfrist für die App-eigene Löschablage.':'Default retention for protected trash.', `<input class="field" type="number" min="1" data-setting="storage.trashRetentionDays" value="${s.storage.trashRetentionDays || 30}">`)}
      ${settingRow(de?'Eigene Löschregeln':'Custom trash rules', de?'Unterschiedliche Fristen für bestimmte Ordner.':'Different retention periods for selected folders.', `<button class="btn" id="manageTrashRulesButton">${(s.customTrashRules||[]).length} ${de?'Regeln':'rules'}</button>`)}
      ${settingRow(t('maxFileSize'), de?'Größere Dateien werden protokolliert, aber nicht kopiert.':'Larger files are logged but not copied.', `<input class="field" type="number" min="1" data-setting="storage.maxFileBytes" data-transform="mb" value="${Math.round(s.storage.maxFileBytes/1048576)}">`)}
      ${settingRow(de?'Favoriten niemals automatisch löschen':'Never auto-delete favorites', de?'Geschützte Versionen bleiben unabhängig von der Frist erhalten.':'Protected versions survive retention cleanup.', yesNo(s.storage.keepFavoriteForever,'keepFavoriteForever','storage.keepFavoriteForever'))}
      ${settingRow(t('mirrorBackup'), de?'Sicherungen zusätzlich auf einen zweiten Datenträger kopieren.':'Copy backups to a second local drive.', yesNo(s.storage.mirrorEnabled,'mirrorEnabled','storage.mirrorEnabled'))}
      ${settingRow(t('mirrorPath'), de?'Externe Festplatte oder lokaler Zielordner.':'External drive or local destination.', `<div class="button-row"><input class="field code" id="mirrorPathInput" data-setting="storage.mirrorPath" value="${escapeHtml(s.storage.mirrorPath)}"><button class="btn" data-choose-setting-folder="mirrorPathInput">…</button></div>`)}
      ${settingRow(de?'Spiegelungsintervall in Stunden':'Mirror interval in hours', de?'Wird automatisch ausgeführt, wenn ein Passwort sicher gespeichert wurde.':'Runs automatically when a passphrase has been stored securely.', `<input class="field" type="number" min="1" max="8760" data-setting="storage.mirrorIntervalHours" value="${s.storage.mirrorIntervalHours}">`)}
      ${settingRow(de?'Beim Beenden spiegeln':'Mirror on exit', de?'Erstellt beim vollständigen Beenden eine letzte verschlüsselte Spiegelung.':'Creates one final encrypted mirror when fully quitting.', yesNo(s.storage.mirrorOnExit,'mirrorOnExit','storage.mirrorOnExit'))}
      ${settingRow(de?'Gespeichertes Spiegelungspasswort':'Stored mirror passphrase', state.mirrorStatus?.hasStoredPassphrase ? (de?'Verschlüsselt im lokalen RewindOS-Konfigurationsbereich gespeichert.':'Stored encrypted in the local RewindOS configuration area.') : (de?'Nicht gespeichert; automatische Spiegelungen bleiben aus.':'Not stored; automatic mirrors remain disabled.'), state.mirrorStatus?.hasStoredPassphrase ? `<button class="btn danger" id="clearMirrorCredentialButton">${de?'Entfernen':'Remove'}</button>` : `<span class="muted">—</span>`)}
      ${settingRow(de?'Tragbarer Modus':'Portable mode', de?'Wird ausschließlich durch die portable EXE oder den Startparameter aktiviert; ein Umschalten während des Betriebs wäre unsicher.':'Enabled only by the portable executable or launch flag; changing it while running would be unsafe.', `<strong>${s.storage.portableMode ? (de?'Aktiv':'Active') : (de?'Nicht aktiv':'Inactive')}</strong>`)}`;
    if (tab === 'monitoring') return `
      ${settingRow(de?'Überwachung aktiv':'Monitoring enabled', de?'Gesamten lokalen Dateischutz ein- oder ausschalten.':'Enable or disable local file protection.', yesNo(s.monitoring.enabled,'monitoringEnabled','monitoring.enabled'))}
      ${settingRow(t('snapshotExisting'), de?'Beim ersten Schutz eine sichere Ausgangsversion erstellen.':'Create a baseline when protection starts.', yesNo(s.monitoring.snapshotExistingFilesOnStart,'snapshotExisting','monitoring.snapshotExistingFilesOnStart'))}
      ${settingRow(t('includeHidden'), de?'Versteckte Dateien können sensible Daten enthalten.':'Hidden files can contain sensitive data.', yesNo(s.monitoring.includeHidden,'includeHidden','monitoring.includeHidden'))}
      ${settingRow(de?'Systemdateien einbeziehen':'Include system files', de?'Nur für erfahrene Nutzer empfohlen.':'Recommended for advanced users only.', yesNo(s.monitoring.includeSystem,'includeSystem','monitoring.includeSystem'))}
      ${settingRow(de?'Wechselmedien überwachen':'Monitor removable drives', de?'USB-Sticks und externe Laufwerke erlauben.':'Allow USB and external drives.', yesNo(s.monitoring.includeRemovable,'includeRemovable','monitoring.includeRemovable'))}
      ${settingRow(de?'Netzlaufwerke überwachen':'Monitor network drives', de?'Kann je nach Verbindung unzuverlässiger sein.':'May be less reliable depending on the connection.', yesNo(s.monitoring.includeNetwork,'includeNetwork','monitoring.includeNetwork'))}
      ${settingRow(t('healthChecks'), de?'Leere, stark verkleinerte oder fehlende Dateien erkennen.':'Detect empty, heavily reduced or missing files.', yesNo(s.monitoring.healthChecks,'healthChecks','monitoring.healthChecks'))}
      ${settingRow(t('adaptive'), de?'Wichtige und häufig veränderte Dateien häufiger sichern.':'Protect important and frequently changed files more often.', yesNo(s.monitoring.adaptiveVersioning,'adaptive','monitoring.adaptiveVersioning'))}
      ${settingRow(t('massThreshold'), de?'Anzahl schneller Änderungen bis zur Warnung.':'Rapid changes before a warning.', `<input class="field" type="number" min="5" data-setting="monitoring.suspiciousEventThreshold" value="${s.monitoring.suspiciousEventThreshold}">`)}
      ${settingRow(de?'Erkennungszeitraum in Sekunden':'Detection window in seconds', de?'Zeitfenster für Massenänderungen.':'Time window for mass-change detection.', `<input class="field" type="number" min="1" data-setting="monitoring.suspiciousWindowMs" data-transform="seconds" value="${Math.round(s.monitoring.suspiciousWindowMs/1000)}">`)}
      ${settingRow(de?'Reaktionsverzögerung in Millisekunden':'Debounce in milliseconds', de?'Wartet kurz, bis ein Schreibvorgang abgeschlossen ist.':'Wait briefly for a write operation to finish.', `<input class="field" type="number" min="100" data-setting="monitoring.debounceMs" value="${s.monitoring.debounceMs}">`)}
      ${settingRow(de?'Bei verdächtiger Aktivität automatisch pausieren':'Auto-pause on suspicious activity', de?'Stoppt die Überwachung nach einer Warnung, bis du sie bewusst fortsetzt.':'Stops monitoring after an alert until you explicitly resume it.', yesNo(s.monitoring.autoPauseOnSuspicious,'autoPauseOnSuspicious','monitoring.autoPauseOnSuspicious'))}
      ${settingRow(de?'Stabile Leseversuche':'Stable read retries', de?'Wiederholt das Lesen während eine Anwendung noch schreibt.':'Retries reading while an application is still writing.', `<input class="field" type="number" min="1" max="10" data-setting="monitoring.stableReadRetries" value="${s.monitoring.stableReadRetries}">`)}
      ${settingRow(de?'Pause zwischen Leseversuchen (ms)':'Delay between read retries (ms)', de?'Kurze Wartezeit zur Vermeidung halbfertiger Sicherungen.':'Short delay to avoid incomplete snapshots.', `<input class="field" type="number" min="25" max="5000" data-setting="monitoring.stableReadDelayMs" value="${s.monitoring.stableReadDelayMs}">`)}
      ${settingRow(de?'Ausgeschlossene Ordner':'Excluded folders', de?'Ein Ordner pro Zeile.':'One folder per line.', `<textarea class="field code" data-setting="monitoring.excludedFolders" data-transform="lines" style="width:100%;min-height:100px">${lines(s.monitoring.excludedFolders)}</textarea>`)}
      ${settingRow(de?'Ausgeschlossene Dateitypen':'Excluded file types', de?'Kommagetrennt, zum Beispiel .tmp, .part.':'Comma-separated, for example .tmp, .part.', `<input class="field code" data-setting="monitoring.excludedExtensions" data-transform="csv" value="${csv(s.monitoring.excludedExtensions)}">`)}
      ${settingRow(de?'Ausgeschlossene Programme':'Excluded programs', de?'Änderungen dieser Programme werden nicht gespeichert.':'Changes attributed to these programs are not stored.', `<input class="field code" data-setting="monitoring.excludedPrograms" data-transform="csv" value="${csv(s.monitoring.excludedPrograms)}">`)}
      <div class="section-gap"><h3>${t('selectedFolders')}</h3><div class="list section-gap">${s.monitoring.watchedFolders.map((folder)=>`<div class="list-item"><span class="code">${escapeHtml(folder)}</span><button class="btn small danger" data-remove-watch-folder="${escapeAttr(folder)}">${t('remove')}</button></div>`).join('') || `<div class="empty">${t('noData')}</div>`}</div><button class="btn section-gap" id="settingsAddFolder">＋ ${t('protectFolder')}</button></div>`;
    if (tab === 'undoRules') return `
      ${settingRow(t('undoCreate'), de?'Neu erstellte Dateien in die geschützte Ablage verschieben.':'Move newly created files to protected trash.', yesNo(s.undoRules.create,'undoCreate','undoRules.create'))}
      ${settingRow(t('undoDelete'), de?'Gelöschte Dateien aus ihrer letzten Version zurückholen.':'Restore deleted files from their latest version.', yesNo(s.undoRules.delete,'undoDelete','undoRules.delete'))}
      ${settingRow(t('undoModify'), de?'Vorherige Dateiversionen wiederherstellen.':'Restore previous file versions.', yesNo(s.undoRules.modify,'undoModify','undoRules.modify'))}
      ${settingRow(de?'Umbenennen rückgängig':'Undo rename', de?'Erkannte Umbenennungen zurücksetzen.':'Reverse detected renames.', yesNo(s.undoRules.rename,'undoRename','undoRules.rename'))}
      ${settingRow(de?'Verschieben rückgängig':'Undo move', de?'Erkannte Verschiebungen zurücksetzen.':'Reverse detected moves.', yesNo(s.undoRules.move,'undoMove','undoRules.move'))}
      ${settingRow(de?'Kopieren rückgängig':'Undo copy', de?'Erkannte Kopien in die sichere Ablage verschieben.':'Move detected copies to protected trash.', yesNo(s.undoRules.copy,'undoCopy','undoRules.copy'))}
      ${settingRow(t('undoMass'), de?'Zusammenhängende Änderungen als eine Kette behandeln.':'Treat connected changes as one undo chain.', yesNo(s.undoRules.massActions,'undoMass','undoRules.massActions'))}
      ${settingRow(de?'Zwischenablage schützen':'Protect clipboard', de?'Zwischenablage-Einträge in der lokalen Chronik verwalten.':'Manage clipboard entries in the local history.', yesNo(s.undoRules.clipboard,'undoClipboard','undoRules.clipboard'))}
      ${settingRow(de?'Arbeitsbereiche wiederherstellen':'Restore workspaces', de?'Programme und Fenster bestmöglich erneut öffnen.':'Reopen apps and windows on a best-effort basis.', yesNo(s.undoRules.workspace,'undoWorkspace','undoRules.workspace'))}
      ${settingRow(de?'Einstellungsänderungen sichern':'Protect setting changes', de?'Importierte und geänderte RewindOS-Einstellungen nachvollziehen.':'Track imported and changed RewindOS settings.', yesNo(s.undoRules.settings,'undoSettings','undoRules.settings'))}
      ${settingRow(t('dryRunDefault'), de?'Vorher exakt anzeigen, was geändert würde.':'Show exactly what would change first.', yesNo(s.undoRules.dryRunByDefault,'dryRunDefault','undoRules.dryRunByDefault'))}
      ${settingRow(t('testRestoreDefault'), de?'Wiederherstellung zunächst getrennt prüfen.':'Test restoration in a separate folder first.', yesNo(s.undoRules.testRestoreFirst,'testRestoreDefault','undoRules.testRestoreFirst'))}
      ${settingRow(t('conflictRule'), de?'Verhalten, wenn die Zieldatei bereits existiert.':'Behavior when the destination already exists.', `<select data-setting="undoRules.defaultConflictRule"><option value="rename" ${s.undoRules.defaultConflictRule==='rename'?'selected':''}>${t('rename')}</option><option value="replace" ${s.undoRules.defaultConflictRule==='replace'?'selected':''}>${t('replace')}</option><option value="keep-newer" ${s.undoRules.defaultConflictRule==='keep-newer'?'selected':''}>${t('keepNewer')}</option><option value="keep-older" ${s.undoRules.defaultConflictRule==='keep-older'?'selected':''}>${t('keepOlder')}</option></select>`)}`;
    if (tab === 'workspaces') return `
      ${settingRow(de?'Desktop-Screenshot aufnehmen':'Capture desktop screenshot', de?'Screenshots werden lokal verschlüsselt gespeichert und nur für die Vorschau entschlüsselt.':'Screenshots are encrypted locally and decrypted only for preview.', yesNo(s.workspace.includeScreenshot,'workspaceScreenshot','workspace.includeScreenshot'))}
      ${settingRow(de?'Zwischenablage in Arbeitsbereiche aufnehmen':'Include clipboard in workspaces', de?'Speichert den aktuellen lokalen Zwischenablagezustand zusammen mit Fenstern und Programmen.':'Stores the current local clipboard state with windows and apps.', yesNo(s.workspace.includeClipboard,'workspaceClipboard','workspace.includeClipboard'))}
      ${settingRow(de?'Zwischenablage bei Wiederherstellung setzen':'Restore clipboard with workspace', de?'Kann beim Öffnen eines Arbeitsbereichs den damaligen Inhalt wieder in die Zwischenablage kopieren.':'Can copy the captured content back to the clipboard when restoring a workspace.', yesNo(s.workspace.restoreClipboard,'workspaceRestoreClipboard','workspace.restoreClipboard'))}
      ${settingRow(de?'Fensterpositionen wiederherstellen':'Restore window positions', de?'Bestmöglich und abhängig von Windows, Linux, Wayland/X11 und der jeweiligen Anwendung.':'Best effort and dependent on Windows, Linux, Wayland/X11 and each application.', yesNo(s.workspace.restoreWindowPositions,'workspacePositions','workspace.restoreWindowPositions'))}
      ${settingRow(de?'Systemzustand in Zeitpunkte aufnehmen':'Include system state in checkpoints', de?'Erfasst nur eine sichere Teilmenge benutzerspezifischer Design- und Hintergrund-Einstellungen.':'Captures only a safe subset of user-specific theme and wallpaper settings.', yesNo(s.workspace.includeSystemState,'workspaceSystemState','workspace.includeSystemState'))}
      ${settingRow(de?'Systemzustand standardmäßig zurücksetzen':'Restore system state by default', de?'Standardmäßig ausgeschaltet, weil Desktop-Umgebungen und Richtlinien abweichen können.':'Off by default because desktop environments and policies can differ.', yesNo(s.workspace.restoreSystemState,'workspaceRestoreSystem','workspace.restoreSystemState'))}`;
    if (tab === 'privacy') return `
      ${settingRow(t('localOnly'), de?'Keine Cloud, kein Konto und keine Internetpflicht.':'No cloud, account or internet requirement.', yesNo(true,'localOnly','privacy.localOnly'))}
      ${settingRow(de?'Verschlüsselte lokale Datenbank':'Encrypted local database', de?'Timeline, Versionen, Zeitpunkte und Zwischenablage-Metadaten verschlüsseln.':'Encrypt timeline, versions, checkpoints and clipboard metadata.', yesNo(s.privacy.databaseEncryption,'databaseEncryption','privacy.databaseEncryption'))}
      ${settingRow(t('privateMode'), de?'Dateiüberwachung, Zwischenablage und Vorschauen sofort pausieren.':'Pause file monitoring, clipboard and previews immediately.', yesNo(s.privacy.privateMode,'privateMode','privacy.privateMode'))}
      ${settingRow(t('hideNames'), de?'Pfade und Dateinamen vor Blicken schützen.':'Hide paths and file names from shoulder surfing.', yesNo(s.privacy.hideFileNames,'hideNames','privacy.hideFileNames'))}
      ${settingRow(t('disablePreviews'), de?'Keine Bild- oder Textvorschauen erzeugen.':'Do not create image or text previews.', yesNo(s.privacy.disablePreviews,'disablePreviews','privacy.disablePreviews'))}
      ${settingRow(de?'Sensible Ordner':'Sensitive folders', de?'Werden nie überwacht. Ein Ordner pro Zeile.':'Never monitored. One folder per line.', `<textarea class="field code" data-setting="privacy.sensitiveFolders" data-transform="lines" style="width:100%;min-height:90px">${lines(s.privacy.sensitiveFolders)}</textarea>`)}
      ${settingRow(de?'Sensible Programme':'Sensitive programs', de?'Zwischenablage wird in diesen Programmen nicht erfasst.':'Clipboard is not captured in these programs.', `<input class="field code" data-setting="privacy.sensitiveApps" data-transform="csv" value="${csv(s.privacy.sensitiveApps)}">`)}
      ${settingRow(de?'Timeline automatisch löschen':'Auto-delete timeline', de?'Aufbewahrungsdauer der Aktivitätschronik in Tagen.':'Activity timeline retention in days.', `<input class="field" type="number" min="1" data-setting="privacy.autoDeleteTimelineDays" value="${s.privacy.autoDeleteTimelineDays}">`)}
      ${settingRow(de?'Zwischenablage beim Sperren löschen':'Clear clipboard history on lock', de?'Entfernt gespeicherte Zwischenablage-Einträge beim manuellen Sperren.':'Removes stored clipboard entries when manually locked.', yesNo(s.privacy.clearClipboardOnLock,'clearClipboardOnLock','privacy.clearClipboardOnLock'))}
      ${settingRow(t('clipboardEnabled'), de?'Text und optional Bilder nur lokal speichern.':'Store text and optional images locally only.', yesNo(s.clipboard.enabled,'clipboardEnabled','clipboard.enabled'))}
      ${settingRow(de?'Text erfassen':'Capture text', de?'Text, Links und Dateipfade lokal speichern.':'Store text, links and file paths locally.', yesNo(s.clipboard.captureText,'captureText','clipboard.captureText'))}
      ${settingRow(t('captureImages'), de?'Bilder benötigen zusätzlichen Speicher.':'Images require additional storage.', yesNo(s.clipboard.captureImages,'captureImages','clipboard.captureImages'))}
      ${settingRow(de?'Links erkennen':'Detect links', de?'Webadressen als eigenen lokal durchsuchbaren Typ kennzeichnen.':'Mark web addresses as a locally searchable type.', yesNo(s.clipboard.captureLinks,'captureLinks','clipboard.captureLinks'))}
      ${settingRow(de?'Dateipfade erkennen':'Detect file paths', de?'Lokale Pfade als eigenen Typ kennzeichnen, ohne Dateien automatisch zu öffnen.':'Mark local paths as a separate type without opening files automatically.', yesNo(s.clipboard.captureFilePaths,'captureFilePaths','clipboard.captureFilePaths'))}
      ${settingRow(de?'Neue Einträge standardmäßig schützen':'Protect new items by default', de?'Verhindert die normale automatische Bereinigung, bis du den Schutz entfernst.':'Prevents normal automatic cleanup until protection is removed.', yesNo(s.clipboard.protectedByDefault,'clipboardProtectedDefault','clipboard.protectedByDefault'))}
      ${settingRow(de?'Abfrageintervall in Millisekunden':'Polling interval in milliseconds', de?'Wie oft die lokale Zwischenablage auf Änderungen geprüft wird.':'How often the local clipboard is checked for changes.', `<input class="field" type="number" min="250" max="60000" data-setting="clipboard.pollIntervalMs" value="${s.clipboard.pollIntervalMs}">`)}
      ${settingRow(de?'Passwortähnliche Inhalte ignorieren':'Ignore password-like content', de?'Filtert Einmalcodes und typische Passworttexte bestmöglich.':'Best-effort filtering for one-time codes and password-like text.', yesNo(s.clipboard.ignorePasswords,'ignorePasswords','clipboard.ignorePasswords'))}
      ${settingRow(de?'Maximale Zwischenablage-Einträge':'Maximum clipboard items', de?'Favoriten und angeheftete Einträge bleiben bevorzugt erhalten.':'Favorites and pinned items are preserved first.', `<input class="field" type="number" min="1" data-setting="clipboard.maxItems" value="${s.clipboard.maxItems}">`)}
      ${settingRow(de?'Zwischenablage-Frist in Tagen':'Clipboard retention days', de?'Automatische Löschfrist für nicht favorisierte Einträge.':'Automatic retention for non-favorite items.', `<input class="field" type="number" min="1" data-setting="clipboard.retentionDays" value="${s.clipboard.retentionDays}">`)}
      ${settingRow(de?'App-PIN':'App PIN', de?'RewindOS beim Start sperren und lokale Inhalte schützen.':'Lock RewindOS at startup and protect local content.', `<button class="btn" id="configurePinButton">${s.privacy.appPinEnabled ? (de?'PIN ändern oder entfernen':'Change or remove PIN') : (de?'PIN einrichten':'Set PIN')}</button>`)}`;
    if (tab === 'security') return `
      ${settingRow(de?'Reaktion auf verdächtige Aktivität':'Suspicious-activity response', de?'Warnen, Überwachung pausieren oder zuerst sichern und pausieren.':'Warn, pause monitoring, or preserve and pause.', `<select data-setting="security.containmentMode"><option value="warn" ${s.security.containmentMode==='warn'?'selected':''}>${de?'Nur warnen':'Warn only'}</option><option value="pause-monitoring" ${s.security.containmentMode==='pause-monitoring'?'selected':''}>${de?'Überwachung pausieren':'Pause monitoring'}</option><option value="emergency-and-pause" ${s.security.containmentMode==='emergency-and-pause'?'selected':''}>${de?'Sichern und pausieren':'Snapshot and pause'}</option></select>`)}
      ${settingRow(de?'Automatische Notfall-Sicherung':'Automatic emergency snapshot', de?'Vor dem Pausieren möglichst viele aktuelle Versionen sichern.':'Preserve as many current versions as possible before pausing.', yesNo(s.security.autoEmergencySnapshot,'autoEmergencySnapshot','security.autoEmergencySnapshot'))}
      ${settingRow(de?'Prozessbeendigung erlauben':'Allow process termination', de?'Nur nach ausdrücklicher Nutzeraktion; Prozesszuordnung ist bestmöglich und kann unvollständig sein.':'Only after an explicit user action; process attribution is best effort and may be incomplete.', yesNo(s.security.allowProcessTermination,'allowProcessTermination','security.allowProcessTermination'))}
      ${settingRow(de?'Jede Wiederherstellung prüfen':'Verify every restore', de?'Hash nach dem Schreiben erneut kontrollieren.':'Re-check the hash after writing.', yesNo(s.security.verifyEveryRestore,'verifyEveryRestore','security.verifyEveryRestore'))}
      ${settingRow(de?'Symbolische Links bei Wiederherstellung ablehnen':'Reject symlinks during restore', de?'Diese Schutzgrenze ist aus Sicherheitsgründen dauerhaft aktiv und kann nicht durch Importdateien abgeschaltet werden.':'This security boundary is permanently enabled and cannot be disabled by imported settings.', `<strong>${de?'Immer aktiv':'Always on'}</strong>`)}
      ${settingRow(de?'Automatisch sperren nach Minuten':'Auto-lock after minutes', de?'0 deaktiviert die automatische App-Sperre.':'0 disables automatic app locking.', `<input class="field" type="number" min="0" max="1440" data-setting="security.lockAfterMinutes" value="${s.security.lockAfterMinutes}">`)}
      ${settingRow(de?'Maximale falsche PIN-Versuche':'Maximum failed PIN attempts', de?'Danach greift eine zeitweise Sperre.':'A temporary lockout follows.', `<input class="field" type="number" min="3" max="20" data-setting="security.maxPinFailures" value="${s.security.maxPinFailures}">`)}
      ${settingRow(de?'PIN-Sperrzeit in Sekunden':'PIN lockout seconds', de?'Bremst automatisierte Rateversuche.':'Slows automated guessing attempts.', `<input class="field" type="number" min="5" max="3600" data-setting="security.pinLockoutSeconds" value="${s.security.pinLockoutSeconds}">`)}
      ${settingRow(de?'Warnabstand in Sekunden':'Alert cooldown in seconds', de?'Verhindert eine Flut identischer Warnungen; zulässig sind 10 bis 3600 Sekunden.':'Prevents floods of identical alerts; allowed range is 10 to 3600 seconds.', `<input class="field" type="number" min="10" max="3600" data-setting="security.suspiciousCooldownSeconds" value="${s.security.suspiciousCooldownSeconds}">`)}
      ${settingRow(de?'Metadatenbank verschlüsseln':'Encrypt metadata database', de?'Timeline, Versionen, Zwischenablage und Arbeitsbereiche lokal verschlüsseln.':'Encrypt timeline, versions, clipboard and workspaces locally.', yesNo(s.privacy.databaseEncryption,'databaseEncryption','privacy.databaseEncryption'))}`;
    if (tab === 'importExport') return `
      <div class="button-row"><button class="btn" id="settingsExportNow">${t('exportSettings')}</button><button class="btn" id="settingsImportNow">${de?'Einstellungen importieren':'Import settings'}</button><button class="btn" id="settingsRecoveryNow">${de?'Wiederherstellungspaket erstellen':'Create recovery bundle'}</button><button class="btn" id="settingsRestoreNow">${de?'Wiederherstellungspaket einspielen':'Restore recovery bundle'}</button></div>
      ${settingRow(de?'Update-Prüfung aktivieren':'Enable update checks', de?'Optionaler Internetzugriff nur zur manuellen oder gewählten Prüfung. Standardmäßig aus.':'Optional internet access only for manual or selected checks. Off by default.', yesNo(s.updates.enabled,'updatesEnabled','updates.enabled'))}
      ${settingRow(de?'Beim Start prüfen':'Check at startup', de?'Nur wirksam, wenn Update-Prüfungen aktiviert sind.':'Only active when update checks are enabled.', yesNo(s.updates.checkOnStart,'updatesOnStart','updates.checkOnStart'))}
      ${settingRow(de?'GitHub-Repository':'GitHub repository', de?'Format Besitzer/Repository.':'Owner/repository format.', `<input class="field code" data-setting="updates.repository" value="${escapeAttr(s.updates.repository)}">`)}
      ${settingRow(de?'Jetzt nach Updates suchen':'Check for updates now', de?'Stellt nur nach deiner Aktion eine HTTPS-Verbindung zur GitHub-API her.':'Connects to the GitHub API over HTTPS only after your action.', `<button class="btn" id="checkUpdatesNow">${de?'Jetzt prüfen':'Check now'}</button>`)}
      <p class="muted section-gap">${de?'Normale Nutzung, Sicherungen, Suche und Wiederherstellung benötigen kein Internet.':'Normal use, protection, search and recovery do not require internet access.'}</p>`;
    if (tab === 'notifications') return `
      ${settingRow(t('notificationsEnabled'), de?'System-Pop-ups anzeigen.':'Show system notifications.', yesNo(s.general.notifications,'notificationMain','general.notifications'))}
      ${settingRow(de?'Nach erfolgreicher Sicherung':'After successful backup', de?'Für jede neue Dateiversion informieren.':'Notify for each new file version.', yesNo(s.notifications.onBackup,'notificationBackup','notifications.onBackup'))}
      ${settingRow(de?'Bei Löschungen informieren':'Notify on deletions', de?'Meldung, wenn eine geschützte Datei gelöscht wird.':'Notice when a protected file is deleted.', yesNo(s.notifications.onDelete,'notificationDelete','notifications.onDelete'))}
      ${settingRow(de?'Bei Massenaktionen informieren':'Notify on mass actions', de?'Zusammengefasste Meldung zu großen Vorgängen.':'Summarized notice for large operations.', yesNo(s.notifications.onMassAction,'notificationMass','notifications.onMassAction'))}
      ${settingRow(t('suspiciousNotifications'), de?'Sofort bei ungewöhnlich vielen Änderungen warnen.':'Warn immediately about unusual change volumes.', yesNo(s.notifications.onSuspicious,'notificationSuspicious','notifications.onSuspicious'))}
      ${settingRow(t('lowStorageNotifications'), de?'Frühzeitig vor vollem Sicherungsspeicher warnen.':'Warn before backup storage is full.', yesNo(s.notifications.onLowStorage,'notificationLow','notifications.onLowStorage'))}
      ${settingRow(de?'Bei Fehlern warnen':'Warn on failures', de?'Fehlgeschlagene Sicherungen und Überwachungsfehler melden.':'Report failed backups and monitoring errors.', yesNo(s.notifications.onFailure,'notificationFailure','notifications.onFailure'))}
      ${settingRow(de?'Tägliche Zusammenfassung':'Daily summary', de?'Einmal pro Tag eine lokale Zusammenfassung anzeigen.':'Show one local summary per day.', yesNo(s.notifications.dailySummary,'notificationDaily','notifications.dailySummary'))}
      ${settingRow(de?'Uhrzeit der Zusammenfassung':'Summary hour', de?'Lokale Uhrzeit von 0 bis 23 Uhr.':'Local hour from 0 to 23.', `<input class="field" type="number" min="0" max="23" data-setting="notifications.dailySummaryHour" value="${s.notifications.dailySummaryHour}">`)}`;
    if (tab === 'hotkeys') return `<div class="card-subtitle" style="margin-bottom:10px">${de?'Die Standardkombinationen bleiben aktiv, bis du sie ausdrücklich änderst. Unter Linux/Wayland kann die Desktop-Umgebung einzelne globale Kürzel blockieren.':'The default combinations remain active until you explicitly change them. On Linux/Wayland, the desktop environment may block individual global shortcuts.'}</div>${Object.entries(s.hotkeys).map(([key,value])=>settingRow(hotkeyLabel(key), de?'Globales Tastenkürzel.':'Global shortcut.', `<div class="hotkey-control">${hotkeyDisplay(value)}<button class="btn small" data-edit-hotkey="${escapeAttr(key)}">${de?'Ändern':'Change'}</button></div>`)).join('')}`;
    if (tab === 'accessibility') return `
      ${settingRow(t('keyboardNav'), de?'Alle wichtigen Funktionen ohne Maus bedienen.':'Use all important features without a mouse.', yesNo(s.accessibility.keyboardNavigation,'keyboardNav','accessibility.keyboardNavigation'))}
      ${settingRow(t('screenReader'), de?'Eindeutige Beschriftungen für assistive Technik.':'Clear labels for assistive technology.', yesNo(s.accessibility.screenReaderLabels,'screenReader','accessibility.screenReaderLabels'))}
      ${settingRow(t('highContrast'), de?'Zusätzlicher Kontrastmodus.':'Additional contrast mode.', yesNo(s.accessibility.highContrast,'a11yContrast','accessibility.highContrast'))}
      ${settingRow(de?'Große Schrift':'Large text', de?'Zusätzliche Schriftvergrößerung.':'Additional text enlargement.', yesNo(s.accessibility.largeText,'a11yLargeText','accessibility.largeText'))}
      ${settingRow(t('reducedMotion'), de?'Bewegungen für empfindliche Nutzer reduzieren.':'Reduce movement for motion-sensitive users.', yesNo(s.accessibility.reducedMotion,'a11yReducedMotion','accessibility.reducedMotion'))}`;
    if (tab === 'performance') return `
      ${settingRow(t('quietMode'), de?'Hintergrundaktivität bei Gaming und Videobearbeitung reduzieren.':'Reduce background work during gaming and video editing.', yesNo(s.performance.quietMode,'quietMode','performance.quietMode'))}
      ${settingRow(de?'Bei Spielen automatisch reduzieren':'Automatically reduce during games', de?'Verschiebt schwere Prüfungen, lässt den Dateischutz aber aktiv.':'Defers heavy scans while file protection stays active.', yesNo(s.performance.reduceDuringGaming,'reduceDuringGaming','performance.reduceDuringGaming'))}
      ${settingRow(de?'Spielprozesse':'Game processes', de?'Prozessnamen, bei denen schwere Hintergrundaufgaben warten. Kommagetrennt.':'Process names that defer heavy background work. Comma-separated.', `<input class="field code" data-setting="performance.gamingProcesses" data-transform="csv" value="${csv(s.performance.gamingProcesses)}">`)}
      ${settingRow(t('batteryThreshold'), de?'Auf Laptops unterhalb dieses Werts pausieren.':'Pause on laptops below this value.', `<input class="field" type="number" min="0" max="100" data-setting="performance.pauseOnBatteryBelow" value="${s.performance.pauseOnBatteryBelow}">`)}
      ${settingRow(t('onlyAC'), de?'Integritätsprüfungen und Spiegelungen auf Netzbetrieb verschieben.':'Defer integrity checks and mirrors until AC power.', yesNo(s.performance.onlyHeavyTasksOnAC,'onlyAC','performance.onlyHeavyTasksOnAC'))}
      ${settingRow(de?'Gleichzeitige Kopiervorgänge':'Concurrent copy operations', de?'Begrenzt die Hintergrundlast.':'Limits background load.', `<input class="field" type="number" min="1" max="8" data-setting="performance.maxConcurrentCopies" value="${s.performance.maxConcurrentCopies}">`)}
      ${settingRow(de?'Prüfintervall in Minuten':'Scan interval in minutes', de?'Intervall für geplante Gesundheits- und Speicherprüfungen.':'Interval for scheduled health and storage checks.', `<input class="field" type="number" min="5" data-setting="performance.scanIntervalMinutes" value="${s.performance.scanIntervalMinutes}">`)}`;
    return '';
  }

  async function saveVisibleSettings() {
    const patch = {};
    content.querySelectorAll('[data-setting]').forEach((control) => {
      let value = control.type === 'checkbox' ? control.checked : control.type === 'number' || control.type === 'range' ? Number(control.value) : control.value;
      if (control.dataset.transform === 'gb') value *= 1073741824;
      if (control.dataset.transform === 'mb') value *= 1048576;
      if (control.dataset.transform === 'seconds') value *= 1000;
      if (control.dataset.transform === 'csv') value = String(control.value).split(',').map((item) => item.trim()).filter(Boolean);
      if (control.dataset.transform === 'lines') value = String(control.value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      setNested(patch, control.dataset.setting, value);
    });
    unwrap(await api.settings.update(patch));
    await refreshState();
    toast(t('success'));
    await renderSettings();
  }

  function bindSettingFolderButtons() {
    content.querySelectorAll('[data-choose-setting-folder]').forEach((button)=>button.addEventListener('click',async()=>{const folder=unwrap(await api.dialog.chooseFolder(t('chooseFolder')));if(folder)document.getElementById(button.dataset.chooseSettingFolder).value=folder;}));
    document.getElementById('settingsAddFolder')?.addEventListener('click', chooseProtectedFolder);
    content.querySelectorAll('[data-remove-watch-folder]').forEach((button)=>button.addEventListener('click',async()=>{unwrap(await api.watch.removeFolder(button.dataset.removeWatchFolder));await refreshState();renderSettings();}));
  }


  async function resetSettings() {
    openModal({
      title: state.language === 'de' ? 'Einstellungen zurücksetzen?' : 'Reset settings?',
      body: `<p>${state.language === 'de' ? 'Sprache und Ersteinrichtung bleiben erhalten. Schutzordner, Regeln und Darstellung werden auf Standardwerte gesetzt.' : 'Language and first-run state are preserved. Protected folders, rules and appearance return to defaults.'}</p>`,
      actions: [{ label: t('cancel'), handler: closeModal }, { label: t('confirm'), style: 'danger', handler: async () => { unwrap(await api.settings.reset()); closeModal(); await refreshState(); toast(t('success')); await renderSettings(); } }]
    });
  }

  async function migrateVault() {
    const destination = unwrap(await api.dialog.chooseFolder(state.language === 'de' ? 'Neuen Sicherungsspeicher auswählen' : 'Choose new backup storage'));
    if (!destination) return;
    openModal({
      title: state.language === 'de' ? 'Sicherungsspeicher verschieben' : 'Move backup storage',
      body: `<p>${state.language === 'de' ? 'Der gesamte lokale Tresor wird kopiert. Die Überwachung wird pausiert und RewindOS muss danach neu gestartet werden.' : 'The complete local vault will be copied. Monitoring will pause and RewindOS must be restarted afterward.'}</p><p class="code">${escapeHtml(destination)}</p>`,
      actions: [{ label: t('cancel'), handler: closeModal }, { label: t('confirm'), style: 'primary', handler: async () => { const result = unwrap(await api.storage.migrateVault(destination)); closeModal(); await refreshState(); openModal({ title: t('success'), body: `<p>${state.language === 'de' ? 'Der Tresor wurde kopiert. Beende RewindOS vollständig und starte die App neu.' : 'The vault was copied. Fully close RewindOS and start it again.'}</p><p class="code">${escapeHtml(result.target)}</p>`, actions: [{ label: t('close'), style: 'primary', handler: closeModal }] }); } }]
    });
  }

  async function chooseProtectedFolder() {
    const folder = unwrap(await api.dialog.chooseFolder(t('chooseFolder')));
    if (!folder) return;
    unwrap(await api.watch.addFolder(folder));
    await refreshState();
    toast(t('success'));
    await navigate(state.currentPage);
  }

  async function runEmergency() {
    const result = unwrap(await api.watch.emergency());
    toast(`${t('emergencyDone')} ${result.saved}`);
    await refreshState();
  }

  async function exportSettings() {
    const destination = unwrap(await api.dialog.chooseSave({ title: t('exportSettings'), defaultPath: 'RewindOS-settings.json', filters: [{ name: 'JSON', extensions: ['json'] }] }));
    if (!destination) return;
    unwrap(await api.export.settings(destination)); toast(t('exportDone'));
  }

  async function exportTimeline() {
    const destination = unwrap(await api.dialog.chooseSave({ title: t('exportTimeline'), defaultPath: 'RewindOS-timeline.csv', filters: [{ name: 'CSV', extensions: ['csv'] }, { name: 'JSON', extensions: ['json'] }] }));
    if (!destination) return;
    unwrap(await api.export.timeline(destination, destination.toLowerCase().endsWith('.json') ? 'json' : 'csv')); toast(t('exportDone'));
  }

  async function createOfflineRescue() {
    const folder = unwrap(await api.dialog.chooseFolder(t('chooseFolder')));
    if (!folder) return;
    const passphrase = await askRecoveryPassphrase(state.language === 'de' ? 'Offline-Rettungsmedium schützen' : 'Protect offline rescue medium', true);
    if (!passphrase) return;
    const result = unwrap(await api.export.offlineRescue(folder, passphrase));
    toast(result.destination || result);
  }

  async function runMirror() {
    const credential = await askRecoveryPassphrase(state.language === 'de' ? 'Externe Spiegelung schützen' : 'Protect external mirror', false, { allowRemember: true });
    if (!credential) return;
    const result = unwrap(await api.mirror.run(credential.passphrase, credential.remember));
    toast(result.skipped ? result.reason : result.destination, result.skipped ? 'error' : 'success');
    state.mirrorStatus = unwrap(await api.mirror.status());
  }


  async function askRecoveryPassphrase(title, confirmRequired = false, options = {}) {
    return new Promise((resolve) => {
      openModal({
        title,
        subtitle: options.allowRemember ? (state.language === 'de' ? 'Mindestens zwölf Zeichen. Für automatische Spiegelungen kann es lokal verschlüsselt gespeichert werden.' : 'At least twelve characters. It can be stored locally encrypted for automatic mirrors.') : (state.language === 'de' ? 'Das Passwort muss mindestens zwölf Zeichen haben und wird nicht gespeichert.' : 'The passphrase must contain at least twelve characters and is never stored.'),
        body: `<div><label class="field-label">${state.language === 'de' ? 'Wiederherstellungspasswort' : 'Recovery passphrase'}</label><input id="recoveryPassphrase" class="field" type="password" style="width:100%"></div>${confirmRequired ? `<div class="section-gap"><label class="field-label">${state.language === 'de' ? 'Passwort wiederholen' : 'Repeat passphrase'}</label><input id="recoveryPassphraseRepeat" class="field" type="password" style="width:100%"></div>` : ''}${options.allowRemember ? `<div class="setting-row section-gap"><div class="setting-copy"><strong>${state.language==='de'?'Sicher speichern':'Store securely'}</strong><span>${state.language==='de'?'Nur lokal verschlüsselt; für automatische Spiegelungen und Spiegelung beim Beenden.':'Encrypted locally only; for scheduled and exit mirrors.'}</span></div>${toggleHtml('rememberMirrorPassphrase', true)}</div>` : ''}`,
        actions: [
          { label: t('cancel'), handler: () => { closeModal(); resolve(null); } },
          { label: t('continue'), style: 'primary', handler: (modal) => {
            const value = modal.querySelector('#recoveryPassphrase').value;
            if (value.length < 12) throw new Error(state.language === 'de' ? 'Mindestens zwölf Zeichen erforderlich.' : 'At least twelve characters are required.');
            if (confirmRequired && value !== modal.querySelector('#recoveryPassphraseRepeat').value) throw new Error(state.language === 'de' ? 'Die Passwörter stimmen nicht überein.' : 'The passphrases do not match.');
            closeModal(); resolve(options.allowRemember ? { passphrase: value, remember: Boolean(modal.querySelector('#rememberMirrorPassphrase')?.checked) } : value);
          } }
        ]
      });
    });
  }

  async function checkForUpdates() {
    const de = state.language === 'de';
    const result = unwrap(await api.updates.check());
    if (result.skipped && result.reason === 'disabled') {
      openModal({
        title: de ? 'Update-Prüfung ist deaktiviert' : 'Update checks are disabled',
        body: `<p>${de ? 'Aktiviere zuerst „Update-Prüfung aktivieren“ und speichere die Einstellungen. Ohne diese Freigabe stellt RewindOS keine Internetverbindung her.' : 'Enable “Update checks” and save the settings first. RewindOS does not connect to the internet without that permission.'}</p>`,
        actions: [{ label: t('close'), style: 'primary', handler: closeModal }]
      });
      return;
    }
    const current = escapeHtml(result.currentVersion || state.app.version || '—');
    const latest = escapeHtml(result.latestVersion || result.currentVersion || '—');
    openModal({
      title: result.available ? (de ? 'Neue Version verfügbar' : 'New version available') : (de ? 'RewindOS ist aktuell' : 'RewindOS is up to date'),
      body: `<div class="status-row"><span>${de ? 'Installiert' : 'Installed'}</span><strong>${current}</strong></div><div class="status-row"><span>${de ? 'Verfügbar' : 'Available'}</span><strong>${latest}</strong></div>${result.reason === 'no-release' ? `<p class="muted section-gap">${de ? 'Im eingestellten Repository wurde noch keine Veröffentlichung gefunden.' : 'No release was found in the configured repository.'}</p>` : ''}`,
      actions: [{ label: t('close'), style: 'primary', handler: closeModal }]
    });
  }

  async function changeFileManagerIntegration() {
    const de = state.language === 'de';
    const install = !state.fileManagerStatus.installed;
    openModal({
      title: install ? (de ? 'Dateimanager-Integration installieren?' : 'Install file-manager integration?') : (de ? 'Dateimanager-Integration entfernen?' : 'Remove file-manager integration?'),
      body: `<p>${install ? (de ? 'Dadurch erscheint bei Ordnern der Befehl „Mit RewindOS schützen“. Jeder Ordner muss anschließend trotzdem noch einmal in RewindOS bestätigt werden.' : 'This adds a “Protect with RewindOS” command to folders. Every folder must still be confirmed inside RewindOS.') : (de ? 'Der zusätzliche Ordnerbefehl wird für dein Benutzerkonto entfernt.' : 'The additional folder command will be removed for your user account.')}</p>`,
      actions: [
        { label: t('cancel'), handler: closeModal },
        { label: install ? (de ? 'Installieren' : 'Install') : t('remove'), style: install ? 'primary' : 'danger', handler: async () => {
          const result = unwrap(await (install ? api.integration.install() : api.integration.uninstall()));
          state.fileManagerStatus = result;
          closeModal(); toast(t('success')); await renderSettings();
        } }
      ]
    });
  }

  async function createRecoveryBundle() {
    const folder = unwrap(await api.dialog.chooseFolder(t('chooseFolder')));
    if (!folder) return;
    const passphrase = await askRecoveryPassphrase(state.language === 'de' ? 'Wiederherstellungspaket schützen' : 'Protect recovery bundle', true);
    if (!passphrase) return;
    const result = unwrap(await api.export.recoveryBundle(folder, passphrase));
    toast(result.destination || result);
  }

  async function restoreRecoveryBundle() {
    const folder = unwrap(await api.dialog.chooseFolder(state.language === 'de' ? 'Wiederherstellungspaket auswählen' : 'Choose recovery bundle'));
    if (!folder) return;
    const passphrase = await askRecoveryPassphrase(state.language === 'de' ? 'Wiederherstellungspaket entsperren' : 'Unlock recovery bundle');
    if (!passphrase) return;
    const result = unwrap(await api.import.recoveryBundle(folder, passphrase));
    openModal({
      title: t('success'),
      body: `<p>${state.language === 'de' ? 'Das Paket wurde eingespielt. RewindOS muss jetzt vollständig beendet und neu gestartet werden.' : 'The bundle was restored. RewindOS must now be fully closed and restarted.'}</p><p class="code">${escapeHtml(result.source)}</p>`,
      actions: [{ label: t('close'), style: 'primary', handler: closeModal }]
    });
  }


  async function exportArchive() {
    const folder = unwrap(await api.dialog.chooseFolder(t('chooseFolder')));
    if (!folder) return;
    const result = unwrap(await api.export.archive(folder));
    toast(result);
  }

  async function importSettings() {
    const source = unwrap(await api.dialog.chooseFile({ title: state.language === 'de' ? 'Einstellungen importieren' : 'Import settings', filters: [{ name: 'JSON', extensions: ['json'] }] }));
    if (!source) return;
    unwrap(await api.import.settings(source));
    await refreshState();
    toast(t('success'));
    await navigate('settings');
  }

  function showFirstRun() {
    const de = state.selectedLanguage !== 'en';
    const steps = [
      {
        title: de ? 'Willkommen bei RewindOS' : 'Welcome to RewindOS',
        subtitle: de ? 'Wähle zuerst deine Sprache. Danach wird die gesamte App in dieser Sprache angezeigt.' : 'Choose your language first. The complete app will use it.',
        body: `<div class="language-grid"><button class="language-choice ${state.selectedLanguage==='de'?'selected':''}" data-language-choice="de">🇩🇪<br><br><strong>Deutsch</strong></button><button class="language-choice ${state.selectedLanguage==='en'?'selected':''}" data-language-choice="en">🇬🇧<br><br><strong>English</strong></button></div>`
      },
      {
        title: de ? 'Schutzordner auswählen' : 'Choose protected folders',
        subtitle: de ? 'Nur ausdrücklich ausgewählte Ordner werden überwacht. Du kannst später weitere hinzufügen.' : 'Only explicitly selected folders are monitored. More can be added later.',
        body: `<div class="list" id="setupWatchedList">${state.setup.watchedFolders.map((folder,index)=>`<div class="list-item"><span class="code">${escapeHtml(folder)}</span><button class="btn small danger" data-remove-setup-watch="${index}">×</button></div>`).join('') || `<div class="empty">${de?'Noch kein Ordner ausgewählt.':'No folder selected yet.'}</div>`}</div><div class="section-gap"><button class="btn" id="setupAddWatch">＋ ${de?'Ordner auswählen':'Choose folder'}</button></div><label class="setting-row"><span class="setting-copy"><strong>${de?'Überwachung aktivieren':'Enable monitoring'}</strong><span>${de?'Kann jederzeit pausiert werden.':'Can be paused at any time.'}</span></span><span class="switch"><input type="checkbox" id="setupMonitoring" ${state.setup.monitoringEnabled?'checked':''}><span class="slider"></span></span></label>`
      },
      {
        title: de ? 'Speicher und Aufbewahrung' : 'Storage and retention',
        subtitle: de ? 'Alle Sicherungen bleiben lokal auf deinem Computer.' : 'All backups remain local on your computer.',
        body: `<div class="form-grid"><div><label class="field-label">${de?'Maximaler Speicher (GB)':'Maximum storage (GB)'}</label><input id="setupMaxStorage" class="field" type="number" min="1" max="4096" value="${Math.round(state.setup.maxVaultBytes/1073741824)}" style="width:100%"></div><div class="full"><label class="field-label">${de?'Eigener Sicherungsordner (optional)':'Custom backup folder (optional)'}</label><div class="button-row"><input id="setupVaultPath" class="field code" value="${escapeAttr(state.setup.vaultPath)}" readonly style="flex:1"><button class="btn" id="setupChooseVault">…</button></div></div></div>`
      },
      {
        title: de ? 'Datenschutz-Zonen' : 'Privacy zones',
        subtitle: de ? 'Ausgeschlossene Ordner werden niemals überwacht.' : 'Excluded folders are never monitored.',
        body: `<div class="list">${state.setup.excludedFolders.map((folder,index)=>`<div class="list-item"><span class="code">${escapeHtml(folder)}</span><button class="btn small danger" data-remove-setup-exclude="${index}">×</button></div>`).join('') || `<div class="empty">${de?'Keine zusätzlichen Ausschlüsse.':'No additional exclusions.'}</div>`}</div><div class="section-gap"><button class="btn" id="setupAddExclude">＋ ${de?'Ausschlussordner':'Excluded folder'}</button></div><label class="setting-row"><span class="setting-copy"><strong>${de?'Privatmodus':'Private mode'}</strong><span>${de?'Vorschauen und sensible Anzeigen vorerst deaktivieren.':'Disable previews and sensitive displays for now.'}</span></span><span class="switch"><input type="checkbox" id="setupPrivate" ${state.setup.privateMode?'checked':''}><span class="slider"></span></span></label>`
      },
      {
        title: de ? 'Start und App-Schutz' : 'Startup and app protection',
        subtitle: de ? 'Eine PIN ist optional. Ohne PIN bleibt RewindOS trotzdem vollständig lokal.' : 'A PIN is optional. RewindOS remains fully local without one.',
        body: `<label class="setting-row"><span class="setting-copy"><strong>${de?'Mit dem System starten':'Launch with the system'}</strong><span>${de?'RewindOS schützt dann automatisch im Hintergrund.':'RewindOS can protect automatically in the background.'}</span></span><span class="switch"><input type="checkbox" id="setupAutostart" ${state.setup.launchAtStartup?'checked':''}><span class="slider"></span></span></label><div class="section-gap"><label class="field-label">${de?'Optionale App-PIN (mindestens 4 Zeichen)':'Optional app PIN (at least 4 characters)'}</label><input id="setupPin" class="field" type="password" maxlength="128" value="${escapeAttr(state.setup.pin)}" style="width:100%" autocomplete="new-password"></div>`
      },
      {
        title: de ? 'Bereit zum Start' : 'Ready to start',
        subtitle: de ? 'RewindOS ist kostenlos, werbefrei, kontolos und vollständig offline nutzbar.' : 'RewindOS is free, ad-free, account-free and fully usable offline.',
        body: `<div class="list"><div class="list-item"><span>${de?'Sprache':'Language'}</span><strong>${state.selectedLanguage==='de'?'Deutsch':'English'}</strong></div><div class="list-item"><span>${de?'Schutzordner':'Protected folders'}</span><strong>${state.setup.watchedFolders.length}</strong></div><div class="list-item"><span>${de?'Speicherlimit':'Storage limit'}</span><strong>${Math.round(state.setup.maxVaultBytes/1073741824)} GB</strong></div><div class="list-item"><span>${de?'Internet erforderlich':'Internet required'}</span><strong>${de?'Nein':'No'}</strong></div></div><p class="muted section-gap">${de?'Wichtig: RewindOS ergänzt regelmäßige unabhängige Backups, ersetzt sie aber nicht.':'Important: RewindOS complements regular independent backups; it does not replace them.'}</p>`
      }
    ];
    const step = steps[state.setupStep];
    openModal({
      title: step.title, subtitle: `${de?'Schritt':'Step'} ${state.setupStep+1}/${steps.length} · ${step.subtitle}`, body: step.body, closeable: false, wide: state.setupStep === 1 || state.setupStep === 3,
      actions: [
        ...(state.setupStep > 0 ? [{ label: de?'Zurück':'Back', handler: () => { collectSetupStep(); state.setupStep -= 1; showFirstRun(); } }] : []),
        { label: state.setupStep === steps.length-1 ? (de?'Einrichtung abschließen':'Finish setup') : (de?'Weiter':'Continue'), style: 'primary', handler: async () => {
          collectSetupStep();
          if (state.setupStep === 1 && state.setup.monitoringEnabled && state.setup.watchedFolders.length === 0) {
            throw new Error(de ? 'Wähle mindestens einen Schutzordner aus oder deaktiviere die Überwachung.' : 'Choose at least one protected folder or disable monitoring.');
          }
          if (state.setupStep < steps.length-1) { state.setupStep += 1; showFirstRun(); return; }
          unwrap(await api.settings.completeFirstRun(state.selectedLanguage, state.setup));
          closeModal(); await refreshState(); await navigate('dashboard');
        } }
      ],
      onOpen: (modal) => {
        modal.querySelectorAll('[data-language-choice]').forEach((button)=>button.addEventListener('click',()=>{state.selectedLanguage=button.dataset.languageChoice;modal.querySelectorAll('[data-language-choice]').forEach((choice)=>choice.classList.toggle('selected',choice===button));}));
        modal.querySelector('#setupAddWatch')?.addEventListener('click', async () => { collectSetupStep(); const folder=unwrap(await api.dialog.chooseFolder(de?'Schutzordner auswählen':'Choose protected folder')); if(folder&&!state.setup.watchedFolders.includes(folder))state.setup.watchedFolders.push(folder); showFirstRun(); });
        modal.querySelector('#setupAddExclude')?.addEventListener('click', async () => { collectSetupStep(); const folder=unwrap(await api.dialog.chooseFolder(de?'Ausschlussordner auswählen':'Choose excluded folder', false)); if(folder&&!state.setup.excludedFolders.includes(folder))state.setup.excludedFolders.push(folder); showFirstRun(); });
        modal.querySelector('#setupChooseVault')?.addEventListener('click', async () => { collectSetupStep(); const folder=unwrap(await api.dialog.chooseFolder(de?'Sicherungsspeicher auswählen':'Choose backup storage')); if(folder)state.setup.vaultPath=folder; showFirstRun(); });
        modal.querySelectorAll('[data-remove-setup-watch]').forEach((button)=>button.addEventListener('click',()=>{state.setup.watchedFolders.splice(Number(button.dataset.removeSetupWatch),1);showFirstRun();}));
        modal.querySelectorAll('[data-remove-setup-exclude]').forEach((button)=>button.addEventListener('click',()=>{state.setup.excludedFolders.splice(Number(button.dataset.removeSetupExclude),1);showFirstRun();}));
      }
    });
  }

  function collectSetupStep() {
    const root = modalRoot;
    const max = root.querySelector('#setupMaxStorage'); if (max) state.setup.maxVaultBytes = Math.max(1, Number(max.value || 20)) * 1073741824;
    const monitoring = root.querySelector('#setupMonitoring'); if (monitoring) state.setup.monitoringEnabled = monitoring.checked;
    const privateMode = root.querySelector('#setupPrivate'); if (privateMode) state.setup.privateMode = privateMode.checked;
    const autostart = root.querySelector('#setupAutostart'); if (autostart) state.setup.launchAtStartup = autostart.checked;
    const pin = root.querySelector('#setupPin'); if (pin) state.setup.pin = pin.value;
  }


  function showTrashRules() {
    const rules = state.app.settings.customTrashRules || [];
    const de = state.language === 'de';
    openModal({
      title: de ? 'Eigene Löschregeln' : 'Custom trash rules',
      subtitle: de ? 'Lege pro Ordner eine eigene Aufbewahrungsfrist fest.' : 'Set a custom retention period for each folder.',
      wide: true,
      body: `<div id="trashRuleList" class="list">${rules.map((rule,index)=>`<div class="list-item"><div class="list-item-main"><div class="list-item-title code">${escapeHtml(rule.folder)}</div><div class="list-item-meta">${rule.retentionDays} days</div></div><button class="btn small danger" data-remove-rule="${index}">×</button></div>`).join('') || `<div class="empty">${t('noData')}</div>`}</div><div class="section-gap"><button class="btn" id="addTrashRuleButton">＋ ${t('create')}</button></div>`,
      actions: [{ label: t('close'), handler: closeModal }],
      onOpen: (modal) => {
        modal.querySelectorAll('[data-remove-rule]').forEach((button)=>button.addEventListener('click',async()=>{const next=[...rules];next.splice(Number(button.dataset.removeRule),1);unwrap(await api.settings.update({customTrashRules:next}));closeModal();await refreshState();showTrashRules();}));
        modal.querySelector('#addTrashRuleButton').addEventListener('click', async () => {
          const folder = unwrap(await api.dialog.chooseFolder(t('chooseFolder'))); if (!folder) return;
          openModal({ title: de ? 'Löschregel hinzufügen' : 'Add trash rule', body: `<div><label class="field-label">${t('folder')}</label><input class="field code" id="trashRuleFolder" style="width:100%" value="${escapeAttr(folder)}" readonly></div><div class="section-gap"><label class="field-label">${t('retentionDays')}</label><input class="field" id="trashRuleDays" type="number" min="1" value="90" style="width:100%"></div>`, actions: [{ label: t('cancel'), handler: showTrashRules }, { label: t('save'), style: 'primary', handler: async (ruleModal) => { const days=Number(ruleModal.querySelector('#trashRuleDays').value); if(!Number.isFinite(days)||days<1) throw new Error(de?'Ungültige Frist.':'Invalid retention.'); unwrap(await api.settings.update({ customTrashRules: [...rules, { folder, retentionDays: days }] })); closeModal(); await refreshState(); showTrashRules(); } }] });
        });
      }
    });
  }

  function showPinSetup() {
    const enabled = state.app.settings.privacy.appPinEnabled;
    const de = state.language === 'de';
    openModal({
      title: de ? 'App-PIN' : 'App PIN',
      subtitle: enabled ? (de ? 'PIN ändern oder Schutz entfernen.' : 'Change the PIN or remove protection.') : (de ? 'Mindestens vier Zeichen.' : 'At least four characters.'),
      body: `<div><label class="field-label">${de ? 'Aktuelle PIN (nur beim Entfernen)' : 'Current PIN (only when removing)'}</label><input id="currentPin" class="field" type="password" style="width:100%"></div><div class="section-gap"><label class="field-label">${de ? 'Neue PIN' : 'New PIN'}</label><input id="newPin" class="field" type="password" style="width:100%"></div><div class="section-gap"><label class="field-label">${de ? 'Neue PIN wiederholen' : 'Repeat new PIN'}</label><input id="repeatPin" class="field" type="password" style="width:100%"></div>`,
      actions: [
        { label: t('cancel'), handler: closeModal },
        ...(enabled ? [{ label: de ? 'PIN entfernen' : 'Remove PIN', style: 'danger', handler: async (modal) => { unwrap(await api.auth.clearPin(modal.querySelector('#currentPin').value)); closeModal(); await refreshState(); toast(t('success')); renderSettings(); } }] : []),
        { label: t('save'), style: 'primary', handler: async (modal) => {
          const pin = modal.querySelector('#newPin').value;
          if (pin !== modal.querySelector('#repeatPin').value) throw new Error(de ? 'Die PINs stimmen nicht überein.' : 'The PINs do not match.');
          unwrap(await api.auth.setPin(pin));
          closeModal(); await refreshState(); toast(t('success')); renderSettings();
        } }
      ]
    });
  }

  function showLockScreen() {
    const de = state.language === 'de';
    openModal({
      title: de ? 'RewindOS ist gesperrt' : 'RewindOS is locked',
      subtitle: de ? 'Gib deine App-PIN ein, um auf Timeline, Sicherungen und Einstellungen zuzugreifen.' : 'Enter your app PIN to access the timeline, backups and settings.',
      closeable: false,
      body: `<div><label class="field-label">PIN</label><input id="unlockPin" class="field" type="password" autocomplete="off" style="width:100%" autofocus></div><p id="unlockError" class="muted" style="display:none;color:var(--danger)"></p>`,
      actions: [{ label: de ? 'Entsperren' : 'Unlock', style: 'primary', handler: async (modal) => {
        const result = unwrap(await api.auth.verify(modal.querySelector('#unlockPin').value));
        if (!result.valid) {
          const error = modal.querySelector('#unlockError'); error.style.display = 'block'; error.textContent = de ? 'Die PIN ist falsch.' : 'The PIN is incorrect.'; return;
        }
        closeModal(); await refreshState(); await navigate('dashboard');
      } }],
      onOpen: (modal) => {
        const input = modal.querySelector('#unlockPin');
        input.focus();
        input.addEventListener('keydown', (event) => { if (event.key === 'Enter') modal.querySelector('[data-modal-action="0"]').click(); });
      }
    });
  }

  async function toggleProtection() {
    const paused = state.app.watcher.paused || !state.app.watcher.running;
    if (paused) { unwrap(await api.watch.resume()); toast(t('monitoringResumed')); }
    else { unwrap(await api.watch.pause()); toast(t('monitoringPaused')); }
    await refreshState();
    if (state.currentPage === 'dashboard') renderDashboard();
  }

  async function initialize() {
    try {
      await refreshState();
      pageTitle.textContent = t('dashboard'); pageSubtitle.textContent = t('localProtection');
      protectionButton.addEventListener('click', toggleProtection);
      document.getElementById('settingsButton').addEventListener('click', () => navigate('settings'));
      document.getElementById('refreshButton').addEventListener('click', () => navigate(state.currentPage));
      document.getElementById('emergencyButton').addEventListener('click', runEmergency);
      api.events.on('watcher:event', async () => { if (state.currentPage === 'dashboard') await renderDashboard(); });
      api.events.on('watcher:status', async () => { await refreshState(); updateProtection(); });
      api.events.on('watcher:suspicious', (alert) => openModal({ title: `⚠ ${t('suspicious')}`, subtitle: `${alert.count} ${state.language==='de'?'Änderungen':'changes'} · ${escapeHtml(alert.program||t('unknown'))}`, body: `<p>${T[state.language].limitation}</p><div class="list">${(alert.paths||[]).slice(0,20).map((item)=>`<div class="list-item code">${escapeHtml(displayPath(item))}</div>`).join('')}</div>`, actions: [{ label: state.language==='de'?'Öffnen im Sicherheitszentrum':'Open security center', handler: async () => { closeModal(); await navigate('security'); } }, { label: state.language==='de'?'Überwachung pausieren':'Pause monitoring', style: 'warning', handler: async () => { unwrap(await api.security.respond(alert.id,'pause')); closeModal(); } }, { label: t('emergency'), style: 'warning', handler: async () => { unwrap(await api.security.respond(alert.id,'snapshot')); closeModal(); } }, { label: t('close'), handler: closeModal }] }));
      api.events.on('app:navigate', (page) => navigate(page));
      api.events.on('app:protect-request', (request) => {
        const token = String(request?.token || '');
        const folder = String(request?.folder || '');
        if (!token || !folder) return;
        openModal({
          title: state.language === 'de' ? 'Ordner mit RewindOS schützen?' : 'Protect folder with RewindOS?',
          subtitle: state.language === 'de' ? 'Die Anfrage kam über das Explorer-/Dateimanager-Menü. Erst nach deiner Bestätigung wird der Ordner überwacht.' : 'This request came from the Explorer/file-manager menu. The folder is watched only after your confirmation.',
          closeable: false,
          body: `<p class="code">${escapeHtml(displayPath(folder))}</p>`,
          actions: [
            { label: t('cancel'), handler: async () => { unwrap(await api.watch.resolveProtectRequest(token, false)); closeModal(); } },
            { label: t('protectFolder'), style: 'primary', handler: async () => { unwrap(await api.watch.resolveProtectRequest(token, true)); closeModal(); await refreshState(); toast(t('success')); } }
          ]
        });
      });
      api.events.on('auth:locked', () => showLockScreen());
      api.events.on('update:available', (update) => toast(`${state.language==='de'?'Neue Version verfügbar':'New version available'}: ${update.latestVersion}`));
      let activityTimer = null; const reportActivity = () => { clearTimeout(activityTimer); activityTimer = setTimeout(() => api.auth.activity().catch?.(()=>{}), 1000); };
      document.addEventListener('pointerdown', reportActivity, { passive: true }); document.addEventListener('keydown', reportActivity, { passive: true });
      if (!state.app.settings.firstRunComplete) showFirstRun();
      else if (state.app.auth?.enabled && !state.app.auth?.unlocked) showLockScreen();
      else await navigate(state.app.settings.general.homePage || 'dashboard');
    } catch (error) {
      content.innerHTML = `<div class="card"><h2>${t('error')}</h2><p>${escapeHtml(error.message)}</p></div>`;
    }
  }

  initialize();
})();
