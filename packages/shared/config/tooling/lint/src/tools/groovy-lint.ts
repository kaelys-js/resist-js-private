/**
 * External Tool: npm-groovy-lint
 *
 * Lints Groovy and Gradle files (.groovy, .gradle) using npm-groovy-lint.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * JSON structure:
 * ```json
 * {
 *   "files": {
 *     "filename": {
 *       "errors": [
 *         { "line": 1, "column": 5, "severity": "error", "msg": "...", "rule": "RuleName" }
 *       ]
 *     }
 *   }
 * }
 * ```
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform npm-groovy-lint JSON output into LintResult[].
 *
 * npm-groovy-lint with `--output json` produces a JSON object with a `files`
 * map. Each key is a filename, and each value contains an `errors` array
 * with `{ line, column, severity, msg, rule }` entries.
 *
 * @param {string} output - Raw JSON output from npm-groovy-lint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const json = '{"files":{"build.gradle":{"errors":[{"line":5,"column":1,"severity":"warning","msg":"Unused import","rule":"UnusedImport"}]}}}';
 * const results = transformGroovyLintOutput(json);
 * // results[0].ruleId === 'groovy-lint/UnusedImport'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformGroovyLintOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return [];
  }

  const root: Record<string, unknown> = parsed as Record<string, unknown>;
  const files: Record<string, unknown> = (root.files as Record<string, unknown>) ?? {};

  const results: LintResult[] = [];

  for (const [filename, fileData] of Object.entries(files)) {
    const fileObj: Record<string, unknown> = fileData as Record<string, unknown>;
    const errors: unknown[] = (fileObj.errors as unknown[]) ?? [];

    for (const err of errors) {
      const obj: Record<string, unknown> = err as Record<string, unknown>;
      const line: number = (obj.line as number) ?? 1;
      const column: number = (obj.column as number) ?? 1;
      const severityRaw: string = (obj.severity as string) ?? 'warning';
      const msg: string = (obj.msg as string) ?? '';
      const rule: string = (obj.rule as string) ?? 'unknown';

      let severity: 'error' | 'warning' | 'info' = 'warning';

      if (severityRaw === 'error') {
        severity = 'error';
      } else if (severityRaw === 'info') {
        severity = 'info';
      }

      results.push(createResult(`groovy-lint/${rule}`, filename, line, column, severity, msg));
    }
  }

  return results;
}

/** npm-groovy-lint external tool definition. */
export const groovyLintTool: ExternalTool = {
  args: ['--output', 'json'],
  command: 'npm-groovy-lint',
  filePatterns: ['**/*.groovy', '**/*.gradle'],
  isAvailable(): boolean {
    return isCommandAvailable('npm-groovy-lint');
  },
  name: 'groovy-lint',
  outputFormat: 'json',
  transform: transformGroovyLintOutput,
};
