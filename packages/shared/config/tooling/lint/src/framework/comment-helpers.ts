/**
 * Helpers for AST-comment-based rule detection.
 *
 * Rules that detect lint-suppression / directive patterns must iterate
 * `context.comments` (populated by oxc-parser) rather than line-text.
 * String literals or RegExp source containing the pattern won't trigger.
 *
 * @module
 */

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
