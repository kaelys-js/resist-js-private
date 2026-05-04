/**
 * Rule definition: ban whole-file TypeScript no-check directive comments.
 *
 * Every file must have type-checking enabled. Fix type errors
 * individually instead of disabling the entire file. Detection is
 * AST-comment-based; the literal token is built at runtime so the
 * rule does not self-flag its own source.
 *
 * The auto-fix deletes the entire comment line containing the directive.
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
const NOCHECK_DIRECTIVE: string = `${'@'}ts${'-'}nocheck`;
const EXPECT_DIRECTIVE: string = `${'@'}ts${'-'}expect${'-'}error`;

/** Pattern to detect the directive in comment text. */
const PATTERN: RegExp = new RegExp(NOCHECK_DIRECTIVE);

/**
 * Compute a fix that deletes the comment line.
 *
 * @param {number} commentStart - Byte offset where comment starts
 * @param {number} commentEnd - Byte offset where comment ends
 * @param {number[]} lineStarts - Array of byte offsets for each line start
 * @param {string} content - Full source text
 * @returns {LintFix} Fix that removes the line
 */
function deleteCommentLineFix(
  commentStart: number,
  commentEnd: number,
  lineStarts: number[],
  content: string,
): LintFix {
  let lineIdx: number = 0;

  for (let i: number = 0; i < lineStarts.length; i++) {
    if ((lineStarts[i] ?? 0) <= commentStart) {
      lineIdx = i;
    } else {
      break;
    }
  }

  const lineStart: number = lineStarts[lineIdx] ?? 0;
  const beforeComment: string = content.slice(lineStart, commentStart);

  if (beforeComment.trim() === '') {
    const lineEnd: number =
      lineIdx + 1 < lineStarts.length
        ? (lineStarts[lineIdx + 1] ?? content.length)
        : content.length;

    return { range: { start: lineStart, end: lineEnd }, text: '' };
  }

  return { range: { start: commentStart, end: commentEnd }, text: '' };
}

/** The lint rule definition (banning whole-file no-check directive comments). */
const rule: TypeScriptRule = {
  id: 'directives/no-ts-nocheck',
  description: `Bans ${NOCHECK_DIRECTIVE} directives — file must have type-checking enabled`,
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
            message: `${NOCHECK_DIRECTIVE} is banned - file must have type-checking enabled`,
            ruleId: 'directives/no-ts-nocheck',
            tip: `Remove ${NOCHECK_DIRECTIVE} and fix type errors individually, or use targeted ${EXPECT_DIRECTIVE} with explanations`,
            fix: deleteCommentLineFix(comment.start, comment.end, lineStarts, context.content),
          });
        }
      }

      return results;
    },
  },
};

export default rule;
