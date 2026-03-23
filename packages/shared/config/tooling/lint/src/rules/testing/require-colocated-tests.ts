/**
 * Rule: testing/require-colocated-tests
 *
 * Every TypeScript file that exports functions must have a colocated
 * `*.test.ts` file. Ensures all exported logic has test coverage.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File path patterns exempt from requiring colocated tests. */
const EXEMPT_PATHS: readonly RegExp[] = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\.d\.ts$/,
  /\/index\.ts$/,
  /\.config\.(ts|js)$/,
  /svelte\.config\./,
  /vite\.config\./,
  /config\/tooling\/lint\/src\/framework\//,
  /config\/test\//,
  /\.svelte-kit\//,
  /node_modules\//,
];

/**
 * Check if a file path is exempt from this rule.
 *
 * @param {string} filePath - The file path
 * @returns {boolean} Whether the file is exempt
 */
function isExemptFile(filePath: string): boolean {
  return EXEMPT_PATHS.some((p: RegExp): boolean => p.test(filePath));
}

/**
 * Check if the AST contains any exported function declarations.
 *
 * @param {AstNode} ast - The program AST node
 * @returns {boolean} Whether the file exports functions
 */
function hasExportedFunctions(ast: AstNode): boolean {
  const body = ast.body as AstNode[] | undefined;
  if (!body) return false;

  for (const node of body) {
    if (node.type === 'ExportNamedDeclaration') {
      const declaration = node.declaration as AstNode | undefined;
      if (!declaration) continue;

      if (declaration.type === 'FunctionDeclaration') return true;

      if (declaration.type === 'VariableDeclaration') {
        const declarations = declaration.declarations as AstNode[] | undefined;
        if (!declarations) continue;

        for (const decl of declarations) {
          const init = decl.init as AstNode | undefined;
          if (
            init &&
            (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
          ) {
            return true;
          }
        }
      }
    }

    if (node.type === 'ExportDefaultDeclaration') {
      const declaration = node.declaration as AstNode | undefined;
      if (!declaration) continue;

      if (
        declaration.type === 'FunctionDeclaration' ||
        declaration.type === 'ArrowFunctionExpression' ||
        declaration.type === 'FunctionExpression'
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get the expected test file path for a source file.
 *
 * @param {string} filePath - The source file path
 * @returns {string} The expected test file path
 */
function getTestFilePath(filePath: string): string {
  const dir: string = dirname(filePath);
  const base: string = basename(filePath, '.ts');
  return join(dir, `${base}.test.ts`);
}

const rule: TypeScriptRule = {
  id: 'testing/require-colocated-tests',
  description: 'Files exporting functions must have a colocated .test.ts file',
  patterns: ['**/*.ts'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      if (isExemptFile(context.file)) return [];

      if (!hasExportedFunctions(node)) return [];

      const testPath: string = getTestFilePath(context.file);

      if (existsSync(testPath)) return [];

      return [
        {
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `File exports functions but has no colocated test file`,
          ruleId: 'testing/require-colocated-tests',
          tip: `Create ${basename(testPath)} in the same directory`,
          fix: {
            range: { start: 0, end: 0 },
            text: '',
          },
        },
      ];
    },
  },
};

export default rule;
