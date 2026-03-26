/**
 * Rule: valibot/no-schema-in-component
 *
 * Bans schema definitions in `.svelte` and `.svelte.ts` files. Schemas
 * should live in dedicated schema files, not in component files, to
 * maintain separation of concerns and enable schema reuse.
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

/** The no-schema-in-component lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Bans schema definitions in .svelte files — move to dedicated schema files',
  id: 'valibot/no-schema-in-component',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Only apply to .svelte and .svelte.ts files
      if (!context.file.endsWith('.svelte') && !context.file.endsWith('.svelte.ts')) {
        return results;
      }

      const body = node.body as AstNode[] | undefined;
      if (!body) {
        return results;
      }

      for (const stmt of body) {
        let varDecl: AstNode | undefined;

        if (stmt.type === 'VariableDeclaration') {
          varDecl = stmt;
        }
        if (stmt.type === 'ExportNamedDeclaration') {
          const declaration = stmt.declaration as AstNode | undefined;
          if (declaration?.type === 'VariableDeclaration') {
            varDecl = declaration;
          }
        }

        if (!varDecl) {
          continue;
        }

        const declarations = varDecl.declarations as AstNode[] | undefined;
        if (!declarations) {
          continue;
        }

        for (const decl of declarations) {
          const id = decl.id as AstNode | undefined;
          const init = decl.init as AstNode | undefined;
          if (!id || !init) {
            continue;
          }

          const name: string = (id.name as string) ?? '';
          if (name.endsWith('Schema') && isValibotSchemaCall(init, context)) {
            results.push({
              column: decl.loc.start.column + 1,
              file: context.file,
              fix: { range: { end: 0, start: 0 }, text: '' },
              line: decl.loc.start.line,
              message: `Schema '${name}' should not be defined in a component file — move to a dedicated schema file`,
              ruleId: 'valibot/no-schema-in-component',
              severity: 'warning',
              tip: `Move '${name}' to a separate .ts file (e.g., ${name.replace(/Schema$/, '.schema.ts')})`,
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
