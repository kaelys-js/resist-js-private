/**
 * @module
 *
 * Rule: comments/require-section-marker-style
 *
 * Enforces a single canonical section marker style across the codebase.
 *
 * Canonical style (top-level only):
 * ```
 * // =============================================================================
 * // Section Title
 * // =============================================================================
 * ```
 *
 * Non-canonical styles flagged:
 * - Block comment dividers: `/* ---...--- *​/`
 * - Dash line-comment dividers at column 0: `// ---...---`
 *
 * Indented dividers (inside objects/functions) are allowed — they serve
 * a different purpose (inline visual separation, not module sections).
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
  CommentInfo,
} from '@/lint/framework/types.ts';
import { computeLineStarts } from '@/lint/framework/comment-helpers.ts';

/** Canonical separator line (77 `=` chars, 80 total with `// `). */
const CANONICAL_LINE: string =
  '// =============================================================================';

/**
 * Pattern matching block-comment section markers: `/* ---...--- *​/`
 * Requires at least 10 repeated `-` characters.
 */
const BLOCK_MARKER_PATTERN: RegExp = /^\/\*\s*-{10,}\s*\*\/$/;

/**
 * Pattern matching the title line inside block markers: `/*  Title  *​/`
 */
const BLOCK_TITLE_PATTERN: RegExp = /^\/\*\s{1,3}(.+?)\s*\*\/$/;

/**
 * Pattern matching non-canonical line-comment section markers: `// ---...---`
 * Requires at least 10 repeated `-` characters.
 */
const DASH_LINE_PATTERN: RegExp = /^\/\/\s*-{10,}$/;

/**
 * Extract the title from a 3-line block-comment section marker.
 *
 * @param {string} line1 - First line (e.g. `/* --- *​/`)
 * @param {string} line2 - Second line (e.g. `/*  Title  *​/`)
 * @param {string} line3 - Third line (e.g. `/* --- *​/`)
 * @returns {string | null} The extracted title, or null if not a valid marker
 */
function extractBlockTitle(line1: string, line2: string, line3: string): string | null {
  const l1: string = line1.trim();
  const l2: string = line2.trim();
  const l3: string = line3.trim();

  if (!BLOCK_MARKER_PATTERN.test(l1)) {
    return null;
  }
  if (!BLOCK_MARKER_PATTERN.test(l3)) {
    return null;
  }

  const titleMatch: RegExpMatchArray | null = l2.match(BLOCK_TITLE_PATTERN);

  if (!titleMatch) {
    return null;
  }

  return (titleMatch[1] ?? '').trim();
}

/**
 * Extract the title from a 3-line dash line-comment section marker.
 *
 * @param {string} line1 - First line (e.g. `// ---...---`)
 * @param {string} line2 - Second line (e.g. `// Title`)
 * @param {string} line3 - Third line (e.g. `// ---...---`)
 * @returns {string | null} The extracted title, or null if not a valid marker
 */
function extractDashTitle(line1: string, line2: string, line3: string): string | null {
  const l1: string = line1.trim();
  const l2: string = line2.trim();
  const l3: string = line3.trim();

  if (!DASH_LINE_PATTERN.test(l1)) {
    return null;
  }
  if (!DASH_LINE_PATTERN.test(l3)) {
    return null;
  }
  if (!l2.startsWith('//')) {
    return null;
  }

  return l2.replace(/^\/\/\s*/, '').trim();
}

/**
 * Build the canonical replacement for a section marker.
 *
 * @param {string} title - The section title
 * @returns {string} The canonical 3-line marker
 */
function buildCanonical(title: string): string {
  return `${CANONICAL_LINE}\n// ${title}\n${CANONICAL_LINE}`;
}

/**
 * Whether a source line's content lies entirely within a real comment node.
 * Keeps the rule from rewriting divider text inside string or template
 * literals, since the parser only emits comment nodes for real comments.
 *
 * @param {number} lineIndex - The zero-based line index
 * @param {string} line - The raw source line text
 * @param {Array<number>} lineStarts - Byte offset of each line's first character
 * @param {Array<CommentInfo>} comments - All comment nodes in the file
 * @returns {boolean} True when the line content is inside a comment
 */
function isCommentLine(
  lineIndex: number,
  line: string,
  lineStarts: number[],
  comments: readonly CommentInfo[],
): boolean {
  const lineStart: number = lineStarts[lineIndex] ?? 0;
  const trimmedEnd: string = line.trimEnd();

  /* A blank line carries no comment content. */
  if (trimmedEnd === '') {
    return false;
  }

  const leadingWhitespace: number = line.length - line.trimStart().length;
  const contentStart: number = lineStart + leadingWhitespace;
  const contentEnd: number = lineStart + trimmedEnd.length;

  for (const comment of comments) {
    /* `comment.end` is exclusive, matching `contentEnd`. The line's content
     * must be fully covered by a single comment span. */
    if (comment.start <= contentStart && comment.end >= contentEnd) {
      return true;
    }
  }

  return false;
}

/** The require-section-marker-style lint rule. */
const rule: TypeScriptRule = {
  id: 'comments/require-section-marker-style',
  description: 'Section markers must use the canonical // === style',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['comments', 'style'],
  stages: ['lint'],
  fixable: true,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lines: string[] = context.content.split('\n');
      const lineStarts: number[] = computeLineStarts(context.content);
      const { comments } = context;

      for (let i: number = 0; i < lines.length - 2; i++) {
        const line1: string = lines[i] ?? '';
        const line2: string = lines[i + 1] ?? '';
        const line3: string = lines[i + 2] ?? '';

        /* Only top-level (column-0) dividers are module-section markers. Indented
         * dividers inside objects/functions are inline separators — rewriting them
         * to the canonical // === form would de-indent and corrupt their alignment. */
        const trimmedLine1: string = line1.trim();
        const isTopLevel: boolean = line1 === trimmedLine1 || /^\S/.test(line1);

        /* String-blindness guard: a candidate 3-line divider block is only a real
         * section marker when ALL THREE lines are actual comments. If any line is
         * inside a string/template literal (e.g. a test fixture) or ordinary code,
         * the text-pattern match is a false positive — skip it so --fix never
         * rewrites string content. */
        const allLinesAreComments: boolean =
          isCommentLine(i, line1, lineStarts, comments) &&
          isCommentLine(i + 1, line2, lineStarts, comments) &&
          isCommentLine(i + 2, line3, lineStarts, comments);

        // --- Check block comment markers: /* ---...--- */ ---
        const blockTitle: string | null =
          isTopLevel && allLinesAreComments ? extractBlockTitle(line1, line2, line3) : null;

        if (blockTitle) {
          // Calculate byte offset for the fix
          const startOffset: number = lines
            .slice(0, i)
            .reduce((sum: number, l: string): number => sum + l.length + 1, 0);
          const endOffset: number =
            startOffset + line1.length + 1 + line2.length + 1 + line3.length;

          results.push({
            file: context.file,
            line: i + 1,
            column: 1,
            severity: 'error',
            message: `Non-canonical section marker style — use // === instead of /* --- */`,
            ruleId: 'comments/require-section-marker-style',
            tip: 'Replace with the canonical // =====...===== style',
            fix: {
              range: { start: startOffset, end: endOffset },
              text: buildCanonical(blockTitle),
            },
          });

          i += 2; // Skip the matched lines
          continue;
        }

        // --- Check dash line-comment markers at column 0: // ---...--- ---
        if (isTopLevel && allLinesAreComments) {
          const dashTitle: string | null = extractDashTitle(line1, line2, line3);

          if (dashTitle) {
            const startOffset: number = lines
              .slice(0, i)
              .reduce((sum: number, l: string): number => sum + l.length + 1, 0);
            const endOffset: number =
              startOffset + line1.length + 1 + line2.length + 1 + line3.length;

            results.push({
              file: context.file,
              line: i + 1,
              column: 1,
              severity: 'error',
              message: `Non-canonical section marker style — use // === instead of // ---`,
              ruleId: 'comments/require-section-marker-style',
              tip: 'Replace with the canonical // =====...===== style',
              fix: {
                range: { start: startOffset, end: endOffset },
                text: buildCanonical(dashTitle),
              },
            });

            i += 2;
            continue;
          }
        }
      }

      return results;
    },
  },
};

export default rule;
