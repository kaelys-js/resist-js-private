/**
 * External Tool: GitHub Pull Request Template Validator
 *
 * Validates GitHub pull request template files (pull_request_template.md)
 * for common issues: empty file, missing description section, missing checklist.
 * Parses `filename:line: message` format into LintResult[].
 *
 * This is a custom validator — the command is a no-op (`echo ok`).
 * Actual validation logic lives in the transform and validate functions.
 *
 * @module
 */

import type { ExternalTool } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';

/**
 * Transform GitHub PR template validation output into LintResult[].
 *
 * Parses output in `filename:line: message` format. Each line is a separate
 * diagnostic. If the output is empty or only whitespace, no issues were found.
 *
 * @param {string} output - Raw text output in `filename:line: message` format
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformGithubPrTemplateOutput(
 *   'pull_request_template.md:1: PR template is empty'
 * );
 * // results[0].ruleId === 'github/pr-template'
 * // results[0].severity === 'error'
 * ```
 */
export function transformGithubPrTemplateOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const lines: string[] = trimmed.split('\n');

  /**
   * Match `filename:line: message` format.
   * Example: `pull_request_template.md:1: PR template is empty`
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
        createResult('github/pr-template', file, lineNum, 1, 'warning', message, {
          tip: 'A good PR template includes a description section and a checklist for reviewers.',
        }),
      );
    }
  }

  return results;
}

/**
 * Validate a GitHub pull request template file.
 *
 * Checks for:
 * 1. Empty file — a PR template must have content
 * 2. Missing description section — should have a `## Description` or similar heading
 * 3. Missing checklist — should have at least one `- [ ]` checkbox item
 *
 * @param {string} filePath - Absolute path to the PR template file
 * @param {string} content - Raw file content
 * @returns {LintResult[]} Validation diagnostics
 *
 * @example
 * ```typescript
 * const results = validatePrTemplate('pull_request_template.md', '');
 * // results[0].message === 'PR template file is empty'
 * ```
 */
export function validatePrTemplate(filePath: string, content: string): LintResult[] {
  const trimmed: string = content.trim();

  if (trimmed.length === 0) {
    return [
      createResult('github/pr-template', filePath, 1, 1, 'error', 'PR template file is empty', {
        example: '## Description\n\n## Checklist\n- [ ] Tests added',
        tip: 'Add a description section and a review checklist to the PR template.',
      }),
    ];
  }

  const results: LintResult[] = [];

  /**
   * Check for a description section.
   * Looks for markdown headings containing "description" (case-insensitive).
   */
  const hasDescription: boolean = /^#{1,6}\s+.*description/im.test(trimmed);
  if (!hasDescription) {
    results.push(
      createResult(
        'github/pr-template',
        filePath,
        1,
        1,
        'warning',
        'PR template is missing a description section',
        {
          example: '## Description\n\nBrief summary of changes.',
          tip: 'Add a "## Description" heading to guide PR authors.',
        },
      ),
    );
  }

  /**
   * Check for a checklist section.
   * Looks for at least one markdown checkbox (`- [ ]` or `- [x]`).
   */
  const hasChecklist: boolean = /^[-*]\s+\[[ x]\]/m.test(trimmed);
  if (!hasChecklist) {
    results.push(
      createResult(
        'github/pr-template',
        filePath,
        1,
        1,
        'warning',
        'PR template is missing a review checklist',
        {
          example: '## Checklist\n- [ ] Tests added\n- [ ] Documentation updated',
          tip: 'Add a checklist section with items like "- [ ] Tests added".',
        },
      ),
    );
  }

  return results;
}

/** GitHub PR template validator external tool definition. */
export const githubPrTemplateTool: ExternalTool = {
  args: ['ok'],
  command: 'echo',
  filePatterns: ['**/pull_request_template.md', '**/.github/pull_request_template.md'],
  isAvailable(): boolean {
    return true;
  },
  name: 'github-pr-template',
  outputFormat: 'text',
  transform: transformGithubPrTemplateOutput,
};
