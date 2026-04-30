/**
 * External Tool: Reason Formatter (refmt)
 *
 * Lints Reason source files (.re, .rei) using `refmt`.
 * Parses text output for format errors in the OCaml-style diagnostic format
 * (`File "filename", line N, characters C1-C2:` followed by the error message)
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for Reason refmt error output.
 *
 * Matches location lines like:
 * `File "src/App.re", line 10, characters 5-12:`
 *
 * The error message follows on the same or subsequent line.
 */
const REASON_LOCATION: RegExp = /^File "(.+?)", line (\d+), characters (\d+)-(\d+):(.*)$/;

/**
 * Transform refmt text output into LintResult[].
 *
 * When refmt encounters a syntax error, the output contains "Error" and
 * uses the OCaml-style diagnostic format:
 * `File "filename", line N, characters C1-C2:`
 * followed by the error message (possibly on the same line after the colon,
 * or on subsequent lines).
 *
 * If the output does not contain "Error", the file formatted successfully
 * and no results are returned.
 *
 * @param {string} output - Raw text output from refmt
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformReasonOutput('File "src/App.re", line 5, characters 0-10:\nError: Syntax error');
 * // results[0].ruleId === 'reason/format'
 * // results[0].severity === 'error'
 * ```
 */
export function transformReasonOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  /* If output does not contain "Error", formatting succeeded */
  if (!trimmed.includes('Error')) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (let i: number = 0; i < lines.length; i++) {
    const stripped: string = (lines[i] ?? '').trim();

    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = REASON_LOCATION.exec(stripped);

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const startChar: number = Number.parseInt(match[3] ?? '0', 10);
    const endChar: number = Number.parseInt(match[4] ?? '0', 10);
    const inlineMsg: string = (match[5] ?? '').trim();

    /* Collect the error message — it may be inline or on subsequent lines */
    let message: string = inlineMsg;

    if (message.length === 0) {
      /* Look ahead for the error message on following lines */
      const messageParts: string[] = [];

      for (let j: number = i + 1; j < lines.length; j++) {
        const nextLine: string = (lines[j] ?? '').trim();

        if (nextLine.length === 0 || REASON_LOCATION.test(nextLine)) {
          break;
        }
        messageParts.push(nextLine);
      }
      message = messageParts.join(' ');
    }

    if (message.length === 0) {
      message = 'Format error';
    }

    const column: number = startChar + 1;

    results.push(
      createResult('reason/format', file, lineNum, column, 'error', message, {
        endColumn: endChar + 1,
      }),
    );
  }

  return results;
}

/** Reason formatter (refmt) external tool definition. */
export const reasonTool: ExternalTool = {
  args: ['--parse', 're', '--print', 're'],
  command: 'refmt',
  filePatterns: ['**/*.re', '**/*.rei'],
  isAvailable(): boolean {
    return isCommandAvailable('refmt');
  },
  name: 'reason',
  outputFormat: 'text',
  transform: transformReasonOutput,
};
