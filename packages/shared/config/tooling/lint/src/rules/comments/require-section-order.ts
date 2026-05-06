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

          /* Extract each block's text and sort by canonical order */
          const sortedTexts: string[] = [...blocks]
            .toSorted((a: SectionBlock, b: SectionBlock): number => a.orderIndex - b.orderIndex)
            .map((blk: SectionBlock): string => context.content.slice(blk.startByte, blk.endByte));

          const reorderedText: string = sortedTexts.join('');

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

      return results;
    },
  },
};

export default rule;
