/**
 * Rule: comments/require-section-order
 *
 * Files must follow canonical section ordering via `// ===` section headers.
 * Expected order: Types/Schemas → Constants → Helpers/Internal → Exported/API → Exports.
 * Imports are always first (no header needed).
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

/** Canonical section order — earlier index = must appear first. */
const SECTION_ORDER: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /type|schema|interface/i, label: 'Types/Schemas' },
  { pattern: /constant|config/i, label: 'Constants' },
  { pattern: /helper|internal|util/i, label: 'Helpers' },
  { pattern: /export|api|public/i, label: 'Exported/API' },
];

/** Matches a `// ===` divider line (the rule line of a section marker). */
const DIVIDER_RE: RegExp = /^\/\/\s*={3,}\s*$/;

/** Matches a `// <title>` line, capturing the title text. */
const TITLE_RE: RegExp = /^\/\/\s*(.+?)\s*$/;

/** Matches a top-level `const`/`let`/`var` declaration, capturing the binding name. */
const TOP_LEVEL_DECL_RE: RegExp = /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/;

/**
 * Whether a section title maps to a recognized canonical section.
 *
 * @param {string} title - The section title text (e.g. 'Schemas').
 * @returns {boolean} True if the title matches one of the {@link SECTION_ORDER} patterns.
 */
function isRecognizedSection(title: string): boolean {
  for (const section of SECTION_ORDER) {
    if (section.pattern.test(title)) {
      return true;
    }
  }
  return false;
}

/**
 * Collect every section-header title within a region of source lines.
 *
 * A header is an OPENING `// ===` divider immediately followed by a `// <title>`
 * comment line (not itself a divider). Closing dividers and blank-separated
 * dividers are skipped, so only true section titles are returned.
 *
 * @param {string[]} regionLines - The region's lines (split on '\n').
 * @returns {string[]} Every section title found in the region.
 */
function collectRegionHeaderTitles(regionLines: string[]): string[] {
  const titles: string[] = [];

  for (let i: number = 0; i < regionLines.length - 1; i++) {
    const line: string = regionLines[i] ?? '';

    if (!DIVIDER_RE.test(line)) {
      continue;
    }

    const next: string = regionLines[i + 1] ?? '';

    /* The line after a CLOSING divider is itself a divider (or blank) — skip so
     * only opening-divider → title pairs are treated as headers. */
    if (DIVIDER_RE.test(next)) {
      continue;
    }

    const titleMatch: RegExpMatchArray | null = next.match(TITLE_RE);
    const title: string | undefined = titleMatch?.[1];

    if (title) {
      titles.push(title);
    }
  }

  return titles;
}

/**
 * Extract the names bound by top-level `const`/`let`/`var` declarations in a block.
 *
 * Only column-0 (optionally `export`-prefixed) declarations count — indented
 * declarations are local to a nested scope and irrelevant to inter-block ordering.
 *
 * @param {string} blockText - The block's source text.
 * @returns {string[]} The declared binding names.
 */
function topLevelDeclaredNames(blockText: string): string[] {
  const names: string[] = [];

  for (const line of blockText.split('\n')) {
    const match: RegExpMatchArray | null = line.match(TOP_LEVEL_DECL_RE);
    const name: string | undefined = match?.[1];

    if (name) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Escape a string for safe literal use inside a RegExp.
 *
 * @param {string} value - The string to escape
 * @returns {string} The RegExp-escaped string
 */
function escapeForRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Whether reordering the given block texts is safe from cross-block declaration
 * dependencies.
 *
 * For every top-level `const`/`let`/`var` declared in one block, if its name also
 * appears as an identifier token in ANY other block, moving that block could place
 * a declaration after a use (temporal-dead-zone / use-before-declaration). Such a
 * reorder is NOT behavior-preserving, so it is reported as unsafe.
 *
 * This is a conservative syntactic check (a name appearing in a comment or string
 * of another block also counts) — over-gating only loses a fix, never corrupts code.
 *
 * @param {string[]} blockTexts - The source text of each moved block.
 * @returns {boolean} True if no cross-block declaration dependency exists.
 */
function isReorderSafe(blockTexts: string[]): boolean {
  for (let i: number = 0; i < blockTexts.length; i++) {
    const declaredHere: string[] = topLevelDeclaredNames(blockTexts[i] ?? '');

    if (declaredHere.length === 0) {
      continue;
    }

    for (const name of declaredHere) {
      const tokenRe: RegExp = new RegExp(`\\b${escapeForRegExp(name)}\\b`);

      for (let j: number = 0; j < blockTexts.length; j++) {
        if (j === i) {
          continue;
        }
        if (tokenRe.test(blockTexts[j] ?? '')) {
          return false;
        }
      }
    }
  }

  return true;
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'comments/require-section-order',
  description: 'File sections marked with // === headers must follow canonical order',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['comments', 'style'],
  stages: ['lint'],
  fixable: true,

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      // Extract all // === section headers with their line numbers
      const lines: string[] = context.content.split('\n');
      const sections: Array<{ line: number; name: string; orderIndex: number }> = [];

      for (let i: number = 0; i < lines.length; i++) {
        const line = lines[i] as string | undefined;

        if (!line) {
          continue;
        }

        const match: RegExpMatchArray | null = line.match(/^\/\/\s*={3,}\s*$/);

        if (match) {
          // The section name is on the next line (// Name) or same line
          const nextLine: string = i + 1 < lines.length ? (lines[i + 1] ?? '') : '';
          const nameMatch: RegExpMatchArray | null = nextLine.match(/^\/\/\s*(.+?)\s*$/);

          if (nameMatch) {
            const [, name]: RegExpMatchArray = nameMatch;

            if (!name) {
              continue;
            }
            // Find which canonical section this matches

            let orderIndex: number = -1;

            for (let j: number = 0; j < SECTION_ORDER.length; j++) {
              const section: { pattern: RegExp; label: string } | undefined = SECTION_ORDER[j];

              if (section && section.pattern.test(name)) {
                orderIndex = j;
                break;
              }
            }
            if (orderIndex !== -1) {
              sections.push({ line: i + 1, name, orderIndex });
            }
          }
        }
      }

      // If no section markers found, check if the file NEEDS them
      if (sections.length === 0) {
        // Count content categories in the file
        const hasSchemas: boolean = /v\.strictObject\s*\(|v\.pipe\s*\(|v\.picklist\s*\(/.test(
          context.content,
        );
        const hasExportedFunctions: boolean = /export\s+(async\s+)?function\s/.test(
          context.content,
        );
        const hasConstants: boolean = /^const\s+[A-Z][A-Z0-9_]*\s*[:=]/m.test(context.content);
        const hasTypes: boolean = /^export\s+type\s/m.test(context.content);

        const categoryCount: number = [
          hasSchemas,
          hasExportedFunctions,
          hasConstants,
          hasTypes,
        ].filter(Boolean).length;

        // Only require sections if file has 2+ categories AND is over 50 lines
        if (categoryCount >= 2 && lines.length > 50) {
          results.push({
            file: context.file,
            line: 1,
            column: 1,
            severity: 'error',
            message: `File has ${categoryCount} content categories but no section markers — add // === headers`,
            ruleId: 'comments/require-section-order',
            tip: 'Add section headers: // === Schemas, // === Types, // === Constants, // === API',
            fix: NO_OP_FIX,
          });
        }

        return results;
      }

      // Check order: each section's orderIndex must be >= previous
      if (sections.length < 2) {
        return results;
      }

      const [firstSection]: Array<{ line: number; name: string; orderIndex: number }> = sections;

      if (!firstSection) {
        return results;
      }

      let isOutOfOrder: boolean = false;
      let maxOrder: number = firstSection.orderIndex;

      for (let i: number = 1; i < sections.length; i++) {
        const sect: { line: number; name: string; orderIndex: number } | undefined = sections[i];

        if (!sect) {
          continue;
        }
        if (sect.orderIndex < maxOrder) {
          isOutOfOrder = true;
          const current: string = sect.name;
          // Find which earlier section is out of order
          const targetOrder: number = maxOrder;
          let earlier: string = 'unknown';

          for (const s of sections) {
            if (s.orderIndex === targetOrder) {
              earlier = s.name;
              break;
            }
          }
          results.push({
            file: context.file,
            line: sect.line,
            column: 1,
            severity: 'error',
            message: `Section '${current}' should appear before '${earlier}'`,
            ruleId: 'comments/require-section-order',
            tip: 'Reorder sections: Types/Schemas → Constants → Helpers → Exported/API',
            fix: NO_OP_FIX,
          });
        }
        if (sect.orderIndex > maxOrder) {
          maxOrder = sect.orderIndex;
        }
      }

      /* Build a reorder fix that covers the entire sectioned region.
       * Each section spans from its // === header line to the line before
       * the next section's header (or EOF). We sort the blocks by canonical
       * orderIndex and replace the full range. */
      if (isOutOfOrder && results.length > 0) {
        /* Compute byte offsets for each line (cumulative line lengths + 1 for \n) */
        const lineOffsets: number[] = [0];

        for (let li: number = 0; li < lines.length; li++) {
          lineOffsets.push((lineOffsets[li] ?? 0) + (lines[li]?.length ?? 0) + 1);
        }

        /* Build section blocks with byte ranges.
         * A section starts at the // === header line (sections[i].line is 1-based,
         * and that points to the === line; the header is 3 lines: ===, title, ===).
         * A section ends at the byte before the next section's header starts, or
         * at content.length for the last section. */
        type SectionBlock = {
          orderIndex: number;
          startByte: number;
          endByte: number;
        };
        const blocks: SectionBlock[] = [];

        for (let si: number = 0; si < sections.length; si++) {
          const sect: { line: number; name: string; orderIndex: number } | undefined = sections[si];

          if (!sect) {
            continue;
          }

          const startLine: number = sect.line - 1; // 0-based
          const startByte: number = lineOffsets[startLine] ?? 0;
          const nextSect: { line: number; name: string; orderIndex: number } | undefined =
            sections[si + 1];
          /* Next section's header line (0-based) — section content ends just before it */
          const endByte: number = nextSect
            ? (lineOffsets[nextSect.line - 1] ?? context.content.length)
            : context.content.length;

          blocks.push({ orderIndex: sect.orderIndex, startByte, endByte });
        }

        const [firstBlock] = blocks;
        const lastBlock: SectionBlock | undefined = blocks.at(-1);

        if (blocks.length >= 2 && firstBlock && lastBlock) {
          const regionStart: number = firstBlock.startByte;
          const regionEnd: number = lastBlock.endByte;

          /* Per-block source text (in original order), used both for the gating
           * checks below and to build the reordered replacement. */
          const blockTexts: string[] = blocks.map((blk: SectionBlock): string =>
            context.content.slice(blk.startByte, blk.endByte),
          );

          /* GATE (a): every // === header inside the moved region must map to a
           * recognized section. An unrecognized header would be silently absorbed
           * into a neighbouring block's byte range and dragged when that block moves. */
          const regionLines: string[] = context.content.slice(regionStart, regionEnd).split('\n');
          const allHeadersRecognized: boolean = collectRegionHeaderTitles(regionLines).every(
            (title: string): boolean => isRecognizedSection(title),
          );

          /* GATE (b): reordering must not move a top-level declaration past a use in
           * another block (TDZ / use-before-declaration). */
          const reorderSafe: boolean = isReorderSafe(blockTexts);

          /* Only emit the reorder fix when BOTH gates pass. Otherwise the results
           * keep their NO_OP_FIX (detect-only) — a wrong reorder under --fix would
           * corrupt the file. */
          if (allHeadersRecognized && reorderSafe) {
            /* Sort blocks by canonical order and replace the full region. */
            const reorderedText: string = blocks
              .map((blk: SectionBlock, idx: number): { orderIndex: number; text: string } => ({
                orderIndex: blk.orderIndex,
                text: blockTexts[idx] ?? '',
              }))
              .toSorted(
                (a: { orderIndex: number }, b: { orderIndex: number }): number =>
                  a.orderIndex - b.orderIndex,
              )
              .map((entry: { text: string }): string => entry.text)
              .join('');

            /* Attach fix to the first result only (all results share the same fix) */
            const [firstResult] = results;

            if (firstResult) {
              firstResult.fix = {
                range: { start: regionStart, end: regionEnd },
                text: reorderedText,
              };
            }
          }
        }
      }

      return results;
    },
  },
};

export default rule;
