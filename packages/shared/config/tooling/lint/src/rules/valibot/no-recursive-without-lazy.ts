/**
 * Rule: valibot/no-recursive-without-lazy
 *
 * Recursive schemas must use `v.lazy()`. A schema that references itself
 * by name without wrapping the self-reference in `v.lazy()` will cause
 * a runtime error due to the variable being accessed before initialization.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Set of Valibot factory method names that produce schemas. */
const SCHEMA_FACTORIES: ReadonlySet<string> = new Set([
  'array',
  'boolean',
  'brand',
  'custom',
  'enum',
  'intersect',
  'lazy',
  'literal',
  'map',
  'nullable',
  'number',
  'object',
  'optional',
  'picklist',
  'pipe',
  'record',
  'set',
  'strictObject',
  'strictTuple',
  'string',
  'tuple',
  'union',
  'variant',
]);

/**
 * Check if a node is a valibot schema call.
 *
 * @param {AstNode} node - The AST node to check
 * @param {VisitorContext} context - Visitor context
 * @returns {boolean} Whether the node is a valibot schema call
 */
function isValibotSchemaCall(node: AstNode, context: VisitorContext): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const callee = node.callee as AstNode | undefined;
  if (!callee) {
    return false;
  }
  if (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression') {
    return false;
  }
  const obj = callee.object as AstNode | undefined;
  const prop = callee.property as AstNode | undefined;
  const objName: string = (obj?.name as string) ?? '';
  const methodName: string = (prop?.name as string) ?? '';
  return context.isImportedFrom(objName, 'valibot') && SCHEMA_FACTORIES.has(methodName);
}

/** The no-recursive-without-lazy lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Recursive schemas must use v.lazy() to avoid runtime errors',
  id: 'valibot/no-recursive-without-lazy',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const declarations = node.declarations as AstNode[] | undefined;
      if (!declarations) {
        return results;
      }

      for (const decl of declarations) {
        const id = decl.id as AstNode | undefined;
        const init = decl.init as AstNode | undefined;
        if (!id || !init) {
          continue;
        }

        const name: string = (id.name as string) ?? '';
        if (!name.endsWith('Schema')) {
          continue;
        }

        if (!isValibotSchemaCall(init, context)) {
          continue;
        }

        // Get the schema text and check for self-reference
        const schemaText: string = context.getNodeText(init);

        // Check if the schema references itself by name (word boundary match)
        const selfRefPattern: RegExp = new RegExp(`\\b${name}\\b`);
        if (!selfRefPattern.test(schemaText)) {
          continue;
        }

        // Self-referential — check if it uses v.lazy() somewhere
        if (schemaText.includes('.lazy(')) {
          continue;
        }

        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `Schema '${name}' references itself without v.lazy() — this will cause a runtime error`,
          ruleId: 'valibot/no-recursive-without-lazy',
          severity: 'error',
          tip: `Wrap the self-reference in v.lazy(() => ${name})`,
        });
      }

      return results;
    },
  },
};

export default rule;
