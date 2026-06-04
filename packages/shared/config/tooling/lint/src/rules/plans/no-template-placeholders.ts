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

/** Literal width of the `YYYY-MM-DD` placeholder (always 10 chars). */
const DATE_PLACEHOLDER_WIDTH: number = 10;

/**
 * Build a fix that replaces a single YYYY-MM-DD placeholder with today's date.
 *
 * @param {number} lineByteOffset - Byte offset of the start of the placeholder's line.
 * @param {number} matchColumn - 0-based column of the placeholder within the line.
 * @returns {LintFix} Fix replacing the 10-char placeholder with today's date.
 */
function buildDatePlaceholderFix(lineByteOffset: number, matchColumn: number): LintFix {
  const start: number = lineByteOffset + matchColumn;
  const today: string = new Date().toISOString().slice(0, 10);

  return { range: { start, end: start + DATE_PLACEHOLDER_WIDTH }, text: today };
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

      /* Precompute the byte offset of each line start so per-match date fixes
       * can be anchored at their exact column. */
      const lineByteOffsets: number[] = Array.from<number>({ length: lines.length });
      let runningOffset: number = 0;

      for (let i: number = 0; i < lines.length; i++) {
        lineByteOffsets[i] = runningOffset;
        runningOffset += (lines[i] ?? '').length + 1; /* +1 for the \n */
      }

      for (const { pattern, label } of PLACEHOLDER_PATTERNS) {
        const isDate: boolean = label === 'YYYY-MM-DD';

        for (let i: number = 0; i < lines.length; i++) {
          const lineText: string = lines[i] ?? '';

          if (isDate) {
            /* Date placeholders get a real fix PER occurrence (non-overlapping),
             * so iterate every match on the line individually. */
            const re: RegExp = new RegExp(pattern.source, pattern.flags);
            let match: RegExpExecArray | null = re.exec(lineText);

            while (match !== null) {
              const fix: LintFix = buildDatePlaceholderFix(lineByteOffsets[i] ?? 0, match.index);
              results.push(
                createResult(
                  RULE_ID,
                  file,
                  i + 1,
                  match.index + 1,
                  'error',
                  `Template placeholder "${label}" was not replaced with real content.`,
                  {
                    tip: `Replace "${label}" with actual content for this plan.`,
                    fix,
                  },
                ),
              );
              /* Guard against zero-width matches (cannot happen for this literal,
               * but keeps the loop safe if the pattern ever changes). */
              if (match.index === re.lastIndex) {
                re.lastIndex++;
              }
              match = re.exec(lineText);
            }
          } else {
            /* Non-date placeholders are detect-only: one diagnostic per line. */
            const re: RegExp = new RegExp(pattern.source, pattern.flags);

            if (re.test(lineText)) {
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
                    fix: NO_FIX,
                  },
                ),
              );
            }
          }
        }
      }
    }

    return results;
  },
};

export default rule;
