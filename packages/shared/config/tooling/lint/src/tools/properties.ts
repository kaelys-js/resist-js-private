/**
 * External Tool: Properties File Syntax Validator
 *
 * Custom syntax checker for Java-style .properties files.
 * Validates key=value and key:value pairs.
 * Uses a placeholder command since validation is custom.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for properties validation output: `filename:line: message`
 */
const PROPERTIES_LINE: RegExp = /^(.+?):(\d+):\s+(.+)$/;

/**
 * Transform properties syntax checker output into LintResult[].
 *
 * Parses output in the format:
 * `app.properties:8: Invalid property line`
 *
 * @param {string} output - Raw text output from the properties validator
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformPropertiesOutput('app.properties:8: Invalid property line');
 * // results[0].ruleId === 'properties/syntax'
 * ```
 */
export function transformPropertiesOutput(output: string): LintResult[] {
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

    const match: RegExpMatchArray | null = PROPERTIES_LINE.exec(stripped);
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const message: string = match[3] ?? '';

    results.push(createResult('properties/syntax', file, lineNum, 1, 'error', message));
  }

  return results;
}

/** Properties file syntax validator external tool definition (custom, always available). */
export const propertiesTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/*.properties'],
  isAvailable(): boolean {
    return true;
  },
  name: 'properties',
  outputFormat: 'text',
  transform: transformPropertiesOutput,
};
