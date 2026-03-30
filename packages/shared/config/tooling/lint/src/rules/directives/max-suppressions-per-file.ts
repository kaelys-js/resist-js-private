/**
 * Rule: directives/max-suppressions-per-file
 *
 * Warns when a file contains more than 3 @ts-expect-error directives.
 * Too many suppressions indicate deeper type issues that should be
 * addressed through proper refactoring rather than suppression.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The max-suppressions-per-file lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/max-suppressions-per-file',
  description: 'Warns when a file has more than 3 @ts-expect-error directives',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const lines: string[] = context.content.split('\n');
      let count: number = 0;
      let lastOccurrenceLine: number = 0;

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        if (line.includes('@ts-expect-error')) {
          count++;
          lastOccurrenceLine = i + 1;
        }
      }

      if (count > 3) {
        return [
          {
            file: context.file,
            line: lastOccurrenceLine,
            column: 1,
            severity: 'warning',
            message: `File has ${count} @ts-expect-error directives (max: 3) - refactor to reduce suppressions`,
            ruleId: 'directives/max-suppressions-per-file',
            tip: 'Too many suppressions indicate deeper issues. Fix types, add proper definitions, or refactor.',
            fix: { range: { start: 0, end: 0 }, text: '' },
          },
        ];
      }

      return [];
    },
  },
};

export default rule;
