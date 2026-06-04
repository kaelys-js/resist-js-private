/**
 * Helpers for AST-comment-based rule detection.
 *
 * Rules that detect lint-suppression / directive patterns must iterate
 * `context.comments` (populated by oxc-parser) rather than line-text.
 * String literals or RegExp source containing the pattern won't trigger.
 *
 * @module
 */

import type { LintFix } from '@/lint/framework/types.ts';

/**
 * Compute a fix that removes a directive comment without corrupting
 * surrounding code.
 *
 * Behaviour:
 * - If the comment is alone on its line (nothing but whitespace precedes it),
 *   the whole line is deleted (including its trailing newline).
 * - If the comment is inline after code (e.g. `foo(); // biome-ignore …`),
 *   only the comment span itself is deleted so the preceding code is preserved.
 *
 * Whole-line deletion is only correct for single-line comments. Callers that
 * may encounter multi-line block comments must guard for that case and emit a
 * no-op fix instead of calling this helper.
 *
 * @param {number} commentStart - Byte offset where the comment starts (inclusive).
 * @param {number} commentEnd - Byte offset where the comment ends (exclusive).
 * @param {number[]} lineStarts - Output of {@link computeLineStarts}.
 * @param {string} content - Full source text.
 * @returns {LintFix} Fix that removes either the whole line or just the comment.
 */
export function deleteCommentLineFix(
  commentStart: number,
  commentEnd: number,
  lineStarts: number[],
  content: string,
): LintFix {
  /* Find the 0-based line index containing the comment start. */
  let lineIdx: number = 0;

  for (let i: number = 0; i < lineStarts.length; i++) {
    if ((lineStarts[i] ?? 0) <= commentStart) {
      lineIdx = i;
    } else {
      break;
    }
  }

  const lineStart: number = lineStarts[lineIdx] ?? 0;
  /* Check if the comment is the only content on the line (ignore whitespace). */
  const beforeComment: string = content.slice(lineStart, commentStart);

  if (beforeComment.trim() === '') {
    /* Delete the entire line (including its trailing newline). */
    const lineEnd: number =
      lineIdx + 1 < lineStarts.length
        ? (lineStarts[lineIdx + 1] ?? content.length)
        : content.length;

    return { range: { start: lineStart, end: lineEnd }, text: '' };
  }

  /* Comment is inline after code — delete only the comment span. */
  return { range: { start: commentStart, end: commentEnd }, text: '' };
}

/**
 * Build prefix-sum line-start offsets for a source string.
 *
 * @param {string} content - Full source text.
 * @returns {number[]} Line-start offsets indexed by 0-based line number.
 */
export function computeLineStarts(content: string): number[] {
  const starts: number[] = [0];

  for (let i: number = 0; i < content.length; i++) {
    if (content.codePointAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return starts;
}

/**
 * Translate a character offset into a 1-based line number using a sorted starts array.
 *
 * @param {number} offset - Character offset from start of file.
 * @param {number[]} lineStarts - Output of {@link computeLineStarts}.
 * @returns {number} 1-based line number containing the offset.
 */
export function offsetToLineNumber(offset: number, lineStarts: number[]): number {
  let lo: number = 0;
  let hi: number = lineStarts.length - 1;

  while (lo < hi) {
    const mid: number = (lo + hi + 1) >> 1;
    const start: number = lineStarts[mid] ?? 0;

    if (start <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo + 1;
}
