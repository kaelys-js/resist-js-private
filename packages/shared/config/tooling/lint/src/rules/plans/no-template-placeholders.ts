/**
 * Rule: plans/no-template-placeholders
 *
 * Detects leftover template text in plan files that was never replaced
 * with real content.
 *
 * @module
 */

import {
  NO_OP_FIX,
  createResult,
  type LintFix,
  type LintResult,
  type WorkspaceRule,
} from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/no-template-placeholders';

/** No-op fix sentinel. */
const NO_FIX: LintFix = NO_OP_FIX;

/**
 * Build a fix that replaces a YYYY-MM-DD placeholder with today's date.
 *
 * @param {string} content - Full file content
 * @param {number} lineIdx - 0-based line index
 * @param {string} lineText - Text of the line containing the placeholder
 * @returns {LintFix} Fix replacing the placeholder with today's date
 */
function buildDatePlaceholderFix(content: string, lineIdx: number, lineText: string): LintFix {
  const matchIdx: number = lineText.indexOf('YYYY-MM-DD');

  if (matchIdx === -1) {
    return NO_FIX;
  }

  /* Compute byte offset of this line */
  const lines: string[] = content.split('\n');
  let byteOffset: number = 0;

  for (let i: number = 0; i < lineIdx; i++) {
    byteOffset += (lines[i] ?? '').length + 1; /* +1 for \n */
  }

  const start: number = byteOffset + matchIdx;
  const today: string = new Date().toISOString().slice(0, 10);

  return { range: { start, end: start + 10 }, text: today };
}

/** Placeholder patterns to detect (case-sensitive). */
const PLACEHOLDER_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
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
  fixable: true,

  async inputs(context: unknown): Promise<readonly string[]> {
    return discoverPlanFiles(context as WorkspaceContext);
  },

  async check(context: unknown): Promise<LintResult[]> {
    const ctx = context as WorkspaceContext;
    const results: LintResult[] = [];

    const planFiles: readonly string[] = await discoverPlanFiles(ctx);

    for (const file of planFiles) {
      const content: string = await ctx.readFile(file);
      const lines: string[] = content.split('\n');

      for (const { pattern, label } of PLACEHOLDER_PATTERNS) {
        /* Reset regex lastIndex */
        const re: RegExp = new RegExp(pattern.source, pattern.flags);

        for (let i: number = 0; i < lines.length; i++) {
          if (re.test(lines[i] ?? '')) {
            /* Only YYYY-MM-DD gets a real fix (replaced with today's date) */
            const fix: LintFix =
              label === 'YYYY-MM-DD' ? buildDatePlaceholderFix(content, i, lines[i] ?? '') : NO_FIX;
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
                  fix,
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
