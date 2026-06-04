/**
 * Rule: directives/no-suppression-in-new-code
 *
 * Warns on TS suppression directive comments as an advisory that new
 * code should be properly typed rather than using type suppressions.
 *
 * The literal directive token is built at runtime to avoid the rule
 * self-flagging its own JSDoc/source.
 *
 * Detect-only: deleting an expect-error suppression directive would re-expose
 * the type error it suppresses, so this rule emits no auto-fix (NO_OP_FIX).
 *
 * @module
 */

import {
  NO_OP_FIX,
  createResult,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
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
  /* Detect-only: deleting the directive would re-expose the suppressed type
   * error — that is not the intended resolution. The diagnostic carries
   * NO_OP_FIX; the developer must properly type the code by hand. */
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lineStarts: number[] = computeLineStarts(context.content);

      for (const comment of context.comments) {
        if (comment.value.includes(DIRECTIVE)) {
          const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
          results.push(
            createResult(
              'directives/no-suppression-in-new-code',
              context.file,
              lineNumber,
              1,
              'warning',
              `New code should not have ${DIRECTIVE} - properly type the code instead`,
              {
                tip: 'This code was recently written. Take the time to add proper types instead of suppressing errors.',
                fix: NO_OP_FIX,
              },
            ),
          );
        }
      }

      return results;
    },
  },
};

export default rule;
