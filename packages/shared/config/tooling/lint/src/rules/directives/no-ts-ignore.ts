/**
 * Rule: directives/no-ts-ignore
 *
 * Bans @ts-ignore directives. Use @ts-expect-error with an explanation
 * instead, or fix the underlying type error.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern to detect @ts-ignore directives. */
const TS_IGNORE_PATTERN: RegExp = /@ts-ignore/;

/** The no-ts-ignore lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-ts-ignore',
  description: 'Bans @ts-ignore directives — use @ts-expect-error with an explanation instead',
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

        if (TS_IGNORE_PATTERN.test(line)) {
          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'error',
            message:
              '@ts-ignore is banned - use @ts-expect-error with explanation, or fix the type error',
            ruleId: 'directives/no-ts-ignore',
            tip: 'Replace with: // @ts-expect-error - [explanation of why this is needed]',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
