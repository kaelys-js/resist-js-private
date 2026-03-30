/**
 * Rule: directives/require-ts-expect-error-reason
 *
 * Requires @ts-expect-error directives to include a meaningful explanation.
 * The explanation must follow the pattern: // @ts-expect-error - [reason]
 * where [reason] is at least 10 characters long.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern to detect @ts-expect-error directives. */
const TS_EXPECT_ERROR_PATTERN: RegExp = /@ts-expect-error/;

/** Pattern to detect @ts-expect-error with a valid reason (dash separator + 10+ chars). */
const TS_EXPECT_ERROR_WITH_REASON: RegExp = /@ts-expect-error\s+-\s+.{10,}/;

/** The require-ts-expect-error-reason lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/require-ts-expect-error-reason',
  description:
    'Requires @ts-expect-error directives to include an explanation of at least 10 characters',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lines: string[] = context.content.split('\n');

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        if (TS_EXPECT_ERROR_PATTERN.test(line) && !TS_EXPECT_ERROR_WITH_REASON.test(line)) {
          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'error',
            message: '@ts-expect-error requires explanation: // @ts-expect-error - [reason]',
            ruleId: 'directives/require-ts-expect-error-reason',
            tip: 'Add explanation: // @ts-expect-error - [why this suppression is needed]',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
