/**
 * Rule: valibot/require-schema-suffix
 *
 * Valibot schema declarations must have names ending in "Schema".
 * e.g., `const FooSchema = v.strictObject(...)` not `const Foo = v.strictObject(...)`.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Valibot factory method names that create schemas. */
const SCHEMA_FACTORIES: ReadonlySet<string> = new Set([
  'strictObject',
  'object',
  'pipe',
  'array',
  'record',
  'union',
  'intersect',
  'picklist',
  'literal',
  'nullable',
  'optional',
  'custom',
  'string',
  'number',
  'boolean',
  'lazy',
  'variant',
  'tuple',
  'set',
  'map',
  'enum',
  'brand',
]);

/** The require-schema-suffix lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'naming'],
  description: 'Valibot schema const names must end in "Schema"',
  id: 'valibot/require-schema-suffix',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Only check top-level declarations (not inside functions)
      // Check if we're at program level by looking at parent context
      // Simple heuristic: if indentation is 0 or preceded by 'export', it's top-level
      const beforeNode: string = context.content.slice(Math.max(0, node.start - 50), node.start);
      const lastNewline: number = beforeNode.lastIndexOf('\n');
      const linePrefix: string = lastNewline >= 0 ? beforeNode.slice(lastNewline + 1) : beforeNode;
      const indent: number = linePrefix.length - linePrefix.trimStart().length;

      if (indent > 0 && !linePrefix.trimStart().startsWith('export')) {
        return results; // Inside a function body — skip
      }

      const declarations = node.declarations as AstNode[] | undefined;

      if (!declarations) {
        return results;
      }

      for (const decl of declarations) {
        const id = decl.id as AstNode | undefined;
        const init = decl.init as AstNode | undefined;

        if (!id || !init || id.type !== 'Identifier') {
          continue;
        }

        const name: string = (id.name as string) ?? '';

        // Skip if already ends in Schema
        if (name.endsWith('Schema')) {
          continue;
        }

        // Skip ALL_CAPS constants
        if (/^[A-Z][A-Z0-9_]*$/.test(name)) {
          continue;
        }

        // Check if init is a valibot schema factory call
        if (init.type !== 'CallExpression') {
          continue;
        }

        const callee = init.callee as AstNode | undefined;

        if (!callee) {
          continue;
        }

        // Check for v.method() pattern
        if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
          const obj = callee.object as AstNode | undefined;
          const prop = callee.property as AstNode | undefined;
          const objName: string = (obj?.name as string) ?? '';
          const methodName: string = (prop?.name as string) ?? '';

          // Must be v.<method> where v is imported from valibot
          if (objName === 'v' && SCHEMA_FACTORIES.has(methodName)) {
            results.push({
              column: node.loc.start.column + 1,
              file: context.file,
              fix: { range: { end: node.end, start: node.start }, text: '' },
              line: node.loc.start.line,
              message: `Schema declaration '${name}' must end with 'Schema' — rename to '${name}Schema'`,
              ruleId: 'valibot/require-schema-suffix',
              severity: 'error',
              tip: `Rename to: const ${name}Schema = v.${methodName}(...)`,
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
