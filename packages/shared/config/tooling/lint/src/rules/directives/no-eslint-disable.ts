/**
 * Rule: directives/no-eslint-disable
 *
 * Bans ESLint directives (eslint-disable, eslint-disable-next-line,
 * eslint-disable-line, eslint-enable) since this codebase does not
 * use ESLint.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern to detect ESLint directives. */
const ESLINT_DIRECTIVE_PATTERN: RegExp = /eslint-disable(?:-next-line|-line)?|eslint-enable/;

/** The no-eslint-disable lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-eslint-disable',
  description: 'Bans ESLint directives — this codebase does not use ESLint',
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
        const match: RegExpMatchArray | null = ESLINT_DIRECTIVE_PATTERN.exec(line);

        if (match) {
          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'error',
            message: `ESLint directive '${match[0]}' is not used in this codebase - remove the directive`,
            ruleId: 'directives/no-eslint-disable',
            tip: 'Remove the ESLint directive. If code needs fixing, fix it. If rule is wrong, discuss changing it.',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
