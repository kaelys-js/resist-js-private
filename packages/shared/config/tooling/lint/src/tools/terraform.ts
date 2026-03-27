/**
 * External Tool: Terraform Format
 *
 * Checks Terraform file formatting using `terraform fmt -check -diff`.
 * Non-empty output indicates files that need formatting.
 * Parses diff output to extract filenames and creates LintResult[] per file.
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';
import { format } from '@/lint/locale/schema.ts';

/** Regex to extract filenames from diff output headers: `--- a/filename` or `diff --git a/filename` */
const DIFF_FILE: RegExp = /^(?:---\s+a\/|diff\s+--git\s+a\/)(.+?)(?:\s|$)/;

/**
 * Transform Terraform format check output into LintResult[].
 *
 * `terraform fmt -check -diff` outputs a unified diff for files that
 * need formatting. Non-empty output means files are not properly formatted.
 * Filenames are extracted from diff headers; if no filenames can be parsed,
 * a single generic result is produced.
 *
 * @param {string} output - Raw text output from `terraform fmt -check -diff`
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const results = transformTerraformOutput('--- a/main.tf\n+++ b/main.tf\n@@ -1,2 +1,2 @@\n...');
 * // results[0].ruleId === 'terraform/format'
 * ```
 */
export function transformTerraformOutput(output: string): LintResult[] {
  const trimmed: string = output.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const results: LintResult[] = [];
  const seen: Set<string> = new Set();
  const lines: string[] = trimmed.split('\n');

  for (const line of lines) {
    const match: RegExpMatchArray | null = DIFF_FILE.exec(line.trim());
    if (!match) {
      continue;
    }

    const file: string = match[1] ?? '';
    if (file.length === 0 || seen.has(file)) {
      continue;
    }
    seen.add(file);

    results.push(
      createResult(
        'terraform/format',
        file,
        1,
        1,
        'warning',
        format(en.tools.formatNotProperlyFormattedWithFix, { tool: 'terraform fmt' }),
        {
          tip: format(en.tools.formatRunTool, { tool: 'terraform fmt' }),
        },
      ),
    );
  }

  /* Fallback: if diff output exists but no filenames were parsed */
  if (results.length === 0) {
    results.push(
      createResult(
        'terraform/format',
        'unknown.tf',
        1,
        1,
        'warning',
        en.tools.terraformNeedsFormatting,
        {
          tip: en.tools.terraformNeedsFormattingTip,
        },
      ),
    );
  }

  return results;
}

/** Terraform Format external tool definition. */
export const terraformTool: ExternalTool = {
  args: ['fmt', '-check', '-diff'],
  command: 'terraform',
  filePatterns: ['**/*.tf', '**/*.tfvars'],
  isAvailable(): boolean {
    return isCommandAvailable('terraform');
  },
  name: 'terraform',
  outputFormat: 'text',
  transform: transformTerraformOutput,
};
