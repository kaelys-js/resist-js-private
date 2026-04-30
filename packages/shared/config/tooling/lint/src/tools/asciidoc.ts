/**
 * External Tool: Asciidoctor
 *
 * Validates AsciiDoc files (.adoc) using asciidoctor in verbose mode.
 * Parses text output (warnings/errors) into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for asciidoctor warning/error output lines.
 *
 * Matches lines like:
 * `asciidoctor: WARNING: guide.adoc:12: unterminated listing block`
 * `asciidoctor: ERROR: manual.adoc:5: include file not found: missing.adoc`
 */
const ASCIIDOC_LINE: RegExp = /^asciidoctor:\s+(WARNING|ERROR):\s+(.+?):(\d+):\s+(.+)$/;

/**
 * Transform asciidoctor verbose text output into LintResult[].
 *
 * asciidoctor with `-o /dev/null -v` outputs diagnostics to stderr in the format:
 * `asciidoctor: WARNING: file:line: message`
 * `asciidoctor: ERROR: file:line: message`
 *
 * Lines that don't match the expected pattern (progress output, blank lines)
 * are silently skipped.
 *
 * @param {string} output - Raw text output from asciidoctor (stderr)
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformAsciidocOutput('asciidoctor: WARNING: guide.adoc:12: unterminated listing block');
 * // results[0].ruleId === 'asciidoctor/check'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformAsciidocOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const stripped: string = line.trim();

    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = ASCIIDOC_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const level: string = match[1] ?? 'WARNING';
    const file: string = match[2] ?? '';
    const lineNum: number = Number.parseInt(match[3] ?? '1', 10);
    const message: string = match[4] ?? '';

    const severity: 'error' | 'warning' = level === 'ERROR' ? 'error' : 'warning';

    results.push(createResult('asciidoctor/check', file, lineNum, 1, severity, message));
  }

  return results;
}

/** Asciidoctor external tool definition. */
export const asciidocTool: ExternalTool = {
  args: ['-o', '/dev/null', '-v'],
  command: 'asciidoctor',
  filePatterns: ['**/*.adoc'],
  isAvailable(): boolean {
    return isCommandAvailable('asciidoctor');
  },
  name: 'asciidoctor',
  outputFormat: 'text',
  transform: transformAsciidocOutput,
};
