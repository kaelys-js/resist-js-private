/**
 * External Tool: Docker Compose
 *
 * Validates Docker Compose files (docker-compose*.yml, docker-compose*.yaml)
 * using `docker compose config --quiet`.
 * Any non-empty output indicates a validation error.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform Docker Compose validation output into LintResult[].
 *
 * `docker compose config --quiet` produces no output on success.
 * Any non-empty output indicates a validation error — each non-empty
 * line is treated as an error diagnostic.
 *
 * @param {string} output - Raw text output from `docker compose config --quiet`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformDockerComposeOutput('services.web.ports contains an invalid type');
 * // results[0].ruleId === 'docker-compose/validate'
 * ```
 */
export function transformDockerComposeOutput(output: string): LintResult[] {
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

    results.push(
      createResult('docker-compose/validate', 'docker-compose.yml', 1, 1, 'error', stripped),
    );
  }

  return results;
}

/** Docker Compose external tool definition. */
export const dockerComposeTool: ExternalTool = {
  args: ['compose', 'config', '--quiet'],
  command: 'docker',
  filePatterns: ['**/docker-compose*.yml', '**/docker-compose*.yaml'],
  isAvailable(): boolean {
    return isCommandAvailable('docker');
  },
  name: 'docker-compose',
  outputFormat: 'text',
  transform: transformDockerComposeOutput,
};
