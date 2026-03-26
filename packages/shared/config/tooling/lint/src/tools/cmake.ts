/**
 * External Tool: cmake-lint
 *
 * Validates CMake files (CMakeLists.txt and .cmake) using cmake-lint.
 * Parses text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for cmake-lint output with code: `filename:line,col: [C0103] message`
 */
const CMAKE_LINE_WITH_CODE: RegExp = /^(.+?):(\d+)(?:,(\d+))?:\s+\[([A-Z]\d+)\]\s+(.+)$/;

/**
 * Regex for cmake-lint output without code: `filename:line: message`
 */
const CMAKE_LINE_SIMPLE: RegExp = /^(.+?):(\d+):\s+(.+)$/;

/**
 * Transform cmake-lint text output into LintResult[].
 *
 * cmake-lint outputs lines in two formats:
 * - `CMakeLists.txt:12,5: [C0103] Invalid function name "myFunc"`
 * - `CMakeLists.txt:12: Some lint message`
 *
 * @param {string} output - Raw text output from cmake-lint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCmakeLintOutput('CMakeLists.txt:12,5: [C0103] Invalid name');
 * // results[0].ruleId === 'cmake/lint'
 * ```
 */
export function transformCmakeLintOutput(output: string): LintResult[] {
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

    /* Try format with code first: `filename:line,col: [C0103] message` */
    const matchWithCode: RegExpMatchArray | null = CMAKE_LINE_WITH_CODE.exec(stripped);
    if (matchWithCode) {
      const file: string = matchWithCode[1] ?? '';
      const lineNum: number = Number.parseInt(matchWithCode[2] ?? '1', 10);
      const column: number = Number.parseInt(matchWithCode[3] ?? '1', 10);
      const message: string = matchWithCode[5] ?? '';

      results.push(createResult('cmake/lint', file, lineNum, column, 'warning', message));
      continue;
    }

    /* Fallback: simple format `filename:line: message` */
    const matchSimple: RegExpMatchArray | null = CMAKE_LINE_SIMPLE.exec(stripped);
    if (matchSimple) {
      const file: string = matchSimple[1] ?? '';
      const lineNum: number = Number.parseInt(matchSimple[2] ?? '1', 10);
      const message: string = matchSimple[3] ?? '';

      results.push(createResult('cmake/lint', file, lineNum, 1, 'warning', message));
    }
  }

  return results;
}

/** cmake-lint external tool definition. */
export const cmakeLintTool: ExternalTool = {
  args: [],
  command: 'cmake-lint',
  filePatterns: ['**/CMakeLists.txt', '**/*.cmake'],
  isAvailable(): boolean {
    return isCommandAvailable('cmake-lint');
  },
  name: 'cmake-lint',
  outputFormat: 'text',
  transform: transformCmakeLintOutput,
};
