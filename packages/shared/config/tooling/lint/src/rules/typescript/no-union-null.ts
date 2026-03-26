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

      /**
       * Check if a union member is a base type that has a shared Nullable/Optional wrapper.
       *
       * @param {AstNode} member - AST node to check
       * @returns {boolean} Whether the member is a base type
       */
      function isBaseType(member: AstNode): boolean {
        if (BASE_TYPE_NODES.has(member.type)) {
          return true;
        }
        if (member.type === 'TSTypeReference') {
          const typeName = (member.typeName as AstNode | undefined)?.name as string | undefined;
          if (typeName && BASE_TYPE_NAMES.has(typeName)) {
            return true;
          }
        }
        return false;
      }

      const otherTypes: AstNode[] = types.filter(
        (t: AstNode): boolean => t.type !== 'TSNullKeyword' && t.type !== 'TSUndefinedKeyword',
      );
      const hasBaseType: boolean = otherTypes.some(isBaseType);

      for (const member of types) {
        if (member.type === 'TSNullKeyword' && hasBaseType) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message:
              "Use NullableStr/NullableNum/NullableBool from @/schemas/common instead of '| null'",
            ruleId: 'typescript/no-union-null',
            tip: 'Import the appropriate Nullable type from @/schemas/common',
            fix: { range: { start: node.start, end: node.end }, text: '' },
          });
        }
        if (member.type === 'TSUndefinedKeyword' && hasBaseType) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: "Use OptionalStr/OptionalNum from @/schemas/common instead of '| undefined'",
            ruleId: 'typescript/no-union-null',
            tip: 'Import the appropriate Optional type from @/schemas/common',
            fix: { range: { start: node.start, end: node.end }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
