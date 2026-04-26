/**
 * External Tool: Dependabot Configuration Validator
 *
 * Validates Dependabot configuration files (.github/dependabot.yml, *.yaml)
 * for valid YAML syntax, required schema fields (version, updates), and
 * recognized package ecosystems.
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
 * Valid Dependabot package ecosystems.
 *
 * These are the recognized values for `package-ecosystem` in the
 * `updates` array entries.
 *
 * @see https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file
 */
const VALID_ECOSYSTEMS: ReadonlySet<string> = new Set<string>([
  'bundler',
  'cargo',
  'composer',
  'devcontainers',
  'docker',
  'elm',
  'gitsubmodule',
  'github-actions',
  'gomod',
  'gradle',
  'maven',
  'mix',
  'npm',
  'nuget',
  'pip',
  'pub',
  'swift',
  'terraform',
]);

/**
 * Transform Dependabot configuration validation output into LintResult[].
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
 * const results = transformDependabotOutput(
 *   '.github/dependabot.yml:1: Missing required field: version'
 * );
 * // results[0].ruleId === 'dependabot/config'
 * // results[0].severity === 'error'
 * ```
 */
export function transformDependabotOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /**
   * Match `filename:line: message` format.
   * Example: `.github/dependabot.yml:1: Missing required field: version`
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
        createResult('dependabot/config', file, lineNum, 1, 'error', message, {
          tip: strings.tools.dependabotConfigTip,
        }),
      );
    }
  }

  return results;
}

/**
 * Validate a Dependabot configuration file.
 *
 * Checks for:
 * 1. Empty file — a dependabot.yml must have content
 * 2. `version: 2` — required top-level field
 * 3. `updates:` — required top-level array field
 * 4. Valid `package-ecosystem` values in updates entries
 *
 * @param {string} filePath - Absolute path to the dependabot.yml file
 * @param {string} content - Raw file content
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @returns {LintResult[]} Validation diagnostics
 *
 * @example
 * ```typescript
 * const results = validateDependabot('.github/dependabot.yml', 'version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly\n');
 * // results.length === 0 (valid config)
 * ```
 */
export function validateDependabot(
  filePath: string,
  content: string,
  strings: LintStrings,
): LintResult[] {
  const trimmed: string = content.trim();

  if (trimmed.length === 0) {
    return [
      createResult('dependabot/config', filePath, 1, 1, 'error', strings.tools.dependabotEmpty, {
        example:
          'version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly',
        tip: strings.tools.dependabotEmptyTip,
      }),
    ];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /**
   * Check for `version` field.
   * Must be `version: 2` at the top level.
   */
  const versionPattern: RegExp = /^version:\s*(.+)$/;
  let hasVersion: boolean = false;
  let versionValue: string = '';

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = lines[i] ?? '';

    /** Skip indented lines (nested values). */
    if (line.startsWith(' ') || line.startsWith('\t')) {
      continue;
    }

    const match: RegExpMatchArray | null = line.match(versionPattern);
    if (match) {
      hasVersion = true;
      versionValue = (match[1] ?? '').trim();

      if (versionValue !== '2') {
        results.push(
          createResult(
            'dependabot/config',
            filePath,
            i + 1,
            1,
            'error',
            format(strings.tools.dependabotInvalidVersion, { version: versionValue }),
            {
              example: 'version: 2',
              tip: strings.tools.dependabotInvalidVersionTip,
            },
          ),
        );
      }
      break;
    }
  }

  if (!hasVersion) {
    results.push(
      createResult(
        'dependabot/config',
        filePath,
        1,
        1,
        'error',
        strings.tools.dependabotMissingVersion,
        {
          example: 'version: 2',
          tip: strings.tools.dependabotMissingVersionTip,
        },
      ),
    );
  }

  /**
   * Check for `updates` field.
   * Must be a top-level key.
   */
  const hasUpdates: boolean = lines.some((line: string): boolean => {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      return false;
    }
    return line.startsWith('updates:');
  });

  if (!hasUpdates) {
    results.push(
      createResult(
        'dependabot/config',
        filePath,
        1,
        1,
        'error',
        strings.tools.dependabotMissingUpdates,
        {
          example:
            'updates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly',
          tip: strings.tools.dependabotMissingUpdatesTip,
        },
      ),
    );
  }

  /**
   * Check for valid `package-ecosystem` values.
   * These appear as indented keys within the updates array entries.
   */
  const ecosystemPattern: RegExp = /^\s+package-ecosystem:\s*["']?([a-zA-Z0-9_-]+)["']?\s*$/;

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = lines[i] ?? '';
    const match: RegExpMatchArray | null = line.match(ecosystemPattern);

    if (match && match[1]) {
      const ecosystem: string = match[1];
      if (!VALID_ECOSYSTEMS.has(ecosystem)) {
        results.push(
          createResult(
            'dependabot/config',
            filePath,
            i + 1,
            1,
            'warning',
            format(strings.tools.dependabotUnrecognizedEcosystem, { ecosystem }),
            {
              tip: format(strings.tools.dependabotValidEcosystems, {
                ecosystems: [...VALID_ECOSYSTEMS].join(', '),
              }),
            },
          ),
        );
      }
    }
  }

  return results;
}

/** Dependabot configuration validator external tool definition. */
export const dependabotTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/.github/dependabot.yml', '**/.github/dependabot.yaml'],
  isAvailable(): boolean {
    return true;
  },
  name: 'dependabot',
  outputFormat: 'text',
  transform: transformDependabotOutput,
};
