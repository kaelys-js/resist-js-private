/**
 * Rule: valibot/schema-file-location
 *
 * Schema definitions should live in designated directories or files.
 * Allowed patterns: `schemas/`, `.schema.ts`, `.schemas.ts`, `types/`,
 * `models/`, `contracts/`, `validators/`, and test files.
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

/** Allowed file path patterns for schema definitions. */
const ALLOWED_PATTERNS: readonly RegExp[] = [
  /\/schemas\//,
  /\.schema\.ts$/,
  /\.schemas\.ts$/,
  /\/types\//,
  /\/models\//,
  /\/contracts\//,
  /\/validators\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

/** The schema-file-location lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Schema definitions should live in designated directories or files',
  id: 'valibot/schema-file-location',
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

      // Check if the file contains any schema definitions
      let hasSchema: boolean = false;

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
            hasSchema = true;
            break;
          }
        }

        if (hasSchema) {
          break;
        }
      }

      if (!hasSchema) {
        return results;
      }

      // Check file path against allowed patterns
      const isAllowed: boolean = ALLOWED_PATTERNS.some((pattern: RegExp): boolean =>
        pattern.test(context.file),
      );

      if (!isAllowed) {
        results.push({
          column: 1,
          file: context.file,
          fix: { range: { end: 0, start: 0 }, text: '' },
          line: 1,
          message:
            'Schema definitions should live in schemas/, types/, models/, contracts/, validators/ directories or .schema.ts/.schemas.ts files',
          ruleId: 'valibot/schema-file-location',
          severity: 'warning',
          tip: 'Move schema definitions to a dedicated schema file or directory',
        });
      }

      return results;
    },
  },
};

export default rule;
