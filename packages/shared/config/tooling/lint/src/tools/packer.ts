/**
 * External Tool: Packer Validate
 *
 * Validates Packer templates (.pkr.hcl) using `packer validate`.
 * If the output does NOT contain "successfully", error lines are parsed.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform Packer validate output into LintResult[].
 *
 * `packer validate` outputs a success message containing "successfully"
 * when the template is valid. If the output does NOT contain "successfully",
 * each non-empty line is treated as an error diagnostic.
 *
 * @param {string} output - Raw text output from `packer validate`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformPackerOutput('Error: Missing required argument "source"');
 * // results[0].ruleId === 'packer/validate'
 * // results[0].severity === 'error'
 * ```
 */
export function transformPackerOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  /* Success: output contains "successfully" */
  if (trimmed.toLowerCase().includes('successfully')) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const stripped: string = line.trim();

    if (stripped.length === 0) {
      continue;
    }

    results.push(createResult('packer/validate', 'template.pkr.hcl', 1, 1, 'error', stripped));
  }

  return results;
}

/** Packer Validate external tool definition. */
export const packerTool: ExternalTool = {
  args: ['validate'],
  command: 'packer',
  filePatterns: ['**/*.pkr.hcl'],
  isAvailable(): boolean {
    return isCommandAvailable('packer');
  },
  name: 'packer',
  outputFormat: 'text',
  transform: transformPackerOutput,
};
