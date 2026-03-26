/**
 * External Tool: Nomad Job Validate
 *
 * Validates Nomad job specification files (.nomad) using `nomad job validate`.
 * If the output does NOT contain "validation successful", an error result is created.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform Nomad job validate output into LintResult[].
 *
 * `nomad job validate` outputs a message containing "validation successful"
 * when the job spec is valid. If the output does NOT contain
 * "validation successful", the entire output is treated as an error diagnostic.
 *
 * @param {string} output - Raw text output from `nomad job validate`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformNomadOutput('Error validating: missing required field "datacenters"');
 * // results[0].ruleId === 'nomad/validate'
 * // results[0].severity === 'error'
 * ```
 */
export function transformNomadOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  /* Success: output contains "validation successful" */
  if (trimmed.toLowerCase().includes('validation successful')) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    results.push(createResult('nomad/validate', 'job.nomad', 1, 1, 'error', stripped));
  }

  return results;
}

/** Nomad Job Validate external tool definition. */
export const nomadTool: ExternalTool = {
  args: ['job', 'validate'],
  command: 'nomad',
  filePatterns: ['**/*.nomad'],
  isAvailable(): boolean {
    return isCommandAvailable('nomad');
  },
  name: 'nomad',
  outputFormat: 'text',
  transform: transformNomadOutput,
};
