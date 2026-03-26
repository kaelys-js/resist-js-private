/**
 * External Tool: xmllint
 *
 * Validates XML files (.xml) using `xmllint --noout` for syntax checking.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for xmllint parser error output.
 *
 * Matches lines like:
 * `config.xml:12: parser error : Opening and ending tag mismatch`
 * `data.xml:5: parser error : Premature end of data`
 */
const XMLLINT_LINE: RegExp = /^(.+?):(\d+):\s*parser error\s*:\s*(.+)$/;

/**
 * Transform xmllint text output into LintResult[].
 *
 * `xmllint --noout` outputs parser errors with lines like:
 * `filename:line: parser error : message`
 *
 * Lines that don't match the expected pattern (context lines showing
 * the XML source, caret indicators, blank lines) are silently skipped.
 *
 * @param {string} output - Raw text output from xmllint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformXmlOutput('config.xml:12: parser error : Opening and ending tag mismatch');
 * // results[0].ruleId === 'xml/syntax'
 * // results[0].line === 12
 * ```
 */
export function transformXmlOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = XMLLINT_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('xml/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** xmllint external tool definition. */
export const xmlTool: ExternalTool = {
  args: ['--noout'],
  command: 'xmllint',
  filePatterns: ['**/*.xml'],
  isAvailable(): boolean {
    return isCommandAvailable('xmllint');
  },
  name: 'xmllint',
  outputFormat: 'text',
  transform: transformXmlOutput,
};
