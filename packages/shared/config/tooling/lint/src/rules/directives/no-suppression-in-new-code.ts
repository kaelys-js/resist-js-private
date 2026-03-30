/**
 * Rule: directives/no-suppression-in-new-code
 *
 * Warns on any @ts-expect-error comment as an advisory that new code
 * should be properly typed rather than using type suppressions.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-suppression-in-new-code lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-suppression-in-new-code',
  description: 'Warns on @ts-expect-error — new code should be properly typed',
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

        if (line.includes('@ts-expect-error')) {
          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'warning',
            message: 'New code should not have @ts-expect-error - properly type the code instead',
            ruleId: 'directives/no-suppression-in-new-code',
            tip: 'This code was recently written. Take the time to add proper types instead of suppressing errors.',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
