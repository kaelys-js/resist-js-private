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

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

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
/** The require-section-marker-style lint rule. */
const rule: TypeScriptRule = {
  id: 'comments/require-section-marker-style',
  description: 'Section markers must use the canonical // === style',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const lines: string[] = context.content.split('\n');

      for (let i: number = 0; i < lines.length - 2; i++) {
        const line1: string = lines[i] ?? '';
        const line2: string = lines[i + 1] ?? '';
        const line3: string = lines[i + 2] ?? '';

        // --- Check block comment markers: /* ---...--- */ ---
        const blockTitle: string | null = extractBlockTitle(line1, line2, line3);
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
        const trimmedLine1: string = line1.trim();
        const isTopLevel: boolean = line1 === trimmedLine1 || /^\S/.test(line1);

        if (isTopLevel) {
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
