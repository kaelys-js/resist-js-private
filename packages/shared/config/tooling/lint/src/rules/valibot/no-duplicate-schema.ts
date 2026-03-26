/**
 * Rule: valibot/no-duplicate-schema
 *
 * Detect identical schema field patterns appearing in 3+ files.
 * These should be extracted to @/schemas/common.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Cross-file state: maps "fieldName:schemaText" → set of file paths. */
const FIELD_MAP: Map<string, Set<string>> = new Map();

/** Store the first occurrence location for reporting. */
const FIELD_LOCATIONS: Map<
  string,
  Array<{ file: string; line: number; column: number }>
> = new Map();

/**
 * Normalize schema text by stripping whitespace for comparison.
 *
 * @param {string} text - Raw schema text
 * @returns {string} Normalized text
 */
function normalize(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'valibot/no-duplicate-schema',
  description: 'Schema field patterns appearing in 3+ files should be in @/schemas/common',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['valibot', 'architecture'],
  stages: ['lint'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const callee = node.callee as AstNode | undefined;
      if (!callee) {
        return [];
      }

      if (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression') {
        return [];
      }

      const object = callee.object as AstNode | undefined;
      const property = callee.property as AstNode | undefined;
      const propName: string = (property?.name as string) ?? '';

      if (propName !== 'strictObject') {
        return [];
      }
      if (!context.isImportedFrom((object?.name as string) ?? '', 'valibot')) {
        return [];
      }

      const args = node.arguments as AstNode[] | undefined;
      if (!args || args.length === 0) {
        return [];
      }

      const schemaObj = args[0] as AstNode; // cast safe: length checked above
      if (schemaObj.type !== 'ObjectExpression') {
        return [];
      }

      const properties = schemaObj.properties as AstNode[] | undefined;
      if (!properties) {
        return [];
      }

      for (const prop of properties) {
        if (prop.type === 'SpreadElement') {
          continue;
        }

        const key = prop.key as AstNode | undefined;
        if (!key) {
          continue;
        }

        const keyName: string = (key.name as string) ?? '';
        if (!keyName) {
          continue;
        }

        const value = prop.value as AstNode | undefined;
        if (!value) {
          continue;
        }

        const valueText: string = normalize(context.getNodeText(value));
        const signature: string = `${keyName}:${valueText}`;

        if (!FIELD_MAP.has(signature)) {
          FIELD_MAP.set(signature, new Set());
          FIELD_LOCATIONS.set(signature, []);
        }

        const files: Set<string> = FIELD_MAP.get(signature) as Set<string>;
        const locations = FIELD_LOCATIONS.get(signature) as Array<{
          file: string;
          line: number;
          column: number;
        }>;

        if (!files.has(context.file)) {
          files.add(context.file);
          locations.push({
            file: context.file,
            line: prop.loc.start.line,
            column: prop.loc.start.column + 1,
          });
        }
      }

      // No results during traversal — all reporting in finalize()
      return [];
    },
  },

  finalize(): LintResult[] {
    const results: LintResult[] = [];
    const threshold: number = 3;

    for (const [signature, files] of FIELD_MAP.entries()) {
      if (files.size >= threshold) {
        const locations = FIELD_LOCATIONS.get(signature) as Array<{
          file: string;
          line: number;
          column: number;
        }>;
        if (locations.length === 0) {
          continue;
        }
        const firstLocation = locations[0] as { file: string; line: number; column: number }; // cast safe: length checked above
        const fileList: string = [...files]
          .map((f: string): string => f.replace(/.*packages\//, 'packages/'))
          .join(', ');

        results.push({
          file: firstLocation.file,
          line: firstLocation.line,
          column: firstLocation.column,
          severity: 'error',
          message: `Schema field '${signature}' duplicated in ${files.size} files — extract to @/schemas/common. Files: ${fileList}`,
          ruleId: 'valibot/no-duplicate-schema',
          tip: 'Create a shared schema constant in @/schemas/common and import it',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }
    }

    // Reset state for next run
    FIELD_MAP.clear();
    FIELD_LOCATIONS.clear();

    return results;
  },
};

export default rule;
