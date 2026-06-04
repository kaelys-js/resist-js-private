/**
 * Rule definition: warn when an expect-error directive suppresses
 * errors on a line that uses the 'any' type.
 *
 * The proper fix is to replace 'any' with a real type or 'unknown'
 * with type narrowing rather than suppressing the error. Detection is
 * AST-comment-based; the literal directive is built at runtime so the
 * rule does not self-flag its own source.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';
import { computeLineStarts, offsetToLineNumber } from '@/lint/framework/comment-helpers.ts';

/** Build the directive token at runtime so this source contains no literal occurrence. */
const EXPECT_DIRECTIVE: string = `${'@'}ts${'-'}expect${'-'}error`;

/** Pattern to detect the directive in comment text. */
const DIRECTIVE_PATTERN: RegExp = new RegExp(EXPECT_DIRECTIVE);

/** Pattern to detect ': any' type annotations on the next line. */
const ANY_TYPE_PATTERN: RegExp = /:\s*any\b/;

/** The lint rule definition (warning when expect-error suppresses 'any'-typed code). */
const rule: TypeScriptRule = {
  id: 'directives/no-ts-expect-error-on-any',
  description: `Warns when ${EXPECT_DIRECTIVE} suppresses errors on code using the any type`,
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  /* Detect-only: fixing requires replacing the 'any' type with a real type,
   * which cannot be inferred mechanically. The diagnostic carries NO_OP_FIX. */
  fixable: false,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lineStarts: number[] = computeLineStarts(context.content);
      const lines: string[] = context.content.split('\n');

      for (const comment of context.comments) {
        if (!DIRECTIVE_PATTERN.test(comment.value)) {
          continue;
        }

        const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
        const nextLine: string = lines[lineNumber] ?? '';

        if (ANY_TYPE_PATTERN.test(nextLine)) {
          results.push({
            file: context.file,
            line: lineNumber,
            column: 1,
            severity: 'warning',
            message: `${EXPECT_DIRECTIVE} on 'any' typed code - fix the type instead of suppressing`,
            ruleId: 'directives/no-ts-expect-error-on-any',
            tip: "Replace 'any' with proper type, or use 'unknown' with type narrowing",
            fix: NO_OP_FIX,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
