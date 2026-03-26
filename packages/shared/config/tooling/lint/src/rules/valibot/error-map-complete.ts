/**
 * Rule: valibot/error-map-complete
 *
 * Error maps should cover all schema fields. When a file contains both a
 * schema definition and an error map, the error map should have entries
 * that correspond to the schema's fields.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern to detect error map variable names. */
const ERROR_MAP_PATTERN: RegExp = /(?:ErrorMap|Errors)$/;

/** The error-map-complete lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'i18n'],
  description: 'Error maps should cover all schema fields',
  id: 'valibot/error-map-complete',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const body = node.body as AstNode[] | undefined;
      if (!body) {
        return results;
      }

      // Collect schema field names from v.strictObject() / v.object() calls
      const schemaFields: Set<string> = new Set();
      let hasSchema: boolean = false;

      // Collect error map keys
      const errorMapKeys: Set<string> = new Set();
      let errorMapNode: AstNode | undefined;
      let errorMapName: string = '';

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

          // Check for schema definitions
          if (
            name.endsWith('Schema') &&
            init.type === 'CallExpression' &&
            (context.content.slice(init.start, init.end).includes('strictObject(') ||
              context.content.slice(init.start, init.end).includes('object('))
          ) {
            hasSchema = true;

            // Extract field names from the object literal argument
            const args = init.arguments as AstNode[] | undefined;
            if (args && args.length > 0) {
              const objArg = args[0] as AstNode;
              if (objArg.type === 'ObjectExpression') {
                const props = objArg.properties as AstNode[] | undefined;
                if (props) {
                  for (const prop of props) {
                    if (prop.type === 'SpreadElement') {
                      continue;
                    }
                    const key = prop.key as AstNode | undefined;
                    const keyName: string =
                      (key?.name as string) ?? (key as { value?: string })?.value ?? '';
                    if (keyName) {
                      schemaFields.add(keyName);
                    }
                  }
                }
              }
            }
          }

          // Check for error maps
          if (ERROR_MAP_PATTERN.test(name) && init.type === 'ObjectExpression') {
            errorMapNode = stmt;
            errorMapName = name;
            const props = init.properties as AstNode[] | undefined;
            if (props) {
              for (const prop of props) {
                if (prop.type === 'SpreadElement') {
                  continue;
                }
                const key = prop.key as AstNode | undefined;
                const keyName: string =
                  (key?.name as string) ?? (key as { value?: string })?.value ?? '';
                if (keyName) {
                  errorMapKeys.add(keyName);
                }
              }
            }
          }
        }
      }

      // Only check if both schema and error map exist
      if (hasSchema && errorMapNode && schemaFields.size > 0) {
        const missingFields: string[] = [];
        for (const field of schemaFields) {
          if (!errorMapKeys.has(field)) {
            missingFields.push(field);
          }
        }

        if (missingFields.length > 0) {
          results.push({
            column: errorMapNode.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: 0, start: 0 }, text: '' },
            line: errorMapNode.loc.start.line,
            message: `Error map '${errorMapName}' is missing entries for schema fields: ${missingFields.join(', ')}`,
            ruleId: 'valibot/error-map-complete',
            severity: 'info',
            tip: 'Add error map entries for all schema fields to ensure complete error coverage',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
