/**
 * Tests for source code reader utilities.
 *
 * @module
 */

import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  extractSourceLines,
  readSourceSnippet,
  buildCaretMarker,
  type SourceLine,
} from './source-reader.ts';

// =============================================================================
// Constants
// =============================================================================

/** Directory containing this file (for relative test paths). */
const THIS_DIR: string = import.meta.dirname;

/** Multi-line test content. */
const TEST_CONTENT: string = [
  'const a = 1;',
  'const b = 2;',
  'const c = 3;',
  'const d = 4;',
  'const e = 5;',
].join('\n');

// =============================================================================
// extractSourceLines
// =============================================================================

describe('extractSourceLines', () => {
  it('extracts a single line with no context', () => {
    const lines: SourceLine[] = extractSourceLines(TEST_CONTENT, 3);
    expect(lines).toEqual([{ lineNumber: 3, text: 'const c = 3;' }]);
  });

  it('extracts lines with context around target', () => {
    const lines: SourceLine[] = extractSourceLines(TEST_CONTENT, 3, 1);
    expect(lines).toEqual([
      { lineNumber: 2, text: 'const b = 2;' },
      { lineNumber: 3, text: 'const c = 3;' },
      { lineNumber: 4, text: 'const d = 4;' },
    ]);
  });

  it('clamps context at start of file', () => {
    const lines: SourceLine[] = extractSourceLines(TEST_CONTENT, 1, 2);
    expect(lines).toEqual([
      { lineNumber: 1, text: 'const a = 1;' },
      { lineNumber: 2, text: 'const b = 2;' },
      { lineNumber: 3, text: 'const c = 3;' },
    ]);
  });

  it('clamps context at end of file', () => {
    const lines: SourceLine[] = extractSourceLines(TEST_CONTENT, 5, 2);
    expect(lines).toEqual([
      { lineNumber: 3, text: 'const c = 3;' },
      { lineNumber: 4, text: 'const d = 4;' },
      { lineNumber: 5, text: 'const e = 5;' },
    ]);
  });

  it('returns empty array for line below 1', () => {
    const lines: SourceLine[] = extractSourceLines(TEST_CONTENT, 0);
    expect(lines).toEqual([]);
  });

  it('returns empty array for line beyond file length', () => {
    const lines: SourceLine[] = extractSourceLines(TEST_CONTENT, 99);
    expect(lines).toEqual([]);
  });

  it('returns empty array for empty content', () => {
    const lines: SourceLine[] = extractSourceLines('', 1);
    expect(lines).toEqual([]);
  });

  it('handles single-line content', () => {
    const lines: SourceLine[] = extractSourceLines('hello', 1);
    expect(lines).toEqual([{ lineNumber: 1, text: 'hello' }]);
  });

  it('handles content with trailing newline', () => {
    const lines: SourceLine[] = extractSourceLines('line1\nline2\n', 2);
    expect(lines).toEqual([{ lineNumber: 2, text: 'line2' }]);
  });

  it('preserves whitespace in source lines', () => {
    const lines: SourceLine[] = extractSourceLines('  indented\n\ttabbed', 1);
    expect(lines[0]?.text).toBe('  indented');
  });
});

// =============================================================================
// readSourceSnippet
// =============================================================================

describe('readSourceSnippet', () => {
  it('reads source lines from a real file', async () => {
    const lines = await readSourceSnippet(join(THIS_DIR, 'source-reader.ts'), 1);
    expect(lines).toBeDefined();
    expect(lines?.length).toBe(1);
    expect(lines?.[0]?.lineNumber).toBe(1);
  });

  it('reads source lines with context', async () => {
    const lines = await readSourceSnippet(join(THIS_DIR, 'source-reader.ts'), 5, 2);
    expect(lines).toBeDefined();
    expect(lines!.length).toBeGreaterThanOrEqual(3);
  });

  it('returns undefined for non-existent file', async () => {
    const lines = await readSourceSnippet('/non/existent/file.ts', 1);
    expect(lines).toBeUndefined();
  });

  it('returns undefined for out-of-range line', async () => {
    const lines = await readSourceSnippet(join(THIS_DIR, 'source-reader.ts'), 999_999);
    expect(lines).toBeUndefined();
  });
});

// =============================================================================
// buildCaretMarker
// =============================================================================

describe('buildCaretMarker', () => {
  it('builds marker for column range', () => {
    const marker: string = buildCaretMarker(5, 9);
    expect(marker).toBe('    ^^^^');
  });

  it('builds single-char marker when no endColumn', () => {
    const marker: string = buildCaretMarker(3);
    expect(marker).toBe('  ^');
  });

  it('builds marker at column 1', () => {
    const marker: string = buildCaretMarker(1);
    expect(marker).toBe('^');
  });

  it('builds marker with endColumn equal to column', () => {
    const marker: string = buildCaretMarker(5, 5);
    expect(marker).toBe('    ^');
  });

  it('builds wide marker for long spans', () => {
    const marker: string = buildCaretMarker(1, 20);
    expect(marker).toBe('^'.repeat(19));
  });

  it('handles column 1 with endColumn', () => {
    const marker: string = buildCaretMarker(1, 5);
    expect(marker).toBe('^^^^');
  });
});
