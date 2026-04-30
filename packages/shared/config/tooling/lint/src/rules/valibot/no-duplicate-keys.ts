/**
 * Rule: valibot/no-duplicate-keys
 *
 * Detects duplicate property keys in `v.strictObject()` and `v.object()` calls.
 * Duplicate keys silently overwrite earlier values, causing unexpected behavior.
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

/** The no-duplicate-keys lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Detects duplicate property keys in v.strictObject() / v.object() calls',
  id: 'valibot/no-duplicate-keys',
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

      const seen: Map<string, number> = new Map();

      for (const prop of properties) {
        if (prop.type === 'SpreadElement') {
          continue;
        }

        const key = prop.key as AstNode | undefined;

        if (!key) {
          continue;
        }

        const keyName: string = (key.name as string) ?? (key as { value?: string }).value ?? '';

        if (!keyName) {
          continue;
        }

        if (seen.has(keyName)) {
          results.push({
            column: prop.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: prop.end, start: prop.start }, text: '' },
            line: prop.loc.start.line,
            message: `Duplicate key '${keyName}' in v.${propName}() — later value overwrites earlier one`,
            ruleId: 'valibot/no-duplicate-keys',
            severity: 'error',
            tip: `Remove the duplicate '${keyName}' property or rename one of them`,
          });
        } else {
          seen.set(keyName, prop.loc.start.line);
        }
      }

      return results;
    },
  },
};

export default rule;
