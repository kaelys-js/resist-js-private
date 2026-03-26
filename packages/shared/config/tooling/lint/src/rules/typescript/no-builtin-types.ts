/**
 * Rule: typescript/no-builtin-types
 *
 * Forbids use of TypeScript builtin types (`string`, `number`, `boolean`, `void`)
 * in type annotations. Must use Valibot equivalents: `Str`, `Num`, `Bool`, `Void`.
 *
 * Exception: `Promise<void>` is allowed because TypeScript requires `void` in
 * Promise generics.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File paths exempt from this rule (test infrastructure, test files). */
const EXEMPT_PATHS: readonly RegExp[] = [
  /config\/test\//,
  /config\/tooling\/lint\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

/** Map of forbidden builtins to their Valibot replacements. */
const BUILTIN_REPLACEMENTS: ReadonlyMap<string, string> = new Map([
  ['string', 'Str'],
  ['number', 'Num'],
  ['boolean', 'Bool'],
  ['void', 'Void'],
]);

/**
 * Check whether a TSTypeReference node is inside a Promise<void> generic.
 *
 * @param node - The type reference node
 * @param content - File source text
 * @returns Whether this is the `void` inside `Promise<void>`
 */
function isInsidePromiseVoid(node: AstNode, content: string): boolean {
  // Look at surrounding text for Promise<void> pattern
  const start: number = Math.max(0, node.start - 20);
  const surrounding: string = content.slice(start, node.end + 1);
  return /Promise\s*<\s*void\s*>/.test(surrounding);
}
/** The no-builtin-types lint rule. */
const rule: TypeScriptRule = {
  id: 'typescript/no-builtin-types',
  description: 'Use Valibot types (Str, Num, Bool, Void) instead of TypeScript builtins',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    TSTypeAnnotation(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (EXEMPT_PATHS.some((p: RegExp): boolean => p.test(context.file))) {
        return results;
      }

      // Walk the type annotation looking for builtin keyword types
      checkTypeNode(node, context, results);

      return results;
    },
  },
};

/**
 * Recursively check type nodes for forbidden builtins.
 *
 * @param node - Current AST node
 * @param context - Visitor context
 * @param results - Results array to append to
 */
function checkTypeNode(node: AstNode, context: VisitorContext, results: LintResult[]): void {
  // Check TSStringKeyword, TSNumberKeyword, TSBooleanKeyword, TSVoidKeyword
  const keywordMap: Record<string, string> = {
    TSStringKeyword: 'string',
    TSNumberKeyword: 'number',
    TSBooleanKeyword: 'boolean',
    TSVoidKeyword: 'void',
  };

  if (node.type in keywordMap) {
    const builtin: string = keywordMap[node.type] ?? '';
    const replacement: string | undefined = BUILTIN_REPLACEMENTS.get(builtin);

    // Allow void inside Promise<void>
    if (builtin === 'void' && isInsidePromiseVoid(node, context.content)) {
      return;
    }

    if (replacement) {
      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Use '${replacement}' instead of '${builtin}'`,
        ruleId: 'typescript/no-builtin-types',
        tip: `Import { ${replacement} } from '@/schemas/common' and use it instead`,
        example: `import type { ${replacement} } from '@/schemas/common';`,
        fix: { range: { start: node.start, end: node.end }, text: replacement },
      });
    }
    return;
  }

  // Recurse into child nodes that are type-related
  const typeAnnotation = node.typeAnnotation as AstNode | undefined;
  if (typeAnnotation) {
    checkTypeNode(typeAnnotation, context, results);
  }

  // Union/intersection members
  const types = node.types as AstNode[] | undefined;
  if (types) {
    for (const t of types) {
      checkTypeNode(t, context, results);
    }
  }

  // Generic type arguments (OXC uses typeArguments, not typeParameters)
  for (const key of ['typeParameters', 'typeArguments'] as const) {
    const container = node[key] as AstNode | undefined; // cast safe: AST property access
    if (container) {
      const args = container.params as AstNode[] | undefined; // cast safe: AST params property
      if (args) {
        for (const a of args) {
          checkTypeNode(a, context, results);
        }
      }
    }
  }

  // Array element type
  const elementType = node.elementType as AstNode | undefined; // cast safe: AST property
  if (elementType) {
    checkTypeNode(elementType, context, results);
  }

  // Function type return type
  const returnType = node.returnType as AstNode | undefined; // cast safe: AST property
  if (returnType) {
    checkTypeNode(returnType, context, results);
  }

  // Function type parameters
  const fnParams = node.params as AstNode[] | undefined; // cast safe: AST property
  if (fnParams && (node.type === 'TSFunctionType' || node.type === 'TSMethodSignature')) {
    for (const p of fnParams) {
      const paramAnnotation = p.typeAnnotation as AstNode | undefined; // cast safe: AST property
      if (paramAnnotation) {
        checkTypeNode(paramAnnotation, context, results);
      }
    }
  }
}

export default rule;
