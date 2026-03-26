/**
 * Rule: valibot/consistent-nullability
 *
 * Enforces consistent use of optional/nullable within a single
 * `v.strictObject()` or `v.object()` call. Mixing `v.optional()` and
 * `v.nullable()` (without using `v.nullish()`) is confusing and
 * likely indicates an inconsistent API design.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Schema methods that accept an object literal as their first argument. */
const OBJECT_METHODS: ReadonlySet<string> = new Set(['object', 'strictObject']);

/**
 * Get the valibot wrapper method name from a property value node.
 *
 * @param {AstNode} valueNode - The property value AST node
 * @param {VisitorContext} context - Visitor context
 * @returns {string | undefined} The wrapper method name or undefined
 */
function getWrapperMethod(valueNode: AstNode, context: VisitorContext): string | undefined {
  if (valueNode.type !== 'CallExpression') {
    return undefined;
  }
  const callee = valueNode.callee as AstNode | undefined;
  if (!callee) {
    return undefined;
  }
  if (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression') {
    return undefined;
  }
  const obj = callee.object as AstNode | undefined;
  const prop = callee.property as AstNode | undefined;
  const objName: string = (obj?.name as string) ?? '';
  const methodName: string = (prop?.name as string) ?? '';
  if (context.isImportedFrom(objName, 'valibot')) {
    return methodName;
  }
  return undefined;
}

/** The consistent-nullability lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'consistency'],
  description: 'Do not mix v.optional() and v.nullable() in the same schema object',
  id: 'valibot/consistent-nullability',
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
      const propName: string = (property?.name as string) ?? '';

      if (!OBJECT_METHODS.has(propName)) {
        return results;
      }
      if (!context.isImportedFrom((object?.name as string) ?? '', 'valibot')) {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;
      if (!args || args.length === 0) {
        return results;
      }

      const schemaObj = args[0] as AstNode;
      if (schemaObj.type !== 'ObjectExpression') {
        return results;
      }

      const properties = schemaObj.properties as AstNode[] | undefined;
      if (!properties) {
        return results;
      }

      let hasNullable: boolean = false;
      let hasOptional: boolean = false;

      for (const prop of properties) {
        if (prop.type === 'SpreadElement') {
          continue;
        }

        const value = prop.value as AstNode | undefined;
        if (!value) {
          continue;
        }

        const method: string | undefined = getWrapperMethod(value, context);
        if (method === 'optional') {
          hasOptional = true;
        }
        if (method === 'nullable') {
          hasNullable = true;
        }
      }

      if (hasOptional && hasNullable) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `v.${propName}() mixes v.optional() and v.nullable() — pick one or use v.nullish()`,
          ruleId: 'valibot/consistent-nullability',
          severity: 'warning',
          tip: 'Use v.optional() for undefined, v.nullable() for null, or v.nullish() for both — but be consistent',
        });
      }

      return results;
    },
  },
};

export default rule;
