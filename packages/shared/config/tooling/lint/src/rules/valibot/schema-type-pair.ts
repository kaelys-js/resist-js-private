/**
 * Rule: valibot/schema-type-pair
 *
 * Every schema must have a corresponding type derived via `v.InferOutput`.
 * Missing type is an error; type exists but does not use `v.InferOutput<typeof XxxSchema>`
 * is a warning.
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

/** The schema-type-pair lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Every schema must have a corresponding type derived via v.InferOutput',
  id: 'valibot/schema-type-pair',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const body = node.body as AstNode[] | undefined;
      if (!body) {
        return results;
      }

      // Collect schema definitions and type aliases
      const schemas: Array<{ name: string; line: number; column: number }> = [];
      const typeAliases: Map<string, AstNode> = new Map();

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
          if (declaration?.type === 'TSTypeAliasDeclaration') {
            const id = declaration.id as AstNode | undefined;
            const typeName: string = (id?.name as string) ?? '';
            if (typeName) {
              typeAliases.set(typeName, declaration);
            }
          }
        }

        if (stmt.type === 'TSTypeAliasDeclaration') {
          const id = stmt.id as AstNode | undefined;
          const typeName: string = (id?.name as string) ?? '';
          if (typeName) {
            typeAliases.set(typeName, stmt);
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
            schemas.push({
              column: id.loc.start.column + 1,
              line: (varDecl === stmt ? stmt : node).loc.start.line,
              name,
            });
          }
        }
      }

      // Check each schema for a corresponding type
      for (const schema of schemas) {
        const expectedType: string = schema.name.replace(/Schema$/, '');
        const typeNode: AstNode | undefined = typeAliases.get(expectedType);

        if (typeNode) {
          // Type exists — check if it uses v.InferOutput<typeof XxxSchema>
          const typeText: string = context.getNodeText(typeNode);
          const expectedPattern: string = `typeof ${schema.name}`;
          const hasInferOutput: boolean =
            (typeText.includes('v.InferOutput') || typeText.includes('v.InferInput')) &&
            typeText.includes(expectedPattern);

          if (!hasInferOutput) {
            results.push({
              column: typeNode.loc.start.column + 1,
              file: context.file,
              fix: { range: { end: typeNode.end, start: typeNode.start }, text: '' },
              line: typeNode.loc.start.line,
              message: `Type '${expectedType}' should be derived from '${schema.name}' using v.InferOutput<typeof ${schema.name}>`,
              ruleId: 'valibot/schema-type-pair',
              severity: 'warning',
              tip: `Replace with: type ${expectedType} = v.InferOutput<typeof ${schema.name}>;`,
            });
          }
        } else {
          // Missing type — error
          results.push({
            column: schema.column,
            file: context.file,
            fix: { range: { end: 0, start: 0 }, text: '' },
            line: schema.line,
            message: `Schema '${schema.name}' has no corresponding type '${expectedType}'`,
            ruleId: 'valibot/schema-type-pair',
            severity: 'error',
            tip: `Add: type ${expectedType} = v.InferOutput<typeof ${schema.name}>;`,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
