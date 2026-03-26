/**
 * External Tool: Solhint
 *
 * Lints Solidity smart contract files (.sol) using Solhint.
 * Parses stylish text output into LintResult[].
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Regex for Solhint inline diagnostic lines.
 *
 * Matches lines like:
 * `contracts/Token.sol:10:5: warning Some message [rule-id]`
 * `contracts/Token.sol:10:5: error Some message [rule-id]`
 */
const SOLHINT_INLINE: RegExp = /^(.+?):(\d+):(\d+):\s*(error|warning)\s+(.+?)\s+\[(.+?)\]$/;

/**
 * Regex for Solhint stylish table lines (indented output under a filename header).
 *
 * Matches lines like:
 * `  10:5  warning  Some message  rule-id`
 * `  10:5  error    Some message  rule-id`
 */
const SOLHINT_STYLISH: RegExp = /^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}(\S+)\s*$/;

/**
 * Transform Solhint stylish text output into LintResult[].
 *
 * Solhint with `-f stylish` outputs either:
 *
 * 1. **Inline format**: `filename:line:column: severity message [rule-id]`
 * 2. **Stylish format**: A filename header followed by indented diagnostic lines:
 *    ```
 *    contracts/Token.sol
 *      10:5  warning  Some message  rule-id
 *    ```
 *
 * Both formats are supported and parsed into LintResult[].
 *
 * @param {string} output - Raw text output from Solhint
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformSolhintOutput("contracts/Token.sol:10:5: warning Provide an error message for revert [reason-string]");
 * // results[0].ruleId === 'solidity/reason-string'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformSolhintOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  let currentFile: string = '';

  for (const line of trimmed.split('\n')) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    /* Try inline format first: filename:line:col: severity message [rule-id] */
    const inlineMatch: RegExpMatchArray | null = SOLHINT_INLINE.exec(stripped);
    if (inlineMatch) {
      const file: string = inlineMatch[1] ?? '';
      const lineNum: number = Number.parseInt(inlineMatch[2] ?? '1', 10);
      const column: number = Number.parseInt(inlineMatch[3] ?? '1', 10);
      const severity: 'error' | 'warning' =
        (inlineMatch[4] ?? 'warning') === 'error' ? 'error' : 'warning';
      const message: string = inlineMatch[5] ?? '';
      const ruleId: string = inlineMatch[6] ?? 'lint';

      results.push(createResult(`solidity/${ruleId}`, file, lineNum, column, severity, message));
      continue;
    }

    /* Try stylish table format: indented line:col severity message rule-id */
    const stylishMatch: RegExpMatchArray | null = SOLHINT_STYLISH.exec(line);
    if (stylishMatch) {
      const lineNum: number = Number.parseInt(stylishMatch[1] ?? '1', 10);
      const column: number = Number.parseInt(stylishMatch[2] ?? '1', 10);
      const severity: 'error' | 'warning' =
        (stylishMatch[3] ?? 'warning') === 'error' ? 'error' : 'warning';
      const message: string = stylishMatch[4] ?? '';
      const ruleId: string = stylishMatch[5] ?? 'lint';

      results.push(
        createResult(`solidity/${ruleId}`, currentFile, lineNum, column, severity, message),
      );
      continue;
    }

    /* Lines that are not indented and don't match patterns are filename headers */
    if (
      !line.startsWith(' ') &&
      !line.startsWith('\t') &&
      !stripped.startsWith('✖') &&
      !stripped.startsWith('×')
    ) {
      currentFile = stripped;
    }
  }

  return results;
}

/** Solhint external tool definition. */
export const solhintTool: ExternalTool = {
  args: ['-f', 'stylish'],
  command: 'solhint',
  filePatterns: ['**/*.sol'],
  isAvailable(): boolean {
    return isCommandAvailable('solhint');
  },
  name: 'solhint',
  outputFormat: 'text',
  transform: transformSolhintOutput,
};
