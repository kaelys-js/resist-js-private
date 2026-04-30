/**
 * External Tool: Oxlint
 *
 * Lints JavaScript and TypeScript files using oxlint (oxc-project).
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Svelte ambient declaration files (`*.svelte.d.ts`) use intentional
 * non-standard syntax (`export var [key: string]: unknown`) so that tsgo
 * resolves arbitrary named exports from `<script module>` blocks. The
 * existing tsgo runner already suppresses the resulting `TS1005` parse
 * error for the same files (`tools/tsgo.ts`'s `SVELTE_AMBIENT_PARSE_SUPPRESSION`).
 * Oxlint's parser also balks at the same line and emits a code-less
 * "Expected `,` or `]`" diagnostic, so we mirror the suppression here.
 */
const SVELTE_AMBIENT_PARSE_SUPPRESSION: RegExp = /svelte\.d\.ts$/;

/**
 * Transform oxlint JSON output into LintResult[].
 *
 * Oxlint JSON output is an object with a `diagnostics` array, each entry having:
 * `{ message, code, severity, url, help, filename, labels: [{ span: { line, column } }] }`
 *
 * @param {string} output - Raw JSON output from oxlint --format=json
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const output = JSON.stringify({ diagnostics: [], number_of_files: 0 });
 * const results = transformOxlintOutput(output);
 * // results === []
 * ```
 */
export function transformOxlintOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }

  const root: Record<string, unknown> = parsed as Record<string, unknown>;
  const diagnostics: unknown[] = (root.diagnostics as unknown[]) ?? [];

  const results: LintResult[] = [];

  for (const item of diagnostics) {
    const diag: Record<string, unknown> = item as Record<string, unknown>;
    const message: string = (diag.message as string) ?? '';
    const code: string = (diag.code as string) ?? '';
    const rawSeverity: string = (diag.severity as string) ?? 'warning';
    const url: string = (diag.url as string) ?? '';
    const help: string = (diag.help as string) ?? '';
    const filename: string = (diag.filename as string) ?? '';

    // Extract line/column from first label's span
    const labels: unknown[] = (diag.labels as unknown[]) ?? [];
    let line: number = 1;
    let column: number = 1;

    if (labels.length > 0) {
      const firstLabel: Record<string, unknown> = labels[0] as Record<string, unknown>;
      const span: Record<string, unknown> = (firstLabel.span as Record<string, unknown>) ?? {};
      line = (span.line as number) ?? 1;
      column = (span.column as number) ?? 1;
    }

    let severity: 'error' | 'warning' | 'info' = 'warning';

    if (rawSeverity === 'error') {
      severity = 'error';
    } else if (rawSeverity === 'info' || rawSeverity === 'help') {
      severity = 'info';
    }

    // Rule ID: oxlint uses format like "eslint(no-unused-vars)" — normalize to "oxlint/no-unused-vars"
    const ruleId: string = normalizeRuleId(code);

    // Suppress code-less parse errors from svelte.d.ts (intentional ambient syntax,
    // already suppressed in the tsgo runner — see SVELTE_AMBIENT_PARSE_SUPPRESSION
    // header comment).
    if (ruleId === 'oxlint/unknown' && SVELTE_AMBIENT_PARSE_SUPPRESSION.test(filename)) {
      continue;
    }

    results.push(
      createResult(ruleId, filename, line, column, severity, message, {
        tip: help || undefined,
        url: url || undefined,
      }),
    );
  }

  return results;
}

/**
 * Normalize an oxlint rule code to a consistent rule ID.
 *
 * Converts `"eslint(no-unused-vars)"` → `"oxlint/no-unused-vars"`,
 * `"typescript-eslint(no-explicit-any)"` → `"oxlint/no-explicit-any"`.
 *
 * @param {string} code - Raw oxlint rule code
 * @returns {string} Normalized rule ID prefixed with "oxlint/"
 *
 * @example
 * ```typescript
 * normalizeRuleId('eslint(no-unused-vars)'); // "oxlint/no-unused-vars"
 * ```
 */
function normalizeRuleId(code: string): string {
  // Extract the rule name from parentheses: "eslint(rule-name)" → "rule-name"
  const match: RegExpExecArray | null = /\(([^)]+)\)/.exec(code);

  if (match?.[1]) {
    return `oxlint/${match[1]}`;
  }
  // Fallback: use the code as-is
  if (code.length > 0) {
    return `oxlint/${code}`;
  }
  return 'oxlint/unknown';
}

/** Oxlint external tool definition. */
export const oxlintTool: ExternalTool = {
  args: ['--format=json'],
  command: 'oxlint',
  filePatterns: ['**/*.ts', '**/*.js', '**/*.mjs', '**/*.jsx', '**/*.tsx'],
  isAvailable(): boolean {
    return isCommandAvailable('oxlint');
  },
  name: 'oxlint',
  outputFormat: 'json',
  required: true,
  transform: transformOxlintOutput,
};
