/**
 * Rule: valibot/colocate-schema-type
 *
 * Warns when a type alias uses `v.InferOutput<typeof XxxSchema>` but
 * `XxxSchema` is not defined in the same file.
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

/** Regex to extract schema name from v.InferOutput<typeof XxxSchema>. */
const INFER_TYPEOF_RE: RegExp = /v\.\s*(?:InferOutput|InferInput)\s*<\s*typeof\s+(\w+Schema)\s*>/;

/** The colocate-schema-type lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Type aliases using v.InferOutput<typeof XxxSchema> must colocate the schema',
  id: 'valibot/colocate-schema-type',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const body = node.body as AstNode[] | undefined;
      if (!body) {
        return results;
      }

      // Collect all schema definitions in this file
      const localSchemas: Set<string> = new Set();

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
            localSchemas.add(name);
          }
        }
      }

      // Check type aliases for references to schemas not in this file
      for (const stmt of body) {
        let typeAlias: AstNode | undefined;

        if (stmt.type === 'TSTypeAliasDeclaration') {
          typeAlias = stmt;
        }
        if (stmt.type === 'ExportNamedDeclaration') {
          const declaration = stmt.declaration as AstNode | undefined;
          if (declaration?.type === 'TSTypeAliasDeclaration') {
            typeAlias = declaration;
          }
        }

        if (!typeAlias) {
          continue;
        }

        const typeText: string = context.getNodeText(typeAlias);
        const match: RegExpMatchArray | null = INFER_TYPEOF_RE.exec(typeText);
        if (!match) {
          continue;
        }

        const schemaName: string = match[1] as string;
        if (!localSchemas.has(schemaName)) {
          results.push({
            column: typeAlias.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: typeAlias.start, start: typeAlias.start }, text: '' },
            line: typeAlias.loc.start.line,
            message: `Type alias references '${schemaName}' via v.InferOutput but the schema is not defined in this file`,
            ruleId: 'valibot/colocate-schema-type',
            severity: 'warning',
            tip: `Move '${schemaName}' into this file or move the type alias to the file that defines the schema`,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
