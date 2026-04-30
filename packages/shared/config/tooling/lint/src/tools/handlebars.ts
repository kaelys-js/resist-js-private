/**
 * External Tool: ember-template-lint
 *
 * Lints Handlebars template files (.hbs, .handlebars) using ember-template-lint.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform ember-template-lint JSON output into LintResult[].
 *
 * ember-template-lint with `--format json` outputs an object keyed by filename,
 * where each value is an array of diagnostic objects:
 * `{ "file.hbs": [{ line, column, severity, message, rule }] }`
 *
 * Severity mapping: 0 = off (skipped), 1 = warning, 2 = error.
 *
 * @param {string} output - Raw JSON output from ember-template-lint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformHandlebarsOutput('{"app.hbs":[{"line":5,"column":3,"severity":2,"message":"No bare strings","rule":"no-bare-strings"}]}');
 * // results[0].ruleId === 'handlebars/no-bare-strings'
 * // results[0].severity === 'error'
 * ```
 */
export function transformHandlebarsOutput(output: string): LintResult[] {
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

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return [];
  }

  const fileMap: Record<string, unknown> = parsed as Record<string, unknown>;
  const results: LintResult[] = [];

  for (const [filePath, diagnostics] of Object.entries(fileMap)) {
    if (!Array.isArray(diagnostics)) {
      continue;
    }

    for (const diag of diagnostics) {
      const obj: Record<string, unknown> = diag as Record<string, unknown>;
      const line: number = (obj.line as number) ?? 1;
      const column: number = (obj.column as number) ?? 1;
      const severityCode: number = (obj.severity as number) ?? 0;
      const message: string = (obj.message as string) ?? '';
      const rule: string = (obj.rule as string) ?? 'unknown';

      /* severity 0 = off — skip those */
      if (severityCode === 0) {
        continue;
      }

      const severity: 'error' | 'warning' = severityCode === 2 ? 'error' : 'warning';

      results.push(createResult(`handlebars/${rule}`, filePath, line, column, severity, message));
    }
  }

  return results;
}

/** ember-template-lint external tool definition. */
export const handlebarsTool: ExternalTool = {
  args: ['--format', 'json'],
  command: 'ember-template-lint',
  filePatterns: ['**/*.hbs', '**/*.handlebars'],
  isAvailable(): boolean {
    return isCommandAvailable('ember-template-lint');
  },
  name: 'handlebars',
  outputFormat: 'json',
  transform: transformHandlebarsOutput,
};
