/**
 * Rule: valibot/require-error-map
 *
 * Schema files should have error map companions. When a file contains schema
 * definitions, it should also reference or include an error map (either
 * inline or via a companion `.errors.ts` file).
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

/** The require-error-map lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'i18n'],
  description: 'Schema files should have error map companions',
  id: 'valibot/require-error-map',
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

      let hasSchema: boolean = false;
      let schemaLine: number = 0;
      let schemaColumn: number = 0;
      let hasErrorMap: boolean = false;
      let hasErrorMapImport: boolean = false;

      for (const stmt of body) {
        // Check for imports of error files
        if (stmt.type === 'ImportDeclaration') {
          const source = stmt.source as AstNode | undefined;
          const sourceValue: string = (source as { value?: string })?.value ?? '';
          if (sourceValue.includes('.errors') || sourceValue.includes('error-map')) {
            hasErrorMapImport = true;
          }
        }

        let varDecl: AstNode | undefined;
        let stmtNode: AstNode = stmt;

        if (stmt.type === 'VariableDeclaration') {
          varDecl = stmt;
        }
        if (stmt.type === 'ExportNamedDeclaration') {
          const declaration = stmt.declaration as AstNode | undefined;
          if (declaration?.type === 'VariableDeclaration') {
            varDecl = declaration;
            stmtNode = stmt;
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

          // Detect schema definitions
          if (
            name.endsWith('Schema') &&
            init.type === 'CallExpression' &&
            (context.content.slice(init.start, init.end).includes('strictObject(') ||
              context.content.slice(init.start, init.end).includes('object(') ||
              context.content.slice(init.start, init.end).includes('pipe(')) &&
            !hasSchema
          ) {
            hasSchema = true;
            schemaLine = stmtNode.loc.start.line;
            schemaColumn = stmtNode.loc.start.column + 1;
          }

          // Detect error maps
          if (ERROR_MAP_PATTERN.test(name)) {
            hasErrorMap = true;
          }
        }
      }

      // Flag if schema exists but no error map or error map import
      if (hasSchema && !hasErrorMap && !hasErrorMapImport) {
        results.push({
          column: schemaColumn,
          file: context.file,
          fix: { range: { end: 0, start: 0 }, text: '' },
          line: schemaLine,
          message:
            'File contains schema definitions but no error map — add an error map or import one',
          ruleId: 'valibot/require-error-map',
          severity: 'info',
          tip: 'Create a companion .errors.ts file or define an error map inline for better user-facing error messages',
        });
      }

      return results;
    },
  },
};

export default rule;
