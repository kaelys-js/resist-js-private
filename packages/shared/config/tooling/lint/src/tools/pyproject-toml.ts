/**
 * External Tool: pyproject.toml Validator
 *
 * Validates pyproject.toml files using Taplo for TOML syntax checking.
 * Additionally checks for the presence of a `[project]` or `[tool.poetry]` section.
 * Parses taplo-format output (`error[rule]: message  --> file:line:col`) into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for taplo lint output format.
 *
 * Matches lines like: `error[expected_equals]: expected '='  --> pyproject.toml:3:1`
 *
 * Captures:
 * - Group 1: severity level (error|warning)
 * - Group 2: rule name
 * - Group 3: message text
 * - Group 4: filename (optional)
 * - Group 5: line number (optional)
 * - Group 6: column number (optional)
 */
const TAPLO_LINE: RegExp = /^(error|warning)\[([^\]]*)\]:\s+(.+?)(?:\s+-->\s+(.+?):(\d+):(\d+))?$/;

/**
 * Transform pyproject.toml lint output into LintResult[].
 *
 * Parses taplo-format output lines and converts each match into a
 * structured lint result with the `pyproject-toml/lint` rule ID.
 *
 * Lines that do not match the taplo format are silently skipped.
 *
 * @param {string} output - Raw text output from taplo lint or custom checks
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformPyprojectTomlOutput(
 *   'error[expected_equals]: expected `=`  --> pyproject.toml:5:1'
 * );
 * // results[0].ruleId === 'pyproject-toml/lint'
 * // results[0].severity === 'error'
 * ```
 */
export function transformPyprojectTomlOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = TAPLO_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const level: string = match[1] ?? 'error';
    const rule: string = match[2] ?? 'unknown';
    const message: string = match[3] ?? '';
    const file: string = match[4] ?? 'pyproject.toml';
    const lineNum: number = Number.parseInt(match[5] ?? '1', 10);
    const column: number = Number.parseInt(match[6] ?? '1', 10);

    results.push(
      createResult(
        'pyproject-toml/lint',
        file,
        lineNum,
        column,
        level === 'error' ? 'error' : 'warning',
        `[${rule}] ${message}`,
      ),
    );
  }

  return results;
}

/**
 * Check a pyproject.toml file for required section presence.
 *
 * Valid pyproject.toml files should contain either a `[project]` section
 * (PEP 621 standard) or a `[tool.poetry]` section (Poetry-based projects).
 *
 * @param {string} filename - Path to the pyproject.toml file
 * @param {string} content - Raw file content to check
 * @returns {LintResult[]} Lint results for missing sections
 *
 * @example
 * ```typescript
 * const results = checkPyprojectTomlSections('pyproject.toml', '[tool.black]\nline-length = 88');
 * // results[0].message includes '[project]' or '[tool.poetry]'
 * ```
 */
export function checkPyprojectTomlSections(filename: string, content: string): LintResult[] {
  const results: LintResult[] = [];

  const hasProject: boolean = /^\[project\]/m.test(content);
  const hasPoetry: boolean = /^\[tool\.poetry\]/m.test(content);

  if (!hasProject && !hasPoetry) {
    results.push(
      createResult(
        'pyproject-toml/lint',
        filename,
        1,
        1,
        'warning',
        'pyproject.toml should contain a [project] or [tool.poetry] section',
      ),
    );
  }

  return results;
}

/** pyproject.toml external tool definition. */
export const pyprojectTomlTool: ExternalTool = {
  args: ['lint'],
  command: 'taplo',
  filePatterns: ['**/pyproject.toml'],
  isAvailable(): boolean {
    return isCommandAvailable('taplo');
  },
  name: 'pyproject-toml',
  outputFormat: 'text',
  transform: transformPyprojectTomlOutput,
};
