/**
 * Rule: directives slash no eslint dash disable
 *
 * Bans ESLint directive comments (this codebase does not use ESLint).
 * Detection is AST-comment-based so the rule does not self-flag its
 * own JSDoc/source. The literal token is built at runtime.
 *
 * The auto-fix deletes the entire comment. For line comments, the whole
 * line is removed. For block comments, the comment range is removed.
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

/** Build the directive prefix token at runtime so this source contains no literal occurrence. */
const ES_PREFIX: string = `es${'lint'}-`;

/** Pattern to detect ESLint directives in comment text (built from runtime prefix). */
const PATTERN: RegExp = new RegExp(`${ES_PREFIX}(?:disable(?:-next-line|-line)?|enable)`);

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
  /* Find the line containing the comment start */
  let lineIdx: number = 0;

  for (let i: number = 0; i < lineStarts.length; i++) {
    if ((lineStarts[i] ?? 0) <= commentStart) {
      lineIdx = i;
    } else {
      break;
    }
  }

  const lineStart: number = lineStarts[lineIdx] ?? 0;
  /* Check if the comment is the only content on the line (ignore whitespace) */
  const beforeComment: string = content.slice(lineStart, commentStart);

  if (beforeComment.trim() === '') {
    /* Delete the entire line */
    const lineEnd: number =
      lineIdx + 1 < lineStarts.length
        ? (lineStarts[lineIdx + 1] ?? content.length)
        : content.length;

    return { range: { start: lineStart, end: lineEnd }, text: '' };
  }

  /* Comment is inline — just delete the comment itself */
  return { range: { start: commentStart, end: commentEnd }, text: '' };
}

/** The lint rule definition (banning ESLint directive comments). */
const rule: TypeScriptRule = {
  id: 'directives/no-eslint-disable',
  description: 'Bans ESLint directives — this codebase does not use ESLint',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: true,

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
            fix: deleteCommentLineFix(comment.start, comment.end, lineStarts, context.content),
          });
        }
      }

      return results;
    },
  },
};

export default rule;
