/**
 * Rule: valibot/no-nested-optional
 *
 * Bans nested optional/nullable wrappers like `v.optional(v.nullable(...))`
 * or `v.nullable(v.optional(...))`. Use `v.nullish()` instead for fields
 * that can be both null and undefined.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Wrapper method names that mark a field as optional or nullable. */
const WRAPPER_METHODS: ReadonlySet<string> = new Set(['nullable', 'optional']);

/** The no-nested-optional lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Bans nested v.optional(v.nullable(...)) — use v.nullish() instead',
  id: 'valibot/no-nested-optional',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;

      if (!callee) {
        return results;
      }

      if (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression') {
        return results;
      }

      const object = callee.object as AstNode | undefined;
      const property = callee.property as AstNode | undefined;
      const outerMethod: string = (property?.name as string) ?? '';

      if (!WRAPPER_METHODS.has(outerMethod)) {
        return results;
      }
      if (!context.isImportedFrom((object?.name as string) ?? '', 'valibot')) {
        return results;
      }

      // Check if the first argument is also a v.optional() or v.nullable() call
      const args = node.arguments as AstNode[] | undefined;

      if (!args || args.length === 0) {
        return results;
      }

      const innerNode = args[0] as AstNode;

      if (innerNode.type !== 'CallExpression') {
        return results;
      }

      const innerCallee = innerNode.callee as AstNode | undefined;

      if (!innerCallee) {
        return results;
      }

      if (
        innerCallee.type !== 'StaticMemberExpression' &&
        innerCallee.type !== 'MemberExpression'
      ) {
        return results;
      }

      const innerObject = innerCallee.object as AstNode | undefined;
      const innerProperty = innerCallee.property as AstNode | undefined;
      const innerMethod: string = (innerProperty?.name as string) ?? '';

      if (
        WRAPPER_METHODS.has(innerMethod) &&
        context.isImportedFrom((innerObject?.name as string) ?? '', 'valibot')
      ) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: {
            range: { end: callee.end, start: callee.start },
            text: `${(object?.name as string) ?? 'v'}.nullish`,
          },
          line: node.loc.start.line,
          message: `Nested v.${outerMethod}(v.${innerMethod}(...)) — use v.nullish() instead`,
          ruleId: 'valibot/no-nested-optional',
          severity: 'error',
          tip: 'Replace nested optional/nullable wrappers with v.nullish(schema)',
        });
      }

      return results;
    },
  },
};

export default rule;
