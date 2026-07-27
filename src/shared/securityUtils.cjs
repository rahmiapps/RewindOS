const fs = require('node:fs');
const path = require('node:path');

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function stripDangerousKeys(value, depth = 0) {
  if (depth > 20) throw new Error('Input nesting is too deep');
  if (Array.isArray(value)) return value.slice(0, 10000).map((item) => stripDangerousKeys(item, depth + 1));
  if (!isPlainObject(value)) return value;
  const output = Object.create(null);
  for (const [key, item] of Object.entries(value)) {
    if (BLOCKED_KEYS.has(key)) continue;
    output[key] = stripDangerousKeys(item, depth + 1);
  }
  return output;
}

function safeString(value, { maxLength = 32768, allowEmpty = true } = {}) {
  const text = String(value ?? '');
  if (!allowEmpty && !text.trim()) throw new Error('A value is required');
  if (text.includes('\0')) throw new Error('Null bytes are not allowed');
  if (text.length > maxLength) throw new Error('Input is too long');
  return text;
}

function safeLocalPath(value, { mustExist = false, allowSymlink = false } = {}) {
  const text = safeString(value, { allowEmpty: false });
  const resolved = path.resolve(text);
  if (mustExist) {
    const stat = fs.lstatSync(resolved);
    if (!allowSymlink && stat.isSymbolicLink()) throw new Error('Symbolic links are not allowed for this operation');
  }
  return resolved;
}

function isWithin(parent, child) {
  const root = path.resolve(parent);
  const target = path.resolve(child);
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertWithinAny(target, roots, message = 'Path is outside the allowed locations') {
  const resolved = path.resolve(target);
  if (!(roots || []).some((root) => root && isWithin(root, resolved))) throw new Error(message);
  return resolved;
}

function assertNoSymlinkComponents(target, stopAt = path.parse(path.resolve(target)).root) {
  let current = path.resolve(target);
  const boundary = path.resolve(stopAt);
  while (current && current !== path.dirname(current)) {
    if (fs.existsSync(current)) {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) throw new Error('Symbolic-link paths are not allowed');
    }
    if (current === boundary) break;
    current = path.dirname(current);
  }
  return true;
}

function clampNumber(value, minimum, maximum, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maximum, Math.max(minimum, numeric));
}

function allowedEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeStringArray(value, { lower = false, maxItems = 10000, maxLength = 32768 } = {}) {
  if (!Array.isArray(value)) return [];
  const output = [];
  const seen = new Set();
  for (const item of value.slice(0, maxItems)) {
    let text;
    try { text = safeString(item, { maxLength }).trim(); } catch { continue; }
    if (!text) continue;
    if (lower) text = text.toLowerCase();
    if (!seen.has(text)) { seen.add(text); output.push(text); }
  }
  return output;
}

module.exports = {
  BLOCKED_KEYS,
  isPlainObject,
  stripDangerousKeys,
  safeString,
  safeLocalPath,
  isWithin,
  assertWithinAny,
  assertNoSymlinkComponents,
  clampNumber,
  allowedEnum,
  normalizeStringArray
};
