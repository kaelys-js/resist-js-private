/**
 * Rule: valibot/no-empty-object
 *
 * Bans empty `v.object({})` and `v.strictObject({})` calls.
 * An empty schema object accepts any object shape, defeating validation.
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

/** The no-empty-object lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Bans empty v.object({}) and v.strictObject({}) calls',
  id: 'valibot/no-empty-object',
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
      if (!properties || properties.length === 0) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.end, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `Empty v.${propName}({}) has no properties — add schema fields or remove it`,
          ruleId: 'valibot/no-empty-object',
          severity: 'error',
          tip: 'Add properties to the schema or use a different schema type',
        });
      }

      return results;
    },
  },
};

export default rule;
