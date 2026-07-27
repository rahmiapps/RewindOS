const fs = require('node:fs');
const path = require('node:path');
const { nowIso, atomicWriteJson, readJson } = require('../../shared/utils.cjs');

class RescueService {
  constructor(paths, auditStore, vaultService, integrityService, logger) {
    this.paths = paths;
    this.audit = auditStore;
    this.vault = vaultService;
    this.integrity = integrityService;
    this.logger = logger;
    this.sessionFile = path.join(paths.dataDir, 'session-state.json');
    this.session = readJson(this.sessionFile, { cleanExit: true, lastStart: null, lastExit: null });
  }

  markStart() {
    const crashedPreviously = this.session.cleanExit === false;
    const previousStart = this.session.lastStart;
    this.session = { cleanExit: false, lastStart: nowIso(), lastExit: this.session.lastExit };
    atomicWriteJson(this.sessionFile, this.session);
    return { crashedPreviously, previousStart, candidates: crashedPreviously ? this.findCandidates(previousStart) : [] };
  }

  markCleanExit() {
    this.session.cleanExit = true;
    this.session.lastExit = nowIso();
    atomicWriteJson(this.sessionFile, this.session);
  }

  findCandidates(since) {
    if (!since) return [];
    return this.audit.list({ from: since, limit: 500 }).filter((event) => ['modified', 'deleted', 'created'].includes(event.action));
  }

  analyzeCandidate(eventId) {
    const event = this.audit.get(eventId);
    if (!event) return null;
    const health = event.path ? this.integrity.fileHealth(event.path) : null;
    const versions = event.path ? this.vault.listVersions(event.path) : [];
    return { event, health, versions };
  }
}

module.exports = { RescueService };
