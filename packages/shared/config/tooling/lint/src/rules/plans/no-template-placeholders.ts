/**
 * Rule: plans/no-template-placeholders
 *
 * Detects leftover template text in plan files that was never replaced
 * with real content.
 *
 * @module
 */

import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/no-template-placeholders';

/** Placeholder patterns to detect (case-sensitive). */
const PLACEHOLDER_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\[descriptive-name\]/g, label: '[descriptive-name]' },
  { pattern: /\[value\]/g, label: '[value]' },
  { pattern: /\[domain-specific metric\]/g, label: '[domain-specific metric]' },
  { pattern: /YYYY-MM-DD/g, label: 'YYYY-MM-DD' },
  { pattern: /@\/package-name/g, label: '@/package-name' },
  { pattern: /packages\/path\/to\/src\//g, label: 'packages/path/to/src/' },
  { pattern: /src\/path\/to\//g, label: 'src/path/to/' },
  {
    pattern: /One-sentence description of what this phase accomplishes/g,
    label: 'template goal placeholder',
  },
  {
    pattern: /What is missing or broken\. One sentence\./g,
    label: 'template gap placeholder',
  },
];

/** The no-template-placeholders lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Plan files must not contain leftover template placeholders — replace all placeholders with real content.',
  scope: 'workspace',
  categories: ['plans'],
  stages: ['ci'],
  fixable: false,

  async check(context: unknown): Promise<LintResult[]> {
    const ctx = context as WorkspaceContext;
    const results: LintResult[] = [];

    const mdFiles: readonly string[] = await ctx.filesByExtension('.md');
    const planFiles: readonly string[] = mdFiles.filter(
      (f: string): boolean => f.includes('/docs/plans/') && !f.endsWith('TEMPLATE.md'),
    );

    for (const file of planFiles) {
      const content: string = await ctx.readFile(file);
      const lines: string[] = content.split('\n');

      for (const { pattern, label } of PLACEHOLDER_PATTERNS) {
        /* Reset regex lastIndex */
        const re: RegExp = new RegExp(pattern.source, pattern.flags);
        for (let i: number = 0; i < lines.length; i++) {
          if (re.test(lines[i] ?? '')) {
            results.push(
              createResult(
                RULE_ID,
                file,
                i + 1,
                1,
                'error',
                `Template placeholder "${label}" was not replaced with real content.`,
                {
                  tip: `Replace "${label}" with actual content for this plan.`,
                },
              ),
            );
          }
          re.lastIndex = 0;
        }
      }
    }

    return results;
  },
};

export default rule;
