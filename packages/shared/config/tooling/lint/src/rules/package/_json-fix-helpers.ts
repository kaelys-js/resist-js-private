/**
 * Shared helpers for building LintFix objects that edit package.json files.
 *
 * These helpers read the raw file content synchronously and compute byte
 * offsets for deleting JSON key-value entries or entire blocks.
 *
 * @module
 */

import { readFileSync } from 'node:fs';

import type { LintFix } from '@/lint/framework/types.ts';

/** No-op fix sentinel. */
export const NO_FIX: LintFix = { range: { start: 0, end: 0 }, text: '' };

/**
 * Read raw file content synchronously. Returns empty string on error.
 *
 * @param {string} filePath - Absolute file path
 * @returns {string} File content or empty string
 */
export function readContent(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Build a fix that deletes a JSON key-value entry line from a file.
 *
 * Finds `"key":` in the content, removes the entire line including
 * the trailing comma (or leading comma if it's the last entry).
 *
 * @param {string} content - Raw file content
 * @param {string} key - The JSON key to remove (e.g., "ts-node", "valibot")
 * @param {string} parentKey - Optional parent key to scope the search (e.g., "devDependencies")
 * @returns {LintFix} Fix that deletes the entry or NO_FIX
 */
export function buildDeleteJsonEntryFix(content: string, key: string, parentKey?: string): LintFix {
  /* Scope search to within the parent block if provided */
  let searchStart: number = 0;

  if (parentKey) {
    const parentIdx: number = content.indexOf(`"${parentKey}"`);

    if (parentIdx === -1) {
      return NO_FIX;
    }

    searchStart = parentIdx;
  }

  /* Find the key within the scoped region */
  const keyPattern: string = `"${key}"`;
  const keyIdx: number = content.indexOf(keyPattern, searchStart);

  if (keyIdx === -1) {
    return NO_FIX;
  }

  /* Find the start of the line containing this key */
  let lineStart: number = keyIdx;

  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--;
  }

  /* Find the end of the line (past the value and trailing comma) */
  let lineEnd: number = keyIdx;

  while (lineEnd < content.length && content[lineEnd] !== '\n') {
    lineEnd++;
  }

  /* Include the newline */
  if (lineEnd < content.length && content[lineEnd] === '\n') {
    lineEnd++;
  }

  /* Check if the previous line ends with a comma and this is the last entry
   * (next non-blank line starts with '}') — if so, also remove the trailing
   * comma from the previous line */
  const afterDelete: string = content.slice(lineEnd).trimStart();

  if (afterDelete.startsWith('}')) {
    /* Look back for trailing comma on previous line */
    let commaIdx: number = lineStart - 1;

    /* Skip whitespace/newline before this line */
    while (commaIdx >= 0 && (content[commaIdx] === '\n' || content[commaIdx] === '\r')) {
      commaIdx--;
    }

    /* If previous char is comma, extend deletion to remove it */
    if (commaIdx >= 0 && content[commaIdx] === ',') {
      /* Just remove the comma by extending our start backwards to include it */
      lineStart = commaIdx;

      /* Include the newline after the comma too */
      let afterComma: number = commaIdx + 1;

      while (afterComma < keyIdx && content[afterComma] !== '\n') {
        afterComma++;
      }

      if (afterComma < keyIdx && content[afterComma] === '\n') {
        lineStart = commaIdx;
        /* We'll replace comma+newline+entry line with just newline */
        return { range: { start: lineStart, end: lineEnd }, text: '\n' };
      }
    }
  }

  return { range: { start: lineStart, end: lineEnd }, text: '' };
}

/**
 * Build a fix that deletes an entire JSON block (key + object value).
 *
 * Finds `"key": {` and removes through the matching closing `}`,
 * including trailing comma.
 *
 * @param {string} content - Raw file content
 * @param {string} key - The JSON key whose block to remove (e.g., "peerDependencies")
 * @returns {LintFix} Fix that deletes the block or NO_FIX
 */
export function buildDeleteJsonBlockFix(content: string, key: string): LintFix {
  const keyPattern: string = `"${key}"`;
  const keyIdx: number = content.indexOf(keyPattern);

  if (keyIdx === -1) {
    return NO_FIX;
  }

  /* Find the start of the line */
  let lineStart: number = keyIdx;

  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--;
  }

  /* Find the opening brace */
  let braceIdx: number = content.indexOf('{', keyIdx + keyPattern.length);

  if (braceIdx === -1) {
    return NO_FIX;
  }

  /* Find the matching closing brace */
  let depth: number = 0;
  let blockEnd: number = braceIdx;

  for (let i: number = braceIdx; i < content.length; i++) {
    if (content[i] === '{') {
      depth++;
    } else if (content[i] === '}') {
      depth--;

      if (depth === 0) {
        blockEnd = i + 1;
        break;
      }
    }
  }

  /* Skip trailing comma if present */
  let end: number = blockEnd;

  while (end < content.length && (content[end] === ' ' || content[end] === '\t')) {
    end++;
  }

  if (end < content.length && content[end] === ',') {
    end++;
  }

  /* Include trailing newline */
  while (end < content.length && (content[end] === ' ' || content[end] === '\t')) {
    end++;
  }

  if (end < content.length && content[end] === '\n') {
    end++;
  }

  /* Also check for comma on previous line (if this block is the last entry) */
  const afterBlock: string = content.slice(end).trimStart();

  if (afterBlock.startsWith('}')) {
    let commaCheck: number = lineStart - 1;

    while (commaCheck >= 0 && (content[commaCheck] === '\n' || content[commaCheck] === '\r')) {
      commaCheck--;
    }

    if (commaCheck >= 0 && content[commaCheck] === ',') {
      lineStart = commaCheck;

      return { range: { start: lineStart, end }, text: '\n' };
    }
  }

  return { range: { start: lineStart, end }, text: '' };
}

/**
 * Build a fix that replaces text within a JSON string value.
 *
 * Finds the value for `key` under `parentKey` and replaces `search` with `replacement`.
 *
 * @param {string} content - Raw file content
 * @param {string} key - The JSON key (e.g., script name)
 * @param {string} search - Text to find in the value
 * @param {string} replacement - Text to replace with
 * @param {string} parentKey - Parent key to scope search (e.g., "scripts")
 * @returns {LintFix} Fix that replaces text or NO_FIX
 */
export function buildReplaceInJsonValueFix(
  content: string,
  key: string,
  search: string,
  replacement: string,
  parentKey: string,
): LintFix {
  const parentIdx: number = content.indexOf(`"${parentKey}"`);

  if (parentIdx === -1) {
    return NO_FIX;
  }

  const keyPattern: string = `"${key}"`;
  const keyIdx: number = content.indexOf(keyPattern, parentIdx);

  if (keyIdx === -1) {
    return NO_FIX;
  }

  /* Find the value string after the colon */
  const colonIdx: number = content.indexOf(':', keyIdx + keyPattern.length);

  if (colonIdx === -1) {
    return NO_FIX;
  }

  /* Find the opening quote of the value */
  let valueStart: number = colonIdx + 1;

  while (valueStart < content.length && content[valueStart] !== '"') {
    valueStart++;
  }

  if (valueStart >= content.length) {
    return NO_FIX;
  }

  /* Find the search text within the value */
  const searchIdx: number = content.indexOf(search, valueStart);

  if (searchIdx === -1) {
    return NO_FIX;
  }

  return {
    range: { start: searchIdx, end: searchIdx + search.length },
    text: replacement,
  };
}
