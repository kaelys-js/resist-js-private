/**
 * External Tool: clang-tidy
 *
 * Lints C, C++, and Objective-C source files using clang-tidy.
 * Parses GCC-style text output (`filename:line:column: warning/error: message [check-name]`)
 * into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for clang-tidy diagnostic output format.
 *
 * Matches lines like:
 * `src/main.c:10:5: warning: unused variable 'x' [clang-diagnostic-unused-variable]`
 * `src/foo.cpp:3:1: error: use of undeclared identifier [clang-diagnostic-error]`
 * `src/bar.h:7:12: warning: do not use 'else' after 'return' [readability-else-after-return]`
 */
const CLANG_TIDY_LINE: RegExp = /^(.+?):(\d+):(\d+): (warning|error|note): (.+?)(?:\s+\[(.+?)\])?$/;

/**
 * Transform clang-tidy text output into LintResult[].
 *
 * clang-tidy with `--quiet` outputs GCC-style diagnostics:
 * `filename:line:column: warning/error: message [check-name]`
 *
 * The check name in brackets is used as the rule suffix.
 * If no check name is present, `diagnostic` is used as the fallback.
 *
 * @param {string} output - Raw text output from clang-tidy
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformClangTidyOutput("src/main.c:10:5: warning: unused variable 'x' [clang-diagnostic-unused-variable]");
 * // results[0].ruleId === 'clang-tidy/clang-diagnostic-unused-variable'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformClangTidyOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];

  for (const line of trimmed.split('\n')) {
    const match: RegExpMatchArray | null = CLANG_TIDY_LINE.exec(line.trim());

    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
    const column: number = Number.parseInt(match[3] ?? '1', 10);
    const level: string = match[4] ?? 'warning';
    const message: string = match[5] ?? '';
    const checkName: string = match[6] ?? 'diagnostic';

    let severity: 'error' | 'warning' | 'info' = 'warning';

    if (level === 'error') {
      severity = 'error';
    } else if (level === 'note') {
      severity = 'info';
    }

    results.push(createResult(`clang-tidy/${checkName}`, file, lineNum, column, severity, message));
  }

  return results;
}

/** clang-tidy external tool definition. */
export const clangTidyTool: ExternalTool = {
  args: ['--quiet'],
  command: 'clang-tidy',
  filePatterns: [
    '**/*.c',
    '**/*.h',
    '**/*.cpp',
    '**/*.cc',
    '**/*.cxx',
    '**/*.hpp',
    '**/*.hxx',
    '**/*.m',
    '**/*.mm',
  ],
  isAvailable(): boolean {
    return isCommandAvailable('clang-tidy');
  },
  name: 'clang-tidy',
  outputFormat: 'text',
  transform: transformClangTidyOutput,
};
