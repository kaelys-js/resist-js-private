/**
 * Rule: directives/no-ts-expect-error-on-any
 *
 * Warns when @ts-expect-error is used to suppress errors on lines that
 * use the 'any' type. The proper fix is to replace 'any' with a real type
 * or 'unknown' with type narrowing rather than suppressing the error.
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

/** Pattern to detect ': any' type annotations on the next line. */
const ANY_TYPE_PATTERN: RegExp = /:\s*any\b/;

/** The no-ts-expect-error-on-any lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-ts-expect-error-on-any',
  description: 'Warns when @ts-expect-error suppresses errors on code using the any type',
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

        if (TS_EXPECT_ERROR_PATTERN.test(line)) {
          const nextLine: string = lines[i + 1] ?? '';

          if (ANY_TYPE_PATTERN.test(nextLine)) {
            results.push({
              file: context.file,
              line: i + 1,
              column: 1,
              severity: 'warning',
              message: "@ts-expect-error on 'any' typed code - fix the type instead of suppressing",
              ruleId: 'directives/no-ts-expect-error-on-any',
              tip: "Replace 'any' with proper type, or use 'unknown' with type narrowing",
              fix: { range: { start: 0, end: 0 }, text: '' },
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
