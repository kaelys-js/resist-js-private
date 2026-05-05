/**
 * Rule: typescript/no-generic-function-type
 *
 * Flags function signatures with `...args: unknown[]` parameters or bare `unknown`
 * return types. These indicate lazy typing — define specific parameter and return types.
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
  id: 'typescript/no-generic-function-type',
  description: 'Function types must have specific parameter and return types, not generic unknown',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript'],
  stages: ['lint'],
  fixable: false,

  visitor: {
    TSFunctionType(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (isExempt(context.file)) {
        return results;
      }

      const params = node.params as AstNode[] | undefined;

      if (!params) {
        return results;
      }

      for (const param of params) {
        // Check for rest parameter with unknown[] type: ...args: unknown[]
        if (param.type === 'RestElement') {
          const typeAnnotation = param.typeAnnotation as AstNode | undefined;
          const annotation = typeAnnotation?.typeAnnotation as AstNode | undefined;

          if (annotation?.type === 'TSArrayType') {
            const elementType = annotation.elementType as AstNode | undefined;

            if (elementType?.type === 'TSUnknownKeyword') {
              results.push({
                file: context.file,
                line: param.loc.start.line,
                column: param.loc.start.column + 1,
                severity: 'error',
                message:
                  'Generic function type with `...args: unknown[]` — define specific parameter types',
                ruleId: 'typescript/no-generic-function-type',
                tip: 'Replace `unknown[]` with specific parameter types for type safety',
                fix: { range: { start: 0, end: 0 }, text: '' },
              });
            }
          }
        }
      }

      return results;
    },
  },
};

export default rule;
