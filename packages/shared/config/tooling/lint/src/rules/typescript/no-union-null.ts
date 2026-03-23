/**
 * Rule: typescript/no-union-null
 *
 * Forbids | null and | undefined in type annotations.
 * Use NullableStr, NullableNum, OptionalStr, etc. from @/schemas/common.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /config\/tooling\/lint\//,
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
      if (isExempt(context.file)) return results;

      const types = node.types as AstNode[] | undefined;
      if (!types) return results;

      for (const member of types) {
        if (member.type === 'TSNullKeyword') {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: "Use NullableStr/NullableNum/NullableBool from @/schemas/common instead of '| null'",
            ruleId: 'typescript/no-union-null',
            tip: 'Import the appropriate Nullable type from @/schemas/common',
            fix: { range: { start: node.start, end: node.end }, text: '' },
          });
        }
        if (member.type === 'TSUndefinedKeyword') {
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
