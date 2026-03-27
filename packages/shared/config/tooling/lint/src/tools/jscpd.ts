/**
 * External Tool: jscpd
 *
 * Detects copy-paste / duplicate code using jscpd.
 * Outputs JSON format, which is transformed into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * File location reference within a jscpd duplicate entry.
 *
 * @example
 * ```typescript
 * const loc: JscpdFileRef = {
 *   name: 'src/utils.ts',
 *   start: { line: 10, column: 1 },
 *   end: { line: 25, column: 1 },
 * };
 * ```
 */
type JscpdFileRef = {
  /** File path where the duplicate was found. */
  name: string;
  /** Start position of the duplicated block. */
  start: { line: number; column: number };
  /** End position of the duplicated block. */
  end: { line: number; column: number };
};

/**
 * A single duplicate entry from jscpd JSON output.
 *
 * @example
 * ```typescript
 * const dup: JscpdDuplicate = {
 *   firstFile: { name: 'src/a.ts', start: { line: 1, column: 1 }, end: { line: 10, column: 1 } },
 *   secondFile: { name: 'src/b.ts', start: { line: 5, column: 1 }, end: { line: 14, column: 1 } },
 *   lines: 10,
 *   tokens: 50,
 * };
 * ```
 */
type JscpdDuplicate = {
  /** First file containing the duplicated code. */
  firstFile: JscpdFileRef;
  /** Second file containing the duplicated code. */
  secondFile: JscpdFileRef;
  /** Number of duplicated lines. */
  lines: number;
  /** Number of duplicated tokens. */
  tokens: number;
};

/**
 * Transform jscpd JSON output into LintResult[].
 *
 * jscpd JSON output structure:
 * `{ duplicates: [{ firstFile: {name, start, end}, secondFile: {name, start, end}, lines, tokens }] }`
 *
 * @param {string} output - Raw JSON output from jscpd
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const json = '{"duplicates":[{"firstFile":{"name":"a.ts","start":{"line":1,"column":1},"end":{"line":10,"column":1}},"secondFile":{"name":"b.ts","start":{"line":5,"column":1},"end":{"line":14,"column":1}},"lines":10,"tokens":50}]}';
 * const results = transformJscpdOutput(json);
 * // results[0].ruleId === 'jscpd/duplicate'
 * ```
 */
export function transformJscpdOutput(output: string, strings: LintStrings): LintResult[] {
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
  const duplicates: unknown[] = (parsed.duplicates as unknown[]) ?? [];

  for (const dup of duplicates) {
    const entry: JscpdDuplicate = dup as JscpdDuplicate;
    const firstFile: JscpdFileRef | undefined = entry.firstFile;
    const secondFile: JscpdFileRef | undefined = entry.secondFile;

    if (!firstFile || !secondFile) {
      continue;
    }

    const firstName: string = firstFile.name ?? '';
    const secondName: string = secondFile.name ?? '';
    const lines: number = entry.lines ?? 0;
    const startLine: number = firstFile.start?.line ?? 1;
    const startColumn: number = firstFile.start?.column ?? 1;
    const endLine: number = firstFile.end?.line;
    const endColumn: number = firstFile.end?.column;

    results.push(
      createResult(
        'jscpd/duplicate',
        firstName,
        startLine,
        startColumn,
        'warning',
        format(strings.tools.jscpdMessage, { lines: String(lines), firstName, secondName }),
        {
          endColumn,
          endLine,
          tip: strings.tools.jscpdTip,
        },
      ),
    );
  }

  return results;
}

/** jscpd external tool definition. */
export const jscpdTool: ExternalTool = {
  args: ['--reporters', 'json', '--silent'],
  command: 'jscpd',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('jscpd');
  },
  name: 'jscpd',
  outputFormat: 'json',
  transform: transformJscpdOutput,
};
