/**
 * External Tool: Cargo TOML Validator
 *
 * Validates Cargo.toml files using Taplo for TOML syntax checking.
 * Additionally checks for the presence of a `[package]` or `[workspace]` section.
 * Parses taplo-format output (`error[rule]: message  --> file:line:col`) into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for taplo lint output format.
 *
 * Matches lines like: `error[expected_equals]: expected '='  --> Cargo.toml:3:1`
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
 * Transform Cargo.toml lint output into LintResult[].
 *
 * Parses taplo-format output lines and also performs an additional
 * structural check — Cargo.toml files must contain either a `[package]`
 * or `[workspace]` section to be valid.
 *
 * Lines that do not match the taplo format are silently skipped.
 *
 * @param {string} output - Raw text output from taplo lint or custom checks
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCargoTomlOutput(
 *   'error[expected_equals]: expected `=`  --> Cargo.toml:3:1'
 * );
 * // results[0].ruleId === 'cargo-toml/lint'
 * // results[0].severity === 'error'
 * ```
 */
export function transformCargoTomlOutput(output: string): LintResult[] {
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
    const file: string = match[4] ?? 'Cargo.toml';
    const lineNum: number = Number.parseInt(match[5] ?? '1', 10);
    const column: number = Number.parseInt(match[6] ?? '1', 10);

    results.push(
      createResult(
        `cargo-toml/lint`,
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
 * Check a Cargo.toml file for required section presence.
 *
 * Valid Cargo.toml files must contain either a `[package]` section
 * (for library/binary crates) or a `[workspace]` section (for workspace roots).
 *
 * @param {string} filename - Path to the Cargo.toml file
 * @param {string} content - Raw file content to check
 * @returns {LintResult[]} Lint results for missing sections
 *
 * @example
 * ```typescript
 * const results = checkCargoTomlSections('Cargo.toml', '[dependencies]\nfoo = "1.0"');
 * // results[0].message includes '[package]' or '[workspace]'
 * ```
 */
export function checkCargoTomlSections(filename: string, content: string): LintResult[] {
  const results: LintResult[] = [];

  const hasPackage: boolean = /^\[package\]/m.test(content);
  const hasWorkspace: boolean = /^\[workspace\]/m.test(content);

  if (!hasPackage && !hasWorkspace) {
    results.push(
      createResult(
        'cargo-toml/lint',
        filename,
        1,
        1,
        'error',
        'Cargo.toml must contain a [package] or [workspace] section',
      ),
    );
  }

  return results;
}

/** Cargo TOML external tool definition. */
export const cargoTomlTool: ExternalTool = {
  args: ['lint'],
  command: 'taplo',
  filePatterns: ['**/Cargo.toml'],
  isAvailable(): boolean {
    return isCommandAvailable('taplo');
  },
  name: 'cargo-toml',
  outputFormat: 'text',
  transform: transformCargoTomlOutput,
};
