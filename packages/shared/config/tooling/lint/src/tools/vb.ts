/**
 * External Tool: VB.NET (placeholder)
 *
 * Placeholder tool for Visual Basic .NET files (.vb).
 * VB.NET does not have a widely-adopted standalone CLI linter,
 * so this tool serves as a no-op placeholder that is always unavailable.
 *
 * The transform function always returns an empty array, and `isAvailable`
 * always returns `false`.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import type { LintResult } from '@/lint/framework/types.ts';

/**
 * Transform VB.NET tool output into LintResult[].
 *
 * This is a no-op placeholder — always returns an empty array.
 * VB.NET has no widely-adopted standalone CLI linter.
 *
 * @param {string} _output - Raw output (unused)
 * @returns {LintResult[]} Always returns an empty array
 *
 * @example
 * ```typescript
 * const results = transformVbOutput('anything');
 * // results === []
 * ```
 */
export function transformVbOutput(_output: string): LintResult[] {
  return [];
}

/** VB.NET placeholder external tool definition. */
export const vbTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/*.vb'],
  isAvailable(): boolean {
    return false;
  },
  name: 'vb',
  outputFormat: 'text',
  transform: transformVbOutput,
};
