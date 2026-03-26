/**
 * External Tool: typos
 *
 * Spell-checks all text files using typos-cli.
 * Outputs JSON format, which is transformed into LintResult[].
 *
 * @module
 */

import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { isCommandAvailable, type ExternalTool } from '@/lint/framework/tool-orchestrator.ts';

/**
 * A single typos JSON output entry.
 *
 * @example
 * ```typescript
 * const entry: TyposEntry = {
 *   path: 'src/foo.ts',
 *   line_num: 10,
 *   byte_offset: 5,
 *   typo: 'teh',
 *   corrections: ['the'],
 * };
 * ```
 */
type TyposEntry = {
  /** File path where the typo was found. */
  path: string;
  /** Line number (1-based). */
  line_num: number;
  /** Byte offset within the line (0-based). */
  byte_offset: number;
  /** The misspelled word. */
  typo: string;
  /** Suggested corrections. */
  corrections: string[];
};

/**
 * Transform typos JSON output into LintResult[].
 *
 * typos outputs one JSON object per line (JSONL format) with:
 * `{ type, path, line_num, byte_offset, typo, corrections }`
 *
 * @param {string} output - Raw JSONL output from typos
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformTyposOutput('{"type":"typo","path":"foo.ts","line_num":1,"byte_offset":0,"typo":"teh","corrections":["the"]}');
 * // results[0].ruleId === 'typos/misspelling'
 * ```
 */
export function transformTyposOutput(output: string): LintResult[] {
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

    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(stripped) as Record<string, unknown>;
    } catch {
      continue;
    }

    /* Only process typo entries, skip binary/config entries */
    if (entry.type !== 'typo') {
      continue;
    }

    const typed: TyposEntry = entry as unknown as TyposEntry;
    const path: string = typed.path ?? '';
    const lineNum: number = typed.line_num ?? 1;
    const col: number = (typed.byte_offset ?? 0) + 1;
    const typo: string = typed.typo ?? '';
    const corrections: string[] = typed.corrections ?? [];

    const correctionText: string = corrections.length > 0 ? corrections.join(', ') : 'unknown';
    const message: string = `"${typo}" should be "${correctionText}"`;

    results.push(
      createResult('typos/misspelling', path, lineNum, col, 'warning', message, {
        tip: `Fix: replace "${typo}" with "${correctionText}"`,
        endColumn: col + typo.length,
      }),
    );
  }

  return results;
}

/** typos external tool definition. */
export const typosTool: ExternalTool = {
  name: 'typos',
  command: 'typos',
  args: ['--format', 'json'],
  outputFormat: 'json',
  filePatterns: ['**/*'],
  transform: transformTyposOutput,
  isAvailable(): boolean {
    return isCommandAvailable('typos');
  },
};
