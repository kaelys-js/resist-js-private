/**
 * Rule: typescript/require-function-schema
 *
 * Enforces use of `functionSchema()` from `@/schemas/function` instead of
 * `v.custom<FnType>(() => true)` for function-typed fields in Valibot schemas.
 *
 * @module
 */

import {
  createFixableResult,
  createResult,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /config\/tooling\/lint\//,
  /schemas\/common\//, // Circular dependency: schemas/common ← schemas/function ← schemas/common
  /schemas\/function\//, // Internal implementation uses v.custom to avoid self-reference
];

/** Pattern to detect function type parameters in v.custom<...>. */
const FUNCTION_TYPE_PATTERN: RegExp = /[=]>\s|Function\b/;

/**
 * Resolve the root object identifier of a (possibly nested) member-expression callee.
 *
 * @param callee - The CallExpression callee node
 * @returns The root identifier name (`v` for `v.custom`, `lib` for `lib.v.custom`), or null
 */
function rootObjectName(callee: AstNode): string | null {
  let cur: AstNode | undefined = callee;

  while (cur && (cur.type === 'MemberExpression' || cur.type === 'StaticMemberExpression')) {
    cur = cur.object as AstNode | undefined;
  }

  if (cur?.type === 'Identifier') {
    return (cur.name as string) ?? null;
  }

  return null;
}

/**
 * Check whether the predicate argument is the trivial always-true form
 * (`() => true` or `() => { return true; }`). Any other body carries real
 * validation logic that functionSchema() would silently drop.
 *
 * @param arg - The second argument node passed to v.custom(...)
 * @returns Whether the predicate is the trivial always-true form
 */
function isTrivialTruePredicate(arg: AstNode | undefined): boolean {
  if (!arg || arg.type !== 'ArrowFunctionExpression') {
    return false;
  }

  const params = arg.params as AstNode[] | undefined;

  if (params && params.length > 0) {
    return false;
  }

  const body = arg.body as AstNode | undefined;

  if (!body) {
    return false;
  }

  // Concise body: () => true
  if (body.type === 'Literal' && (body.value as unknown) === true) {
    return true;
  }

  // Block body: () => { return true; }
  if (body.type === 'BlockStatement') {
    const stmts = body.body as AstNode[] | undefined;

    if (stmts && stmts.length === 1 && stmts[0]?.type === 'ReturnStatement') {
      const returned = stmts[0].argument as AstNode | undefined;

      return returned?.type === 'Literal' && (returned.value as unknown) === true;
    }
  }

  return false;
}

/**
 * Whether the call node is immediately invoked — i.e. its source is followed by
 * an open paren — which would turn the replacement into a broken double call.
 *
 * @param node - The matched CallExpression node
 * @param content - Full file source text
 * @returns Whether the call is immediately invoked
 */
function isImmediatelyInvoked(node: AstNode, content: string): boolean {
  let i: number = node.end;

  while (i < content.length && /\s/.test(content[i] ?? '')) {
    i++;
  }

  return content[i] === '(';
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'typescript/require-function-schema',
  description:
    'Use functionSchema() from @/schemas/function instead of v.custom for function types',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript', 'valibot'],
  stages: ['lint'],
  fixable: true,

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
            const message =
              'Use functionSchema() from @/schemas/function instead of v.custom<FnType>(() => true)';
            const tip =
              'Import { functionSchema } from "@/schemas/function/function" and use v.pipe(functionSchema(), args(...), returns(...))';

            // Transform `v.custom<Fn>(() => true)` → `functionSchema()` ONLY when ALL guards hold;
            // otherwise emit a detect-only NO_OP (NEVER the old destructive whole-node deletion):
            //  1. callee root object is imported from valibot;
            //  2. the predicate is the trivial always-true form (else real validation logic drops);
            //  3. the call is not immediately invoked (IIFE) — `functionSchema()()` is broken;
            //  4. functionSchema is already imported (a single LintFix cannot add the import too).
            const args = node.arguments as AstNode[] | undefined;
            const rootName: string | null = rootObjectName(callee);
            const canTransform: boolean =
              rootName !== null &&
              context.isImportedFrom(rootName, 'valibot') &&
              isTrivialTruePredicate(args?.[0]) &&
              !isImmediatelyInvoked(node, context.content) &&
              context.isImportedFrom('functionSchema', '@/schemas/function');

            if (canTransform) {
              results.push(
                createFixableResult(
                  'typescript/require-function-schema',
                  context.file,
                  node.loc.start.line,
                  node.loc.start.column + 1,
                  'error',
                  message,
                  {
                    fix: { range: { start: node.start, end: node.end }, text: 'functionSchema()' },
                    tip,
                  },
                ),
              );
            } else {
              results.push(
                createResult(
                  'typescript/require-function-schema',
                  context.file,
                  node.loc.start.line,
                  node.loc.start.column + 1,
                  'error',
                  message,
                  { tip },
                ),
              );
            }
          }
        }
      }

      return results;
    },
  },
};

export default rule;
