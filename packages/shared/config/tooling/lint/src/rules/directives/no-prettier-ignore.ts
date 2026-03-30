/**
 * Rule: directives/no-prettier-ignore
 *
 * Bans Prettier directives (prettier-ignore, prettier-ignore-start,
 * prettier-ignore-end) since this codebase uses Biome for formatting.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern to detect Prettier directives. */
const PRETTIER_DIRECTIVE_PATTERN: RegExp = /prettier-ignore(?:-start|-end)?/;

/** The no-prettier-ignore lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-prettier-ignore',
  description: 'Bans Prettier directives — formatting is handled by Biome',
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

        if (PRETTIER_DIRECTIVE_PATTERN.test(line)) {
          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'error',
            message: 'Prettier directives are not used in this codebase - remove the directive',
            ruleId: 'directives/no-prettier-ignore',
            tip: 'Remove the Prettier directive. Formatting is handled by Biome and should be consistent.',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
