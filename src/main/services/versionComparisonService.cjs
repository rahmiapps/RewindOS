const path = require('node:path');

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.json', '.json5', '.xml', '.html', '.htm', '.css', '.scss', '.less',
  '.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.py', '.java', '.kt', '.kts', '.cs', '.cpp', '.c',
  '.h', '.hpp', '.go', '.rs', '.php', '.rb', '.swift', '.sh', '.ps1', '.bat', '.cmd', '.ini', '.cfg',
  '.toml', '.yaml', '.yml', '.sql', '.log', '.rtf'
]);

function looksBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 7 || (byte > 14 && byte < 32)) suspicious += 1;
  }
  return sample.length > 0 && suspicious / sample.length > 0.1;
}

function lineDiff(left, right, limit = 5000) {
  const a = left.split(/\r?\n/).slice(0, limit);
  const b = right.split(/\r?\n/).slice(0, limit);
  const max = Math.max(a.length, b.length);
  const changes = [];
  let added = 0;
  let removed = 0;
  let changed = 0;
  let unchanged = 0;
  for (let index = 0; index < max; index += 1) {
    const before = a[index];
    const after = b[index];
    if (before === after) { unchanged += 1; continue; }
    let type = 'changed';
    if (before === undefined) { type = 'added'; added += 1; }
    else if (after === undefined) { type = 'removed'; removed += 1; }
    else changed += 1;
    changes.push({ line: index + 1, type, before: before ?? '', after: after ?? '' });
  }
  return { added, removed, changed, unchanged, truncated: left.split(/\r?\n/).length > limit || right.split(/\r?\n/).length > limit, changes };
}

class VersionComparisonService {
  constructor(vaultService) {
    this.vault = vaultService;
  }

  async compare(versionAId, versionBId) {
    const versionA = this.vault.findVersion(versionAId);
    const versionB = this.vault.findVersion(versionBId);
    if (!versionA || !versionB) throw new Error('Version not found');
    const [bufferA, bufferB] = await Promise.all([this.vault.readVersion(versionA), this.vault.readVersion(versionB)]);
    const ext = path.extname(versionA.path || versionB.path || '').toLowerCase();
    const text = TEXT_EXTENSIONS.has(ext) && !looksBinary(bufferA) && !looksBinary(bufferB) && bufferA.length <= 5 * 1024 * 1024 && bufferB.length <= 5 * 1024 * 1024;
    if (!text) {
      return {
        type: 'binary',
        versionA,
        versionB,
        sameContent: versionA.hash === versionB.hash,
        sizeDelta: versionB.size - versionA.size,
        message: 'Binary files are compared by hash and size.'
      };
    }
    const before = bufferA.toString('utf8');
    const after = bufferB.toString('utf8');
    return {
      type: 'text',
      versionA,
      versionB,
      sameContent: versionA.hash === versionB.hash,
      sizeDelta: versionB.size - versionA.size,
      ...lineDiff(before, after)
    };
  }
}

module.exports = { VersionComparisonService, lineDiff, looksBinary };
