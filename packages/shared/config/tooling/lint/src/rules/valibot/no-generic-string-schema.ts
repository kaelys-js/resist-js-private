/**
 * Rule: valibot/no-generic-string-schema
 *
 * Flags v.pipe(v.string(), v.minLength(1)) with no additional constraints.
 * Every schema field should have semantic validation beyond "non-empty string."
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Patterns that indicate a field already has the MINIMUM generic validation. */
const GENERIC_PATTERNS: readonly RegExp[] = [
  /^v\.pipe\(\s*v\.string\(\)\s*,\s*v\.minLength\(\s*1\s*\)\s*\)$/,
  /^v\.optional\(\s*v\.pipe\(\s*v\.string\(\)\s*,\s*v\.minLength\(\s*1\s*\)\s*\)\s*\)$/,
  /^v\.optional\(\s*v\.pipe\(\s*v\.string\(\)\s*,\s*v\.minLength\(\s*1\s*\)\s*\)\s*,\s*[^)]+\)$/,
];

/**
 * Check if value text is the generic v.pipe(v.string(), v.minLength(1)) pattern.
 *
 * @param {string} text - Source text of the schema value
 * @returns {boolean} Whether it matches the generic pattern
 */
function isGenericStringSchema(text: string): boolean {
  const normalized: string = text.replaceAll(/\s+/g, ' ').trim();

  return GENERIC_PATTERNS.some((p: RegExp): boolean => p.test(normalized));
}

/** Rule definition. */
const rule: TypeScriptRule = {
  categories: ['valibot'],
  description: 'v.pipe(v.string(), v.minLength(1)) is too generic — add semantic constraints',
  id: 'valibot/no-generic-string-schema',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const callee = node.callee as AstNode | undefined;

      if (!callee) {
        return results;
      }

      const prop = callee.property as AstNode | undefined;
      const obj = callee.object as AstNode | undefined;

      if ((obj?.name as string) !== 'v' || (prop?.name as string) !== 'strictObject') {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;

      if (!args || args.length === 0) {
        return results;
      }

      const objArg = args[0] as AstNode; // cast safe: length checked above

      if (objArg.type !== 'ObjectExpression') {
        return results;
      }

      const properties = objArg.properties as AstNode[] | undefined;

      if (!properties) {
        return results;
      }

      for (const property of properties) {
        if (property.type !== 'ObjectProperty' && property.type !== 'Property') {
          continue;
        }

        const keyNode = property.key as AstNode | undefined;
        const keyName: string = (keyNode?.name as string) ?? (keyNode?.value as string) ?? '';

        if (!keyName) {
          continue;
        }

        const value = property.value as AstNode | undefined;

        if (!value) {
          continue;
        }

        const valueText: string = context.content.slice(value.start, value.end).trim();

        // Skip if already using a shared schema reference
        if (valueText.includes('Schema') && !valueText.startsWith('v.')) {
          continue;
        }

        if (isGenericStringSchema(valueText)) {
          results.push({
            column: property.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: value.end, start: value.start }, text: '' },
            line: property.loc.start.line,
            message: `Field '${keyName}' uses only v.string() + v.minLength(1) — add semantic constraints (maxLength, regex, pattern) or use a shared schema`,
            ruleId: 'valibot/no-generic-string-schema',
            severity: 'error',
            tip: 'Add v.maxLength(), v.regex(), v.startsWith(), or use a shared schema like PathSchema, NameSchema',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
