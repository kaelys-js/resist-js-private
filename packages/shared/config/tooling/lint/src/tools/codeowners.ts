/**
 * External Tool: CODEOWNERS Validator
 *
 * Validates CODEOWNERS files for correct syntax, valid owner formats,
 * and warns on overly broad wildcard patterns.
 * Parses `filename:line: message` format into LintResult[].
 *
 * This is a custom validator — the command is a no-op (`echo ok`).
 * Actual validation logic lives in the transform and validate functions.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Valid owner format pattern.
 *
 * Matches:
 * - `@username` — GitHub user
 * - `@org/team-name` — GitHub team
 * - `user@example.com` — Email address
 */
const OWNER_PATTERN: RegExp = /^(@[\w-]+(?:\/[\w.-]+)?|[\w.+-]+@[\w.-]+\.\w+)$/;

/**
 * Transform CODEOWNERS validation output into LintResult[].
 *
 * Parses output in `filename:line: message` format. Each line is a separate
 * diagnostic. If the output is empty or only whitespace, no issues were found.
 *
 * @param {string} output - Raw text output in `filename:line: message` format
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformCodeownersOutput(
 *   'CODEOWNERS:5: Invalid owner format: badowner'
 * );
 * // results[0].ruleId === 'codeowners/syntax'
 * // results[0].severity === 'error'
 * ```
 */
export function transformCodeownersOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /**
   * Match `filename:line: message` format.
   * Example: `CODEOWNERS:5: Invalid owner format: badowner`
   */
  const pattern: RegExp = /^(.+?):(\d+):\s*(.+)$/;

  for (const line of lines) {
    const stripped: string = line.trim();
    if (stripped.length === 0) {
      continue;
    }

    const match: RegExpMatchArray | null = stripped.match(pattern);
    if (match) {
      const file: string = match[1] ?? '';
      const lineNum: number = Number.parseInt(match[2] ?? '1', 10);
      const message: string = match[3] ?? '';

      /** Determine severity: invalid owners are errors, broad patterns are warnings. */
      const severity: 'error' | 'warning' = message.includes('overly broad') ? 'warning' : 'error';

      results.push(
        createResult('codeowners/syntax', file, lineNum, 1, severity, message, {
          tip: strings.tools.codeownersValidFormats,
        }),
      );
    }
  }

  return results;
}

/**
 * Validate a CODEOWNERS file.
 *
 * Checks for:
 * 1. Empty file — a CODEOWNERS file must have at least one rule
 * 2. Valid owner formats — each owner must be `@user`, `@org/team`, or an email
 * 3. Overly broad `*` patterns — warns when `*` is used as the sole pattern
 * 4. Lines with patterns but no owners
 *
 * @param {string} filePath - Absolute path to the CODEOWNERS file
 * @param {string} content - Raw file content
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @returns {LintResult[]} Validation diagnostics
 *
 * @example
 * ```typescript
 * const results = validateCodeowners('CODEOWNERS', '* @org/team\nsrc/ badowner\n');
 * // results[0].message includes 'overly broad'
 * // results[1].message includes 'Invalid owner format'
 * ```
 */
export function validateCodeowners(
  filePath: string,
  content: string,
  strings: LintStrings,
): LintResult[] {
  const trimmed: string = content.trim();

  if (trimmed.length === 0) {
    return [
      createResult('codeowners/syntax', filePath, 1, 1, 'error', strings.tools.codeownersEmpty, {
        example: '*.ts @org/frontend-team',
        tip: strings.tools.codeownersEmptyTip,
      }),
    ];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = lines[i] ?? '';
    const stripped: string = line.trim();

    /** Skip empty lines and comments. */
    if (stripped.length === 0 || stripped.startsWith('#')) {
      continue;
    }

    /**
     * Split the line into tokens.
     * First token is the file pattern, remaining tokens are owners.
     */
    const tokens: string[] = stripped.split(/\s+/);
    const filePattern: string = tokens[0] ?? '';
    const owners: string[] = tokens.slice(1);

    /** Check for overly broad wildcard pattern. */
    if (filePattern === '*') {
      results.push(
        createResult(
          'codeowners/syntax',
          filePath,
          i + 1,
          1,
          'warning',
          strings.tools.codeownersOverlyBroad,
          {
            tip: strings.tools.codeownersOverlyBroadTip,
          },
        ),
      );
    }

    /** Check that at least one owner is specified. */
    if (owners.length === 0) {
      results.push(
        createResult(
          'codeowners/syntax',
          filePath,
          i + 1,
          1,
          'error',
          format(strings.tools.codeownersNoOwners, { pattern: filePattern }),
          {
            example: `${filePattern} @org/team`,
            tip: strings.tools.codeownersNoOwnersTip,
          },
        ),
      );
      continue;
    }

    /** Validate each owner format. */
    for (const owner of owners) {
      if (!OWNER_PATTERN.test(owner)) {
        results.push(
          createResult(
            'codeowners/syntax',
            filePath,
            i + 1,
            1,
            'error',
            format(strings.tools.codeownersInvalidOwner, { owner }),
            {
              example: '@org/team-name',
              tip: strings.tools.codeownersInvalidOwnerTip,
            },
          ),
        );
      }
    }
  }

  return results;
}

/** CODEOWNERS validator external tool definition. */
export const codeownersTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/CODEOWNERS', '**/.github/CODEOWNERS'],
  isAvailable(): boolean {
    return true;
  },
  name: 'codeowners',
  outputFormat: 'text',
  transform: transformCodeownersOutput,
};
