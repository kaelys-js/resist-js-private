/**
 * Rule definition: ban whole-file TypeScript no-check directive comments.
 *
 * Every file must have type-checking enabled. Fix type errors
 * individually instead of disabling the entire file. Detection is
 * AST-comment-based; the literal token is built at runtime so the
 * rule does not self-flag its own source.
 *
 * Detect-only: deleting the nocheck directive re-enables file-wide
 * type-checking that the file may not pass, so this rule emits no auto-fix
 * (NO_OP_FIX).
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
const NOCHECK_DIRECTIVE: string = `${'@'}ts${'-'}nocheck`;
const EXPECT_DIRECTIVE: string = `${'@'}ts${'-'}expect${'-'}error`;

/** Pattern to detect the directive in comment text. */
const PATTERN: RegExp = new RegExp(NOCHECK_DIRECTIVE);

/** The lint rule definition (banning whole-file no-check directive comments). */
const rule: TypeScriptRule = {
  id: 'directives/no-ts-nocheck',
  description: `Bans ${NOCHECK_DIRECTIVE} directives — file must have type-checking enabled`,
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  /* Detect-only: deleting the directive re-enables file-wide type-checking the
   * file may fail. That is not a safe mechanical fix. The diagnostic carries
   * NO_OP_FIX; the developer must remove it and fix the errors by hand. */
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lineStarts: number[] = computeLineStarts(context.content);

      for (const comment of context.comments) {
        if (PATTERN.test(comment.value)) {
          const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
          results.push(
            createResult(
              'directives/no-ts-nocheck',
              context.file,
              lineNumber,
              1,
              'error',
              `${NOCHECK_DIRECTIVE} is banned - file must have type-checking enabled`,
              {
                tip: `Remove ${NOCHECK_DIRECTIVE} and fix type errors individually, or use targeted ${EXPECT_DIRECTIVE} with explanations`,
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
