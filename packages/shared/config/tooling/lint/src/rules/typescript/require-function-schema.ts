/**
 * Rule: typescript/require-function-schema
 *
 * Enforces use of `functionSchema()` from `@/schemas/function` instead of
 * `v.custom<FnType>(() => true)` for function-typed fields in Valibot schemas.
 *
 * Also warns when `functionSchema()` is used without `args()`/`returns()` in
 * a `v.pipe()` — full runtime validation is preferred.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /config\/tooling\/lint\//,
  /schemas\/common\//, // Circular dependency: schemas/common ← schemas/function ← schemas/common
  /schemas\/function\//, // Internal implementation uses v.custom to avoid self-reference
];

/** Pattern to detect function type parameters in v.custom<...>. */
const FUNCTION_TYPE_PATTERN: RegExp = /=>\s|Function\b/;

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'typescript/require-function-schema',
  description:
    'Use functionSchema() from @/schemas/function instead of v.custom for function types',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      if (EXEMPT_PATTERNS.some((p: RegExp): boolean => p.test(context.file))) {
        return [];
      }

      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;

      if (!callee) {
        return results;
      }

      // Check for v.custom<FnType>(() => true) pattern
      if (
        (callee.type === 'MemberExpression' || callee.type === 'StaticMemberExpression') &&
        (callee.property as AstNode | undefined)?.name === 'custom'
      ) {
        // Extract type parameter text — oxc-parser may use typeParameters or typeArguments
        const typeParameters = (node.typeParameters ?? node.typeArguments) as AstNode | undefined;

        if (typeParameters) {
          const typeText: string = context.content.slice(typeParameters.start, typeParameters.end);

          if (FUNCTION_TYPE_PATTERN.test(typeText)) {
            results.push({
              file: context.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'error',
              message:
                'Use functionSchema() from @/schemas/function instead of v.custom<FnType>(() => true)',
              ruleId: 'typescript/require-function-schema',
              tip: 'Import { functionSchema } from "@/schemas/function/function" and use v.pipe(functionSchema(), args(...), returns(...))',
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
