/**
 * Shared helpers for building LintFix objects that edit package.json files.
 *
 * These helpers read the raw file content synchronously and compute byte
 * offsets for deleting JSON key-value entries or entire blocks.
 *
 * @module
 */

import { readFileSync } from 'node:fs';

import { NO_OP_FIX, type LintFix } from '@/lint/framework/types.ts';

/** No-op fix sentinel. */
export const NO_FIX: LintFix = NO_OP_FIX;

/**
 * Read raw file content synchronously. Returns empty string on error.
 *
 * @param {string} filePath - Absolute file path
 * @returns {string} File content or empty string
 */
export function readContent(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8');
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
  const braceIdx: number = content.indexOf('{', keyIdx + keyPattern.length);

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
 * Derive the vitest project name from a package.json file path.
 *
 * Convention: take path segments after `packages/(shared|products)/`,
 * join with `-`.  E.g. `packages/shared/schemas/common/package.json` → `schemas-common`.
 *
 * @param {string} filePath - Absolute path to package.json
 * @returns {string} Derived vitest project name, or empty string on failure
 */
export function deriveVitestProjectName(filePath: string): string {
  const normalized: string = filePath.replaceAll('\\', '/');
  const markers: readonly string[] = ['packages/shared/', 'packages/products/'];

  for (const marker of markers) {
    const idx: number = normalized.indexOf(marker);

    if (idx !== -1) {
      const rest: string = normalized.slice(idx + marker.length);
      const segments: string[] = [];

      for (const s of rest.split('/')) {
        if (s !== '' && s !== 'package.json' && s !== 'tsconfig.json') {
          segments.push(s);
        }
      }

      if (segments.length > 0) {
        return segments.join('-');
      }
    }
  }

  return '';
}

/**
 * Build a fix that inserts a new JSON key-value entry into an existing parent block.
 *
 * Finds the last entry in the parent block and inserts the new entry after it
 * (adding a trailing comma to the previous last entry).
 *
 * @param {string} content - Raw file content
 * @param {string} key - New key to insert
 * @param {string} value - Value string (will be JSON-quoted)
 * @param {string} parentKey - Parent block key (e.g., "scripts")
 * @returns {LintFix} Fix that inserts the entry or NO_FIX
 */
export function buildInsertJsonEntryFix(
  content: string,
  key: string,
  value: string,
  parentKey: string,
): LintFix {
  const parentIdx: number = content.indexOf(`"${parentKey}"`);

  if (parentIdx === -1) {
    return NO_FIX;
  }

  /* Find the opening brace of the parent block */
  const braceIdx: number = content.indexOf('{', parentIdx);

  if (braceIdx === -1) {
    return NO_FIX;
  }

  /* Find the matching closing brace */
  let depth: number = 0;
  let closingBrace: number = -1;

  for (let i: number = braceIdx; i < content.length; i++) {
    if (content[i] === '{') {
      depth++;
    } else if (content[i] === '}') {
      depth--;

      if (depth === 0) {
        closingBrace = i;
        break;
      }
    }
  }

  if (closingBrace === -1) {
    return NO_FIX;
  }

  /* Detect indentation: find the line containing the closing brace */
  let closingLineStart: number = closingBrace;

  while (closingLineStart > 0 && content[closingLineStart - 1] !== '\n') {
    closingLineStart--;
  }

  const closingIndent: string =
    content.slice(closingLineStart, closingBrace).match(/^(\s*)/)?.[1] ?? '  ';
  const entryIndent: string = `${closingIndent}  `;

  /* Check if block is empty (only whitespace between braces) */
  const blockContent: string = content.slice(braceIdx + 1, closingBrace).trim();
  const newEntry: string = `${entryIndent}"${key}": "${value}"`;

  if (blockContent === '') {
    /* Empty block: insert between braces */
    return {
      range: { start: braceIdx + 1, end: closingBrace },
      text: `\n${newEntry}\n${closingIndent}`,
    };
  }

  /* Non-empty block: find the last non-whitespace char before closing brace */
  let lastContentIdx: number = closingBrace - 1;

  while (lastContentIdx > braceIdx && /\s/.test(content[lastContentIdx] ?? '')) {
    lastContentIdx--;
  }

  /* Insert after last content with comma */
  const insertPoint: number = lastContentIdx + 1;

  return {
    range: { start: insertPoint, end: closingBrace },
    text: `,\n${newEntry}\n${closingIndent}`,
  };
}

/**
 * Build a fix that sets a top-level JSON field (insert or replace).
 *
 * If the field exists, replaces its value. If not, inserts after the opening `{`.
 *
 * @param {string} content - Raw file content (JSON)
 * @param {string} key - JSON key to set
 * @param {string} rawValue - Raw JSON value text (e.g., `"../tsconfig.json"` or `["src"]`)
 * @returns {LintFix} Fix or NO_FIX
 */
export function buildSetJsonFieldFix(content: string, key: string, rawValue: string): LintFix {
  const keyPattern: string = `"${key}"`;
  const keyIdx: number = content.indexOf(keyPattern);

  if (keyIdx !== -1) {
    /* Key exists — replace the value */
    const colonIdx: number = content.indexOf(':', keyIdx + keyPattern.length);

    if (colonIdx === -1) {
      return NO_FIX;
    }

    /* Find the start of the value (skip whitespace) */
    let valueStart: number = colonIdx + 1;

    while (valueStart < content.length && content[valueStart] === ' ') {
      valueStart++;
    }

    /* Determine value end based on type */
    if (content[valueStart] === '"') {
      /* String value — find closing quote */
      let valueEnd: number = valueStart + 1;

      while (valueEnd < content.length && content[valueEnd] !== '"') {
        if (content[valueEnd] === '\\') {
          valueEnd++;
        }

        valueEnd++;
      }

      if (valueEnd < content.length) {
        valueEnd++; /* include closing quote */
      }

      return { range: { start: valueStart, end: valueEnd }, text: rawValue };
    } else if (content[valueStart] === '[') {
      /* Array value — find matching ] */
      let bracketDepth: number = 0;
      let valueEnd: number = valueStart;

      for (let i: number = valueStart; i < content.length; i++) {
        if (content[i] === '[') {
          bracketDepth++;
        } else if (content[i] === ']') {
          bracketDepth--;

          if (bracketDepth === 0) {
            valueEnd = i + 1;
            break;
          }
        }
      }

      return { range: { start: valueStart, end: valueEnd }, text: rawValue };
    }

    return NO_FIX;
  }

  /* Key does not exist — insert after opening { */
  const openBrace: number = content.indexOf('{');

  if (openBrace === -1) {
    return NO_FIX;
  }

  /* Find what's after the opening brace to determine if we need a comma */
  let afterBrace: number = openBrace + 1;

  while (afterBrace < content.length && /\s/.test(content[afterBrace] ?? '')) {
    afterBrace++;
  }

  const needsComma: boolean = afterBrace < content.length && content[afterBrace] !== '}';
  const comma: string = needsComma ? ',' : '';
  const insertion: string = `\n  "${key}": ${rawValue}${comma}`;

  return {
    range: { start: openBrace + 1, end: openBrace + 1 },
    text: insertion,
  };
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
