/**
 * External Tool: Helm Lint
 *
 * Validates Helm charts using `helm lint`.
 * Parses text output lines prefixed with `[ERROR]`, `[WARNING]`, or `[INFO]`
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/** Regex for helm lint output: `[LEVEL] message` */
const HELM_LINE: RegExp = /^\[(ERROR|WARNING|INFO)\]\s+(.+)$/;

/**
 * Transform Helm lint text output into LintResult[].
 *
 * `helm lint` outputs lines prefixed with severity brackets:
 * - `[ERROR] templates/: parse error...`
 * - `[WARNING] chart/templates/deployment.yaml: ...`
 * - `[INFO] Chart.yaml: icon is recommended`
 *
 * @param {string} output - Raw text output from `helm lint`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformHelmLintOutput('[ERROR] templates/: parse error in deployment.yaml');
 * // results[0].ruleId === 'helm/lint'
 * // results[0].severity === 'error'
 * ```
 */
export function transformHelmLintOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = HELM_LINE.exec(stripped);

    if (!match) {
      continue;
    }

    const level: string = match[1] ?? 'ERROR';
    const message: string = match[2] ?? '';

    let severity: 'error' | 'warning' | 'info' = 'error';

    if (level === 'WARNING') {
      severity = 'warning';
    } else if (level === 'INFO') {
      severity = 'info';
    }

    results.push(createResult('helm/lint', 'Chart.yaml', 1, 1, severity, message));
  }

  return results;
}

/** Helm Lint external tool definition. */
export const helmLintTool: ExternalTool = {
  args: ['lint'],
  command: 'helm',
  filePatterns: ['**/Chart.yaml', '**/Chart.yml'],
  isAvailable(): boolean {
    return isCommandAvailable('helm');
  },
  name: 'helm-lint',
  outputFormat: 'text',
  transform: transformHelmLintOutput,
};
