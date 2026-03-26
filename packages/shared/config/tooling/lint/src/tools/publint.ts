/**
 * External Tool: publint
 *
 * Lints npm packages for publishing best practices using publint.
 * Outputs JSON format, which is transformed into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * A single message entry from publint JSON output.
 *
 * @example
 * ```typescript
 * const msg: PublintMessage = {
 *   code: 'MISSING_EXPORTS',
 *   path: './dist/index.js',
 *   type: 'error',
 *   args: { actualPath: './dist/index.js' },
 * };
 * ```
 */
type PublintMessage = {
  /** Diagnostic code identifying the issue (e.g., 'MISSING_EXPORTS'). */
  code: string;
  /** File or field path related to the issue. */
  path?: string;
  /** Severity type: 'error', 'warning', or 'suggestion'. */
  type: string;
  /** Additional arguments providing context for the issue. */
  args?: Record<string, unknown>;
};

/**
 * Map publint severity type to LintResult severity.
 *
 * @param {string} type - publint type ('error', 'warning', 'suggestion')
 * @returns {'error' | 'warning' | 'info'} Mapped severity level
 */
function mapSeverity(type: string): 'error' | 'warning' | 'info' {
  if (type === 'error') {
    return 'error';
  }
  if (type === 'warning') {
    return 'warning';
  }
  return 'info';
}

/**
 * Transform publint JSON output into LintResult[].
 *
 * publint JSON output structure:
 * `{ messages: [{ code, path, type, args }] }`
 *
 * @param {string} output - Raw JSON output from publint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const json = '{"messages":[{"code":"MISSING_EXPORTS","path":"./dist/index.js","type":"error","args":{}}]}';
 * const results = transformPublintOutput(json);
 * // results[0].ruleId === 'publint/MISSING_EXPORTS'
 * ```
 */
export function transformPublintOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return [];
  }

  const results: LintResult[] = [];
  const messages: unknown[] = (parsed.messages as unknown[]) ?? [];

  for (const msg of messages) {
    const entry: PublintMessage = msg as PublintMessage;
    const code: string = entry.code ?? 'unknown';
    const path: string = entry.path ?? 'package.json';
    const type: string = entry.type ?? 'warning';

    results.push(
      createResult(
        `publint/${code}`,
        path,
        1,
        1,
        mapSeverity(type),
        `publint: ${code}${path ? ` at ${path}` : ''}`,
        {
          tip: 'Review package.json exports and files configuration',
        },
      ),
    );
  }

  return results;
}

/** publint external tool definition. */
export const publintTool: ExternalTool = {
  args: ['--format', 'json'],
  command: 'publint',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('publint');
  },
  name: 'publint',
  outputFormat: 'json',
  transform: transformPublintOutput,
};
