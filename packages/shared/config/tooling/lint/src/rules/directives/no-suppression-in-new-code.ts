/**
 * Rule: directives/no-suppression-in-new-code
 *
 * Warns on TS suppression directive comments as an advisory that new
 * code should be properly typed rather than using type suppressions.
 *
 * The literal directive token is built at runtime to avoid the rule
 * self-flagging its own JSDoc/source.
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
const DIRECTIVE: string = `${'@'}ts${'-'}expect${'-'}error`;

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

/** The no-suppression-in-new-code lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-suppression-in-new-code',
  description: 'Warns on TS suppression directives — new code should be properly typed',
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: true,

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
            fix: deleteCommentLineFix(comment.start, comment.end, lineStarts, context.content),
          });
        }
      }

      return results;
    },
  },
};

export default rule;
