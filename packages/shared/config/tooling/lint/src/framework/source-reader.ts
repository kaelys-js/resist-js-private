/**
 * Custom Linter — Source Code Reader
 *
 * Provides utilities for reading source code snippets and generating
 * display annotations for lint diagnostics. Used by the text formatter
 * to show oxlint-style source context with caret markers.
 *
 * @module
 */

import { readFile } from 'node:fs/promises';

import * as v from 'valibot';

// =============================================================================
// Types
// =============================================================================

/** Schema for a source line with its line number. */
export const SourceLineSchema = v.strictObject({
  /** 1-based line number. */
  lineNumber: v.number(),
  /** Text content of the line. */
  text: v.string(),
});

/** A source line with its line number. See {@link SourceLineSchema}. */
export type SourceLine = v.InferOutput<typeof SourceLineSchema>;

// =============================================================================
// Source Extraction
// =============================================================================

/**
 * Extract source lines from content around a target line.
 *
 * Returns an array of source lines with their 1-based line numbers.
 * Context lines extend the window before and after the target.
 *
 * @param {string} content - Full file content
 * @param {number} line - 1-based target line number
 * @param {number} contextLines - Number of context lines before and after (default: 0)
 * @returns {SourceLine[]} Array of source lines with line numbers
 *
 * @example
 * ```typescript
 * const lines = extractSourceLines('line1\nline2\nline3', 2, 1);
 * // [{ lineNumber: 1, text: 'line1' }, { lineNumber: 2, text: 'line2' }, { lineNumber: 3, text: 'line3' }]
 * ```
 */
export function extractSourceLines(
  content: string,
  line: number,
  contextLines: number = 0,
): SourceLine[] {
  const allLines: string[] = content.split('\n');

  if (line < 1 || line > allLines.length) {
    return [];
  }

  /* Handle trailing newline producing an empty last element */
  if (allLines.at(-1) === '' && line === allLines.length) {
    return [];
  }

  const startLine: number = Math.max(1, line - contextLines);
  const endLine: number = Math.min(allLines.length, line + contextLines);
  const result: SourceLine[] = [];

  for (let i: number = startLine; i <= endLine; i++) {
    result.push({
      lineNumber: i,
      text: allLines[i - 1] ?? '',
    });
  }

  return result;
}

// =============================================================================
// File Reading
// =============================================================================

/**
 * Read source lines from a file around a target line.
 *
 * Reads the file, extracts lines around the target line number,
 * and returns them with their line numbers. Returns `undefined`
 * if the file cannot be read or the line is out of range.
 *
 * @param {string} filePath - Absolute file path
 * @param {number} line - 1-based target line number
 * @param {number} contextLines - Number of context lines before and after (default: 0)
 * @returns {Promise<SourceLine[] | undefined>} Source lines, or undefined if unavailable
 *
 * @example
 * ```typescript
 * const lines = await readSourceSnippet('/path/to/file.ts', 10, 2);
 * if (lines) {
 *   for (const srcLine of lines) {
 *     console.log(`${srcLine.lineNumber} | ${srcLine.text}`);
 *   }
 * }
 * ```
 */
export async function readSourceSnippet(
  filePath: string,
  line: number,
  contextLines: number = 0,
): Promise<SourceLine[] | undefined> {
  try {
    const content: string = await readFile(filePath, 'utf8');
    const lines: SourceLine[] = extractSourceLines(content, line, contextLines);
    return lines.length > 0 ? lines : undefined;
  } catch {
    return undefined;
  }
}

// =============================================================================
// Caret Markers
// =============================================================================

/**
 * Build a caret marker string that underlines a column range.
 *
 * Creates a string with leading spaces and caret characters (`^`)
 * positioned to highlight the specified column range. Column values
 * are 1-based to match lint result conventions.
 *
 * @param {number} column - 1-based start column
 * @param {number} endColumn - 1-based end column (optional, highlights single char if omitted)
 * @returns {string} String of spaces and carets (e.g., "    ^^^^")
 *
 * @example
 * ```typescript
 * const marker = buildCaretMarker(5, 9);
 * // "    ^^^^"
 * ```
 */
export function buildCaretMarker(column: number, endColumn?: number): string {
  const start: number = Math.max(0, column - 1);
  const end: number = endColumn ? Math.max(start + 1, endColumn - 1) : start + 1;
  const padding: string = ' '.repeat(start);
  const carets: string = '^'.repeat(end - start);
  return `${padding}${carets}`;
}
