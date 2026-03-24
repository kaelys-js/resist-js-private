/**
 * Rule: comments/require-section-order
 *
 * Files must follow canonical section ordering via `// ===` section headers.
 * Expected order: Types/Schemas → Constants → Helpers/Internal → Exported/API → Exports.
 * Imports are always first (no header needed).
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Canonical section order — earlier index = must appear first. */
const SECTION_ORDER: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /type|schema|interface/i, label: 'Types/Schemas' },
  { pattern: /constant|config/i, label: 'Constants' },
  { pattern: /helper|internal|util/i, label: 'Helpers' },
  { pattern: /export|api|public/i, label: 'Exported/API' },
];

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /config\/tooling\/lint\//,
];

/**
 * Check whether a file is exempt.
 *
 * @param {string} filePath - File path
 * @returns {boolean} Whether exempt
 */
function isExempt(filePath: string): boolean {
  return EXEMPT_PATTERNS.some((p: RegExp): boolean => p.test(filePath));
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'comments/require-section-order',
  description: 'File sections marked with // === headers must follow canonical order',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      if (isExempt(context.file)) {
        return results;
      }

      // Extract all // === section headers with their line numbers
      const lines: string[] = context.content.split('\n');
      const sections: Array<{ line: number; name: string; orderIndex: number }> = [];

      for (let i: number = 0; i < lines.length; i++) {
        const match: RegExpMatchArray | null = lines[i].match(/^\/\/\s*={3,}\s*$/);
        if (match) {
          // The section name is on the next line (// Name) or same line
          const nextLine: string = i + 1 < lines.length ? lines[i + 1] : '';
          const nameMatch: RegExpMatchArray | null = nextLine.match(/^\/\/\s*(.+?)\s*$/);
          if (nameMatch) {
            const name: string = nameMatch[1];
            // Find which canonical section this matches
            let orderIndex: number = -1;
            for (let j: number = 0; j < SECTION_ORDER.length; j++) {
              if (SECTION_ORDER[j].pattern.test(name)) {
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
          });
        }

        return results;
      }

      // Check order: each section's orderIndex must be >= previous
      if (sections.length < 2) {
        return results;
      }

      let maxOrder: number = sections[0].orderIndex;
      for (let i: number = 1; i < sections.length; i++) {
        if (sections[i].orderIndex < maxOrder) {
          const current: string = sections[i].name;
          // Find which earlier section is out of order
          const earlier: string =
            sections.find((s: { orderIndex: number }): boolean => s.orderIndex === maxOrder)
              ?.name ?? 'unknown';
          results.push({
            file: context.file,
            line: sections[i].line,
            column: 1,
            severity: 'error',
            message: `Section '${current}' should appear before '${earlier}'`,
            ruleId: 'comments/require-section-order',
            tip: 'Reorder sections: Types/Schemas → Constants → Helpers → Exported/API',
          });
        }
        if (sections[i].orderIndex > maxOrder) {
          maxOrder = sections[i].orderIndex;
        }
      }

      return results;
    },
  },
};

export default rule;
