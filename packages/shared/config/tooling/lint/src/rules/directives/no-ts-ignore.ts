/**
 * Rule definition: ban TypeScript ignore-directive comments.
 *
 * Use the expect-error directive with an explanation instead, or fix
 * the underlying type error. Detection is AST-comment-based; the
 * literal token is built at runtime so the rule does not self-flag
 * its own source.
 *
 * The auto-fix replaces the ignore directive with the expect-error
 * directive plus a TODO comment prompting the developer to add an
 * explanation.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  LintFix,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { computeLineStarts, offsetToLineNumber } from '@/lint/framework/comment-helpers.ts';

/** Build the directive token at runtime so this source contains no literal occurrence. */
const IGNORE_DIRECTIVE: string = `${'@'}ts${'-'}ignore`;
const EXPECT_DIRECTIVE: string = `${'@'}ts${'-'}expect${'-'}error`;

/** Pattern to detect the directive in comment text. */
const PATTERN: RegExp = new RegExp(IGNORE_DIRECTIVE);

/**
 * Build a fix that replaces the ignore directive with the expect-error directive.
 *
 * @param {object} comment - The comment object with start/end/value
 * @param {string} content - Full source text
 * @returns {LintFix} Fix that replaces the directive
 */
function buildReplaceFix(
  comment: { start: number; end: number; value: string },
  content: string,
): LintFix {
  const commentText: string = content.slice(comment.start, comment.end);
  /* Use an ASCII ' - ' separator so the rewritten directive satisfies
   * require-ts-expect-error-reason's validity regex and --fix converges. */
  const replaced: string = commentText.replace(
    PATTERN,
    `${EXPECT_DIRECTIVE} - TODO: fix type error`,
  );

  return { range: { start: comment.start, end: comment.end }, text: replaced };
}

/** The lint rule definition (banning TypeScript ignore-directive comments). */
const rule: TypeScriptRule = {
  id: 'directives/no-ts-ignore',
  description: `Bans ${IGNORE_DIRECTIVE} — use ${EXPECT_DIRECTIVE} with an explanation instead`,
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lineStarts: number[] = computeLineStarts(context.content);

      for (const comment of context.comments) {
        if (PATTERN.test(comment.value)) {
          const lineNumber: number = offsetToLineNumber(comment.start, lineStarts);
          results.push({
            file: context.file,
            line: lineNumber,
            column: 1,
            severity: 'error',
            message: `${IGNORE_DIRECTIVE} is banned - use ${EXPECT_DIRECTIVE} with explanation, or fix the type error`,
            ruleId: 'directives/no-ts-ignore',
            tip: `Replace with: // ${EXPECT_DIRECTIVE} - [explanation of why this is needed]`,
            fix: buildReplaceFix(comment, context.content),
          });
        }
      }

      return results;
    },
  },
};

export default rule;
