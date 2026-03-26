/**
 * External Tool: cargo-clippy
 *
 * Lints Rust source files using `cargo clippy`.
 * Parses GCC-style text output (`filename:line:column: severity: message`)
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for cargo-clippy short output format.
 *
 * Matches lines like:
 * `src/main.rs:10:5: warning: unused variable`
 * `src/lib.rs:3:1: error: cannot find value`
 */
const CLIPPY_LINE: RegExp = /^(.+?):(\d+):(\d+): (warning|error|note|help): (.+)$/;

/**
 * Transform cargo-clippy text output into LintResult[].
 *
 * cargo clippy with `--message-format=short` outputs GCC-style diagnostics:
 * `filename:line:column: severity: message`
 *
 * @param {string} output - Raw text output from cargo clippy
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCargoClippyOutput('src/main.rs:10:5: warning: unused variable `x`');
 * // results[0].ruleId === 'cargo-clippy/lint'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformCargoClippyOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = CLIPPY_LINE.exec(line.trim());
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const level: string = match[4] ?? 'warning';
    const message: string = match[5] ?? '';

    let severity: 'error' | 'warning' | 'info' = 'warning';
    if (level === 'error') {
      severity = 'error';
    } else if (level === 'note' || level === 'help') {
      severity = 'info';
    }

    results.push(createResult('cargo-clippy/lint', file, lineNum, column, severity, message));
  }

  return results;
}

/** cargo-clippy external tool definition. */
export const cargoClippyTool: ExternalTool = {
  args: ['clippy', '--message-format=short'],
  command: 'cargo',
  filePatterns: ['**/*.rs'],
  isAvailable(): boolean {
    return isCommandAvailable('cargo');
  },
  name: 'cargo-clippy',
  outputFormat: 'text',
  transform: transformCargoClippyOutput,
};
