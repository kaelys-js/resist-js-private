/**
 * Rule: directives/no-suppression-in-new-code
 *
 * Warns on TS suppression directive comments as an advisory that new
 * code should be properly typed rather than using type suppressions.
 *
 * The literal directive token is built at runtime to avoid the rule
 * self-flagging its own JSDoc/source.
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

/** Build the directive token at runtime so this source contains no literal occurrence. */
const DIRECTIVE: string = `${'@'}ts${'-'}expect${'-'}error`;

/** The no-suppression-in-new-code lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-suppression-in-new-code',
  description: 'Warns on TS suppression directives — new code should be properly typed',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lineStarts: number[] = computeLineStarts(context.content);

      for (const comment of context.comments) {
        if (comment.value.includes(DIRECTIVE)) {
          const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
          results.push({
            file: context.file,
            line: lineNumber,
            column: 1,
            severity: 'warning',
            message: `New code should not have ${DIRECTIVE} - properly type the code instead`,
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
