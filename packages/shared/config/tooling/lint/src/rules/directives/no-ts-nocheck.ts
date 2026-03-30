/**
 * Rule: directives/no-ts-nocheck
 *
 * Bans @ts-nocheck directives. Every file must have type-checking enabled.
 * Fix type errors individually instead of disabling the entire file.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern to detect @ts-nocheck directives. */
const TS_NOCHECK_PATTERN: RegExp = /@ts-nocheck/;

/** The no-ts-nocheck lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-ts-nocheck',
  description: 'Bans @ts-nocheck directives — file must have type-checking enabled',
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

        if (TS_NOCHECK_PATTERN.test(line)) {
          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'error',
            message: '@ts-nocheck is banned - file must have type-checking enabled',
            ruleId: 'directives/no-ts-nocheck',
            tip: 'Remove @ts-nocheck and fix type errors individually, or use targeted @ts-expect-error with explanations',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
