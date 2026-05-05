/**
 * Rule: typescript/no-union-null
 *
 * Forbids | null and | undefined in type annotations.
 * Use NullableStr, NullableNum, OptionalStr, etc. from @/schemas/common.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /config\/tooling\/lint\//,
  /config\/test\//,
  /utils\/core\/src\//,
  /schemas\/common\/src\//,
  /extensions\/vscode/,
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

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'typescript/no-union-null',
  description: 'Use Valibot nullable/optional types instead of | null / | undefined',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript', 'valibot'],
  stages: ['lint'],
  fixable: true,

  visitor: {
    TSUnionType(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (isExempt(context.file)) {
        return results;
      }

      // Skip unions inside conditional type extends clauses (type-level pattern matching)
      const before: string = context.content.slice(Math.max(0, node.start - 30), node.start).trim();

      if (/extends\s*$/.test(before)) {
        return results;
      }

      const types = node.types as AstNode[] | undefined;

      if (!types) {
        return results;
      }

      // Only flag when the non-null/undefined type has a shared Optional/Nullable wrapper
      // Base types (Str/string, Num/number, Bool/boolean) have wrappers; custom types don't
      const BASE_TYPE_NODES: ReadonlySet<string> = new Set([
        'TSStringKeyword',
        'TSNumberKeyword',
        'TSBooleanKeyword',
      ]);
      const BASE_TYPE_NAMES: ReadonlySet<string> = new Set([
        'Str',
        'Num',
        'Bool',
        'Path',
        'Command',
        'Hostname',
        'Port',
        'Filename',
        'Void',
        'PositiveInteger',
        'NonNegativeInteger',
      ]);

      /** Map base type keywords/names to their Nullable/Optional wrappers. */
      const NULLABLE_MAP: ReadonlyMap<string, string> = new Map([
        ['TSStringKeyword', 'NullableStr'],
        ['TSNumberKeyword', 'NullableNum'],
        ['TSBooleanKeyword', 'NullableBool'],
        ['Str', 'NullableStr'],
        ['Num', 'NullableNum'],
        ['Bool', 'NullableBool'],
        ['Path', 'NullablePath'],
        ['Command', 'NullableCommand'],
        ['Hostname', 'NullableHostname'],
        ['Port', 'NullablePort'],
        ['Filename', 'NullableFilename'],
      ]);

      const OPTIONAL_MAP: ReadonlyMap<string, string> = new Map([
        ['TSStringKeyword', 'OptionalStr'],
        ['TSNumberKeyword', 'OptionalNum'],
        ['TSBooleanKeyword', 'OptionalBool'],
        ['Str', 'OptionalStr'],
        ['Num', 'OptionalNum'],
        ['Bool', 'OptionalBool'],
        ['Path', 'OptionalPath'],
        ['Command', 'OptionalCommand'],
        ['Hostname', 'OptionalHostname'],
        ['Port', 'OptionalPort'],
        ['Filename', 'OptionalFilename'],
      ]);

      /**
       * Get the base type key for mapping to Nullable/Optional wrappers.
       *
       * @param {AstNode} member - AST node to check
       * @returns {string | undefined} The map key, or undefined if not a base type
       */
      function getBaseTypeKey(member: AstNode): string | undefined {
        if (BASE_TYPE_NODES.has(member.type)) {
          return member.type;
        }
        if (member.type === 'TSTypeReference') {
          const typeName = (member.typeName as AstNode | undefined)?.name as string | undefined;

          if (typeName && BASE_TYPE_NAMES.has(typeName)) {
            return typeName;
          }
        }
        return undefined;
      }

      const otherTypes: AstNode[] = types.filter(
        (t: AstNode): boolean => t.type !== 'TSNullKeyword' && t.type !== 'TSUndefinedKeyword',
      );

      /* Find the first base type to compute the wrapper name */
      let baseKey: string | undefined;

      for (const t of otherTypes) {
        baseKey = getBaseTypeKey(t);
        if (baseKey) {
          break;
        }
      }

      const hasNull: boolean = types.some((t: AstNode): boolean => t.type === 'TSNullKeyword');
      const hasUndefined: boolean = types.some(
        (t: AstNode): boolean => t.type === 'TSUndefinedKeyword',
      );

      if (hasNull && baseKey) {
        const replacement: string = NULLABLE_MAP.get(baseKey) ?? `Nullable${baseKey}`;

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message:
            "Use NullableStr/NullableNum/NullableBool from @/schemas/common instead of '| null'",
          ruleId: 'typescript/no-union-null',
          tip: `Import { ${replacement} } from '@/schemas/common'`,
          fix: { range: { start: node.start, end: node.end }, text: replacement },
        });
      }
      if (hasUndefined && baseKey) {
        const replacement: string = OPTIONAL_MAP.get(baseKey) ?? `Optional${baseKey}`;

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: "Use OptionalStr/OptionalNum from @/schemas/common instead of '| undefined'",
          ruleId: 'typescript/no-union-null',
          tip: `Import { ${replacement} } from '@/schemas/common'`,
          fix: { range: { start: node.start, end: node.end }, text: replacement },
        });
      }

      return results;
    },
  },
};

export default rule;
