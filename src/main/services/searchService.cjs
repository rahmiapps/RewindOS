const path = require('node:path');

class SearchService {
  constructor(auditStore, vaultService, clipboardService, settingsStore = null) {
    this.audit = auditStore;
    this.vault = vaultService;
    this.clipboard = clipboardService;
    this.settingsStore = settingsStore;
  }

  parseNaturalQuery(query) {
    const text = String(query || '').trim().toLowerCase();
    const filters = {};
    if (/gelöscht|deleted/.test(text)) filters.action = 'deleted';
    else if (/geändert|modified|bearbeitet/.test(text)) filters.action = 'modified';
    else if (/erstellt|created/.test(text)) filters.action = 'created';
    else if (/wiederhergestellt|restored/.test(text)) filters.action = 'restored';

    const now = new Date();
    if (/heute|today/.test(text)) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filters.from = start.toISOString();
    } else if (/gestern|yesterday/.test(text)) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filters.from = start.toISOString(); filters.to = end.toISOString();
    } else if (/diese woche|this week/.test(text)) {
      const day = (now.getDay() + 6) % 7;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      filters.from = start.toISOString();
    }

    const extensionGroups = [
      { re: /bilder|images|fotos|photos/, extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'] },
      { re: /dokumente|documents/, extensions: ['.doc', '.docx', '.odt', '.pdf', '.txt', '.rtf'] },
      { re: /code|quellcode|source/, extensions: ['.js', '.ts', '.tsx', '.jsx', '.cs', '.kt', '.java', '.py', '.rs', '.go'] },
      { re: /tabellen|spreadsheets/, extensions: ['.xlsx', '.xls', '.ods', '.csv'] },
      { re: /videos/, extensions: ['.mp4', '.mkv', '.mov', '.avi', '.webm'] }
    ];
    const group = extensionGroups.find((item) => item.re.test(text));
    if (group) filters.extensions = group.extensions;
    return filters;
  }

  matchesTime(value, filters) {
    const timestamp = new Date(value || 0).getTime();
    if (!Number.isFinite(timestamp)) return false;
    if (filters.from && timestamp < new Date(filters.from).getTime()) return false;
    if (filters.to && timestamp > new Date(filters.to).getTime()) return false;
    return true;
  }

  matchesExtensions(filePath, filters) {
    if (!filters.extensions?.length) return true;
    return filters.extensions.includes(path.extname(filePath || '').toLowerCase());
  }

  query(query, options = {}) {
    const parsed = this.parseNaturalQuery(query);
    const filters = { ...parsed, ...options };
    let timeline = this.audit.list({ limit: options.limit || 2000, ...filters, query: options.rawTextSearch ? query : undefined });
    if (filters.extensions) timeline = timeline.filter((event) => this.matchesExtensions(event.path, filters));
    const q = String(query || '').trim().toLowerCase();
    if (q && !parsed.action && !parsed.from && !parsed.extensions) {
      timeline = timeline.filter((event) => JSON.stringify(event).toLowerCase().includes(q));
    }

    const versions = this.vault.listVersions().filter((item) => {
      if (!this.matchesExtensions(item.path, filters)) return false;
      if (!q || parsed.action || parsed.from || parsed.extensions) return true;
      return item.path.toLowerCase().includes(q);
    }).slice(0, 500);

    const trash = this.vault.listTrash().filter((item) => {
      if (filters.action && filters.action !== 'deleted') return false;
      if (!this.matchesTime(item.timestamp || item.modifiedAt, filters)) return false;
      if (!this.matchesExtensions(item.originalPath, filters)) return false;
      if (!q || parsed.action || parsed.from || parsed.extensions) return true;
      return `${item.name || ''} ${item.originalPath || ''} ${item.reason || ''}`.toLowerCase().includes(q);
    }).slice(0, 500);

    const clipboard = this.clipboard ? this.clipboard.list(q).slice(0, 200) : [];
    const settings = this.settingsStore?.get?.() || null;
    const watchedFolders = settings?.monitoring?.watchedFolders || [];
    return {
      query, parsed: filters, timeline, versions, clipboard, trash,
      protection: {
        watchedFolders: watchedFolders.length,
        monitoringEnabled: Boolean(settings?.monitoring?.enabled),
        monitoringPaused: Boolean(settings?.monitoring?.paused),
        deletionQuery: filters.action === 'deleted'
      }
    };
  }
}

module.exports = { SearchService };
