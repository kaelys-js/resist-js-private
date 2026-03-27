/**
 * External Tool: GitHub FUNDING.yml Validator
 *
 * Validates GitHub funding configuration files (.github/FUNDING.yml)
 * for valid YAML syntax and recognized funding platform keys.
 * Parses `filename:line: message` format into LintResult[].
 *
 * This is a custom validator — the command is a no-op (`echo ok`).
 * Actual validation logic lives in the transform and validate functions.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';
import { format } from '@/lint/locale/schema.ts';

/**
 * Valid GitHub funding platform keys.
 *
 * These are the recognized top-level keys in a FUNDING.yml file.
 * Any key not in this set is flagged as unrecognized.
 *
 * @see https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository
 */
const VALID_PLATFORMS: ReadonlySet<string> = new Set<string>([
  'github',
  'patreon',
  'open_collective',
  'ko_fi',
  'tidelift',
  'community_bridge',
  'liberapay',
  'issuehunt',
  'otechie',
  'lfx_crowdfunding',
  'custom',
]);

/**
 * Transform GitHub FUNDING.yml validation output into LintResult[].
 *
 * Parses output in `filename:line: message` format. Each line is a separate
 * diagnostic. If the output is empty or only whitespace, no issues were found.
 *
 * @param {string} output - Raw text output in `filename:line: message` format
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformGithubFundingOutput(
 *   '.github/FUNDING.yml:3: Unrecognized funding platform: buymeacoffee'
 * );
 * // results[0].ruleId === 'github/funding'
 * // results[0].severity === 'warning'
 * ```
 */
export function transformGithubFundingOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /**
   * Match `filename:line: message` format.
   * Example: `.github/FUNDING.yml:3: Unrecognized funding platform: buymeacoffee`
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

      results.push(
        createResult('github/funding', file, lineNum, 1, 'warning', message, {
          tip: format(en.tools.fundingValidPlatforms, {
            platforms: [...VALID_PLATFORMS].join(', '),
          }),
        }),
      );
    }
  }

  return results;
}

/**
 * Validate a GitHub FUNDING.yml file.
 *
 * Checks for:
 * 1. Empty file — a FUNDING.yml must have content
 * 2. Valid YAML structure (basic key-value detection)
 * 3. Recognized funding platform keys from the GitHub-supported list
 *
 * @param {string} filePath - Absolute path to the FUNDING.yml file
 * @param {string} content - Raw file content
 * @returns {LintResult[]} Validation diagnostics
 *
 * @example
 * ```typescript
 * const results = validateFunding('.github/FUNDING.yml', 'patreon: myaccount\nbuymeacoffee: foo\n');
 * // results[0].message includes 'Unrecognized funding platform: buymeacoffee'
 * ```
 */
export function validateFunding(filePath: string, content: string): LintResult[] {
  const trimmed: string = content.trim();

  if (trimmed.length === 0) {
    return [
      createResult('github/funding', filePath, 1, 1, 'error', en.tools.fundingEmpty, {
        example: 'github: username',
        tip: en.tools.fundingEmptyTip,
      }),
    ];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /**
   * Extract top-level YAML keys and check against valid platforms.
   * Lines with leading whitespace are nested and skipped.
   * Comment lines (starting with #) are skipped.
   */
  const keyPattern: RegExp = /^([a-zA-Z_][a-zA-Z0-9_-]*):/;

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = lines[i] ?? '';

    /** Skip comment lines. */
    if (line.trimStart().startsWith('#')) {
      continue;
    }

    /** Skip indented lines (nested YAML values). */
    if (line.startsWith(' ') || line.startsWith('\t')) {
      continue;
    }

    const match: RegExpMatchArray | null = line.match(keyPattern);
    if (match && match[1]) {
      const key: string = match[1];
      if (!VALID_PLATFORMS.has(key)) {
        results.push(
          createResult(
            'github/funding',
            filePath,
            i + 1,
            1,
            'warning',
            format(en.tools.fundingUnrecognized, { platform: key }),
            {
              tip: format(en.tools.fundingValidPlatforms, {
                platforms: [...VALID_PLATFORMS].join(', '),
              }),
            },
          ),
        );
      }
    }
  }

  return results;
}

/** GitHub FUNDING.yml validator external tool definition. */
export const githubFundingTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/.github/FUNDING.yml'],
  isAvailable(): boolean {
    return true;
  },
  name: 'github-funding',
  outputFormat: 'text',
  transform: transformGithubFundingOutput,
};
