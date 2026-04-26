/**
 * Rule: valibot/no-orphan-schemas
 *
 * Every exported schema must have a corresponding exported type alias.
 * Missing type is an error; type exists but is not exported is a warning.
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

/** The no-orphan-schemas lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Every exported schema must have a corresponding exported type alias',
  fixable: true,
  id: 'valibot/no-orphan-schemas',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const body = node.body as AstNode[] | undefined;
      if (!body) {
        return results;
      }

      // Collect all schema definitions, type aliases, and exported names
      const allSchemas: Map<
        string,
        { line: number; column: number; exported: boolean; stmtEnd: number }
      > = new Map();
      const allTypes: Map<string, AstNode> = new Map();
      const exportedNames: Set<string> = new Set();

      for (const stmt of body) {
        if (stmt.type === 'ExportNamedDeclaration') {
          // Handle export { Foo, Bar } specifiers
          const specifiers = stmt.specifiers as AstNode[] | undefined;
          if (specifiers) {
            for (const spec of specifiers) {
              const exported = spec.exported as AstNode | undefined;
              const local = spec.local as AstNode | undefined;
              const name: string = (exported?.name as string) ?? (local?.name as string) ?? '';
              if (name) {
                exportedNames.add(name);
              }
            }
          }

          const declaration = stmt.declaration as AstNode | undefined;
          if (!declaration) {
            continue;
          }

          if (declaration.type === 'TSTypeAliasDeclaration') {
            const id = declaration.id as AstNode | undefined;
            const typeName: string = (id?.name as string) ?? '';
            if (typeName) {
              allTypes.set(typeName, declaration);
              exportedNames.add(typeName);
            }
          }

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
                allSchemas.set(name, {
                  column: stmt.loc.start.column + 1,
                  exported: true,
                  line: stmt.loc.start.line,
                  stmtEnd: stmt.end,
                });
              }
            }
          }
        }

        // Non-exported type alias
        if (stmt.type === 'TSTypeAliasDeclaration') {
          const id = stmt.id as AstNode | undefined;
          const typeName: string = (id?.name as string) ?? '';
          if (typeName) {
            allTypes.set(typeName, stmt);
          }
        }

        // Non-exported variable declaration (schema)
        if (stmt.type === 'VariableDeclaration') {
          const declarations = stmt.declarations as AstNode[] | undefined;
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
            if (
              name.endsWith('Schema') &&
              isValibotSchemaCall(init, context) &&
              !allSchemas.has(name)
            ) {
              allSchemas.set(name, {
                column: stmt.loc.start.column + 1,
                exported: false,
                line: stmt.loc.start.line,
                stmtEnd: stmt.end,
              });
            }
          }
        }
      }

      // Check exported schemas for corresponding type aliases
      for (const [schemaName, info] of allSchemas.entries()) {
        if (!info.exported) {
          continue;
        }

        const expectedType: string = schemaName.replace(/Schema$/, '');

        if (!allTypes.has(expectedType)) {
          // Type alias is completely missing — insert after schema declaration
          results.push({
            column: info.column,
            file: context.file,
            fix: {
              range: { end: info.stmtEnd, start: info.stmtEnd },
              text: `\nexport type ${expectedType} = v.InferOutput<typeof ${schemaName}>;\n`,
            },
            line: info.line,
            message: `Exported schema '${schemaName}' has no corresponding type alias '${expectedType}'`,
            ruleId: 'valibot/no-orphan-schemas',
            severity: 'error',
            tip: `Add: export type ${expectedType} = v.InferOutput<typeof ${schemaName}>;`,
          });
        } else if (!exportedNames.has(expectedType)) {
          // Type alias exists but is not exported — prepend `export ` keyword
          const typeNode: AstNode | undefined = allTypes.get(expectedType);
          if (typeNode === undefined) {
            continue;
          }
          results.push({
            column: info.column,
            file: context.file,
            fix: {
              range: { end: typeNode.start, start: typeNode.start },
              text: 'export ',
            },
            line: info.line,
            message: `Type '${expectedType}' exists but is not exported alongside schema '${schemaName}'`,
            ruleId: 'valibot/no-orphan-schemas',
            severity: 'warning',
            tip: `Add 'export' to the type alias: export type ${expectedType} = ...`,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
