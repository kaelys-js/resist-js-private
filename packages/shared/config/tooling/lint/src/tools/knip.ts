/**
 * External Tool: knip
 *
 * Detects unused exports, dependencies, and files using knip.
 * Outputs JSON format, which is transformed into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';
import { format } from '@/lint/locale/schema.ts';

/**
 * A single knip JSON issue entry.
 *
 * @example
 * ```typescript
 * const issue: KnipIssue = {
 *   type: 'exports',
 *   filePath: 'src/utils.ts',
 *   symbol: 'unusedHelper',
 *   line: 42,
 *   col: 14,
 * };
 * ```
 */
type KnipIssue = {
  /** Issue type (e.g., 'exports', 'dependencies', 'files', 'types'). */
  type: string;
  /** File path where the issue was found. */
  filePath: string;
  /** Symbol name (for unused exports). */
  symbol?: string;
  /** Line number (1-based). */
  line?: number;
  /** Column number (1-based). */
  col?: number;
};

/**
 * Transform knip JSON output into LintResult[].
 *
 * knip JSON output structure:
 * `{ files: [...], dependencies: [...], exports: [{type, filePath, symbol, line, col}], ... }`
 *
 * @param {string} output - Raw JSON output from knip
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const json = '{"files":[],"issues":[{"type":"exports","filePath":"src/utils.ts","symbol":"foo","line":10,"col":14}]}';
 * const results = transformKnipOutput(json);
 * // results[0].ruleId === 'knip/unused-export'
 * ```
 */
export function transformKnipOutput(output: string): LintResult[] {
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

  /* Process unused files */
  const files: unknown[] = (parsed.files as unknown[]) ?? [];
  for (const file of files) {
    const filePath: string = typeof file === 'string' ? file : '';
    if (filePath.length > 0) {
      results.push(
        createResult('knip/unused-file', filePath, 1, 1, 'warning', en.tools.knipUnusedFile, {
          tip: en.tools.knipUnusedFileTip,
        }),
      );
    }
  }

  /* Process issues (unused exports, types, dependencies, etc.) */
  const issues: unknown[] = (parsed.issues as unknown[]) ?? [];
  for (const issue of issues) {
    const obj: KnipIssue = issue as KnipIssue;
    const filePath: string = obj.filePath ?? '';
    const line: number = obj.line ?? 1;
    const col: number = obj.col ?? 1;
    const issueType: string = obj.type ?? 'unknown';
    const symbol: string = obj.symbol ?? '';

    let ruleId: string = 'knip/unused';
    let message: string = format(en.tools.knipUnused, { issueType });

    if (issueType === 'exports') {
      ruleId = 'knip/unused-export';
      message = format(en.tools.knipUnusedExport, { symbol });
    } else if (issueType === 'types') {
      ruleId = 'knip/unused-type';
      message = format(en.tools.knipUnusedType, { symbol });
    } else if (issueType === 'dependencies') {
      ruleId = 'knip/unused-dependency';
      message = format(en.tools.knipUnusedDep, { symbol });
    } else if (issueType === 'devDependencies') {
      ruleId = 'knip/unused-dev-dependency';
      message = format(en.tools.knipUnusedDevDep, { symbol });
    }

    results.push(createResult(ruleId, filePath, line, col, 'warning', message));
  }

  return results;
}

/** knip external tool definition. */
export const knipTool: ExternalTool = {
  args: ['--reporter', 'json'],
  command: 'knip',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('knip');
  },
  name: 'knip',
  outputFormat: 'json',
  transform: transformKnipOutput,
};
