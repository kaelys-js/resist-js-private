/**
 * External Tool: Helm Values Validator
 *
 * Validates Helm values files (values.yaml, values.yml) using `helm template`.
 * If the output contains "Error:", it is parsed as a validation failure.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform Helm template validation output into LintResult[].
 *
 * `helm template . --values <file>` produces rendered templates on success.
 * If validation fails, the output contains "Error:" lines describing the failure.
 *
 * Only lines containing "Error:" are extracted as diagnostics.
 * Clean output (no errors) produces an empty result set.
 *
 * @param {string} output - Raw text output from `helm template`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformHelmValuesOutput(
 *   'Error: YAML parse error on values.yaml: mapping values are not allowed in this context'
 * );
 * // results[0].ruleId === 'helm-values/validate'
 * // results[0].severity === 'error'
 * ```
 */
export function transformHelmValuesOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  /* If no "Error:" found in the output, it is a clean template render */
  if (!trimmed.includes('Error:')) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const stripped: string = line.trim();

    if (stripped.length === 0) {
      continue;
    }

    /* Only capture lines that contain "Error:" */
    if (!stripped.includes('Error:')) {
      continue;
    }

    /*
     * Extract the error message — strip the "Error: " prefix if present
     * at the start of the line for a cleaner diagnostic message.
     */
    const message: string = stripped.startsWith('Error:')
      ? stripped.slice('Error:'.length).trim()
      : stripped;

    results.push(createResult('helm-values/validate', 'values.yaml', 1, 1, 'error', message));
  }

  return results;
}

/** Helm Values Validator external tool definition. */
export const helmValuesTool: ExternalTool = {
  args: ['template', '.', '--values'],
  command: 'helm',
  filePatterns: ['**/values.yaml', '**/values.yml'],
  isAvailable(): boolean {
    return isCommandAvailable('helm');
  },
  name: 'helm-values',
  outputFormat: 'text',
  transform: transformHelmValuesOutput,
};
