/**
 * Rule: directives slash no eslint dash disable
 *
 * Bans ESLint directive comments (this codebase does not use ESLint).
 * Detection is AST-comment-based so the rule does not self-flag its
 * own JSDoc/source. The literal token is built at runtime.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { computeLineStarts, offsetToLineNumber } from '@/lint/framework/comment-helpers.ts';

/** Build the directive prefix token at runtime so this source contains no literal occurrence. */
const ES_PREFIX: string = `es${'lint'}-`;

/** Pattern to detect ESLint directives in comment text (built from runtime prefix). */
const PATTERN: RegExp = new RegExp(`${ES_PREFIX}(?:disable(?:-next-line|-line)?|enable)`);

/** The lint rule definition (banning ESLint directive comments). */
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
      const lineStarts: number[] = computeLineStarts(context.content);

      for (const comment of context.comments) {
        const match: RegExpMatchArray | null = PATTERN.exec(comment.value);
        if (match) {
          const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
          results.push({
            file: context.file,
            line: lineNumber,
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
