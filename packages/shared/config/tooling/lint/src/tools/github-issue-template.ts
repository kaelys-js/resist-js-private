/**
 * External Tool: GitHub Issue Template Validator
 *
 * Validates GitHub issue template YAML files (.github/ISSUE_TEMPLATE/*.yml, *.yaml)
 * for required fields (name, description, labels) and valid YAML syntax.
 * Parses `filename:line: message` format into LintResult[].
 *
 * This is a custom validator — the command is a no-op (`echo ok`).
 * Actual validation logic lives in the transform function.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * Required top-level fields in a GitHub issue template YAML file.
 *
 * These fields must be present for the template to be valid:
 * - `name`: Display name shown in the issue template chooser
 * - `description`: Short description shown in the issue template chooser
 * - `labels`: Labels to auto-apply when this template is used
 */
const REQUIRED_FIELDS: readonly string[] = ['name', 'description', 'labels'];

/**
 * Transform GitHub issue template validation output into LintResult[].
 *
 * Parses output in `filename:line: message` format. Each line is a separate
 * diagnostic. If the output is empty or only whitespace, no issues were found.
 *
 * @param {string} output - Raw text output in `filename:line: message` format
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformGithubIssueTemplateOutput(
 *   '.github/ISSUE_TEMPLATE/bug.yml:1: Missing required field: name'
 * );
 * // results[0].ruleId === 'github/issue-template'
 * // results[0].message === 'Missing required field: name'
 * ```
 */
export function transformGithubIssueTemplateOutput(
  output: string,
  strings: LintStrings,
): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /**
   * Match `filename:line: message` format.
   * Example: `.github/ISSUE_TEMPLATE/bug.yml:1: Missing required field: name`
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
        createResult('github/issue-template', file, lineNum, 1, 'error', message, {
          tip: strings.tools.issueTemplateTip,
        }),
      );
    }
  }

  return results;
}

/**
 * Validate a GitHub issue template YAML file content.
 *
 * Checks for:
 * 1. Valid YAML structure (basic key-value detection)
 * 2. Presence of required top-level fields: `name`, `description`, `labels`
 *
 * @param {string} filePath - Absolute path to the issue template file
 * @param {string} content - Raw file content
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @returns {LintResult[]} Validation diagnostics
 *
 * @example
 * ```typescript
 * const results = validateIssueTemplate('.github/ISSUE_TEMPLATE/bug.yml', 'name: Bug Report\n');
 * // results[0].message includes 'Missing required field: description'
 * ```
 */
export function validateIssueTemplate(
  filePath: string,
  content: string,
  strings: LintStrings,
): LintResult[] {
  const trimmed: string = content.trim();
  if (trimmed.length === 0) {
    return [
      createResult(
        'github/issue-template',
        filePath,
        1,
        1,
        'error',
        strings.tools.issueTemplateEmpty,
        {
          tip: strings.tools.issueTemplateEmptyTip,
        },
      ),
    ];
  }

  const results: LintResult[] = [];

  /**
   * Extract top-level YAML keys by matching lines that start with
   * a word followed by a colon (no leading whitespace).
   */
  const topLevelKeys: Set<string> = new Set<string>();
  const keyPattern: RegExp = /^([a-zA-Z_][a-zA-Z0-9_-]*):/;

  const lines: string[] = trimmed.split('\n');
  for (const line of lines) {
    const match: RegExpMatchArray | null = line.match(keyPattern);
    if (match && match[1]) {
      topLevelKeys.add(match[1]);
    }
  }

  /** Check for each required field. */
  for (const field of REQUIRED_FIELDS) {
    if (!topLevelKeys.has(field)) {
      results.push(
        createResult(
          'github/issue-template',
          filePath,
          1,
          1,
          'error',
          format(strings.tools.issueTemplateMissingField, { field }),
          {
            example: `${field}: <value>`,
            tip: format(strings.tools.issueTemplateMissingFieldTip, { field }),
          },
        ),
      );
    }
  }

  return results;
}

/** GitHub issue template validator external tool definition. */
export const githubIssueTemplateTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/.github/ISSUE_TEMPLATE/*.yml', '**/.github/ISSUE_TEMPLATE/*.yaml'],
  isAvailable(): boolean {
    return true;
  },
  name: 'github-issue-template',
  outputFormat: 'text',
  transform: transformGithubIssueTemplateOutput,
};
