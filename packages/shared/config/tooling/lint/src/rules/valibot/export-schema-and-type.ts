/**
 * Rule: valibot/export-schema-and-type
 *
 * When a schema is exported, its corresponding type must also be exported.
 * For example, if `UserSchema` is exported, `User` (derived type) must be too.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Set of Valibot factory method names. */
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

/** The export-schema-and-type lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Exported schemas must have a corresponding exported type',
  id: 'valibot/export-schema-and-type',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],
  fixable: false,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const body = node.body as AstNode[] | undefined;
      if (!body) {
        return results;
      }

      // Collect exported names and schema definitions
      const exportedNames: Set<string> = new Set();
      const exportedSchemas: Array<{ name: string; line: number; column: number }> = [];

      for (const stmt of body) {
        if (stmt.type !== 'ExportNamedDeclaration') {
          continue;
        }

        // Handle export { Foo, Bar } specifiers
        const specifiers = stmt.specifiers as AstNode[] | undefined;
        if (specifiers) {
          for (const spec of specifiers) {
            const exported = spec.exported as AstNode | undefined;
            const local = spec.local as AstNode | undefined;
            const exportedName: string =
              (exported?.name as string) ?? (local?.name as string) ?? '';
            if (exportedName) {
              exportedNames.add(exportedName);
            }
          }
        }

        const declaration = stmt.declaration as AstNode | undefined;
        if (!declaration) {
          continue;
        }

        // Handle exported type aliases
        if (declaration.type === 'TSTypeAliasDeclaration') {
          const id = declaration.id as AstNode | undefined;
          const typeName: string = (id?.name as string) ?? '';
          if (typeName) {
            exportedNames.add(typeName);
          }
        }

        // Handle exported variable declarations (schemas)
        if (declaration.type === 'VariableDeclaration') {
          const declarations = declaration.declarations as AstNode[] | undefined;
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
            if (name) {
              exportedNames.add(name);
            }

            if (name.endsWith('Schema') && isValibotSchemaCall(init, context)) {
              exportedSchemas.push({
                column: stmt.loc.start.column + 1,
                line: stmt.loc.start.line,
                name,
              });
            }
          }
        }
      }

      // For each exported schema, check if the derived type is also exported
      for (const schema of exportedSchemas) {
        const expectedType: string = schema.name.replace(/Schema$/, '');
        if (!exportedNames.has(expectedType)) {
          results.push({
            column: schema.column,
            file: context.file,
            fix: { range: { end: 0, start: 0 }, text: '' },
            line: schema.line,
            message: `Exported schema '${schema.name}' has no corresponding exported type '${expectedType}'`,
            ruleId: 'valibot/export-schema-and-type',
            severity: 'error',
            tip: `Add: export type ${expectedType} = v.InferOutput<typeof ${schema.name}>;`,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
