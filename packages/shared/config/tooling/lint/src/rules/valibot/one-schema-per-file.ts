/**
 * Rule: valibot/one-schema-per-file
 *
 * Files with too many schema definitions should be split.
 * More than 5 schemas triggers an info message; more than 10 triggers a warning.
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

/** Threshold for info-level message. */
const INFO_THRESHOLD: number = 5;

/** Threshold for warning-level message. */
const WARNING_THRESHOLD: number = 10;

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

/** The one-schema-per-file lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Files with too many schema definitions should be split',
  id: 'valibot/one-schema-per-file',
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

      // Count schema definitions
      let schemaCount: number = 0;

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
            schemaCount++;
          }
        }
      }

      if (schemaCount > WARNING_THRESHOLD) {
        results.push({
          column: 1,
          file: context.file,
          fix: { range: { end: 0, start: 0 }, text: '' },
          line: 1,
          message: `File contains ${schemaCount} schema definitions (>${WARNING_THRESHOLD}) — split into smaller modules`,
          ruleId: 'valibot/one-schema-per-file',
          severity: 'warning',
          tip: 'Group related schemas into separate files by domain or feature',
        });
      } else if (schemaCount > INFO_THRESHOLD) {
        results.push({
          column: 1,
          file: context.file,
          fix: { range: { end: 0, start: 0 }, text: '' },
          line: 1,
          message: `File contains ${schemaCount} schema definitions (>${INFO_THRESHOLD}) — consider splitting`,
          ruleId: 'valibot/one-schema-per-file',
          severity: 'info',
          tip: 'Group related schemas into separate files by domain or feature',
        });
      }

      return results;
    },
  },
};

export default rule;
