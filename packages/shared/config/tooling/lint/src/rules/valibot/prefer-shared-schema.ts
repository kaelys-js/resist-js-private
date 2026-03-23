/**
 * Rule: valibot/prefer-shared-schema
 *
 * When a field name in v.strictObject() matches a known pattern
 * (path, url, port, version, command, hostname), suggest using
 * the corresponding shared schema from @/schemas/common instead
 * of bare v.string() or v.pipe(v.string(), ...).
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Map of field name patterns to suggested shared schemas. */
const SCHEMA_SUGGESTIONS: readonly { pattern: RegExp; schema: string; source: string }[] = [
  { pattern: /[Pp]ath|[Dd]ir|[Ff]ile/, schema: 'PathSchema', source: '@/schemas/common' },
  { pattern: /[Uu]rl|URL|[Ee]ndpoint/, schema: 'UrlStringSchema', source: '@/schemas/common' },
  { pattern: /[Pp]ort$/, schema: 'PortSchema', source: '@/schemas/common' },
  { pattern: /[Vv]ersion$/, schema: 'SemverSchema', source: '@/schemas/common' },
  { pattern: /[Cc]ommand|[Cc]md$/, schema: 'CommandSchema', source: '@/schemas/common' },
  { pattern: /[Hh]ostname|[Hh]ost$/, schema: 'HostnameSchema', source: '@/schemas/common' },
];

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /config\/tooling\/lint\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
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

/**
 * Check if a property value uses v.string() or v.pipe(v.string(), ...) without
 * already referencing a shared schema.
 *
 * @param {string} valueText - Source text of the property value
 * @returns {boolean} Whether the value is a string-based schema
 */
function isStringBasedSchema(valueText: string): boolean {
  if (valueText === 'v.string()') return true;
  if (valueText.startsWith('v.pipe(v.string()')) return true;
  if (valueText.startsWith('v.optional(v.string()')) return true;
  if (valueText.startsWith('v.optional(v.pipe(v.string()')) return true;
  return false;
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'valibot/prefer-shared-schema',
  description: 'Use shared schemas (PathSchema, UrlStringSchema, etc.) for matching field names',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      if (isExempt(context.file)) return results;

      const callee = node.callee as AstNode | undefined;
      if (!callee) return results;

      const prop = callee.property as AstNode | undefined;
      const obj = callee.object as AstNode | undefined;
      if ((obj?.name as string) !== 'v' || (prop?.name as string) !== 'strictObject') return results;

      const args = node.arguments as AstNode[] | undefined;
      if (!args || args.length === 0) return results;

      const objArg: AstNode = args[0];
      if (objArg.type !== 'ObjectExpression') return results;

      const properties = objArg.properties as AstNode[] | undefined;
      if (!properties) return results;

      for (const property of properties) {
        if (property.type !== 'ObjectProperty' && property.type !== 'Property') continue;

        const keyNode = property.key as AstNode | undefined;
        const keyName: string = (keyNode?.name as string) ?? (keyNode?.value as string) ?? '';
        if (!keyName) continue;

        const value = property.value as AstNode | undefined;
        if (!value) continue;

        const valueText: string = context.content.slice(value.start, value.end).trim();

        // Skip if already using a shared schema (e.g., PathSchema, PortSchema)
        if (valueText.includes('Schema') && !valueText.startsWith('v.')) continue;

        // Only check string-based schemas
        if (!isStringBasedSchema(valueText)) continue;

        // Check field name against patterns
        for (const suggestion of SCHEMA_SUGGESTIONS) {
          if (suggestion.pattern.test(keyName)) {
            results.push({
              file: context.file,
              line: property.loc.start.line,
              column: property.loc.start.column + 1,
              severity: 'error',
              message: `Field '${keyName}' should use ${suggestion.schema} from ${suggestion.source}`,
              ruleId: 'valibot/prefer-shared-schema',
              tip: `Replace with ${suggestion.schema} for type-safe branded validation`,
              fix: { range: { start: value.start, end: value.end }, text: suggestion.schema },
            });
            break;
          }
        }
      }

      return results;
    },
  },
};

export default rule;
