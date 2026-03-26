/**
 * Rule: testing/require-colocated-tests
 *
 * Every TypeScript file that exports functions must have a colocated
 * `*.test.ts` file. Ensures all exported logic has test coverage.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
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
 * Get names of all exported functions from the AST.
 *
 * @param {AstNode} ast - The program AST node
 * @returns {string[]} Array of exported function names
 */
function getExportedFunctionNames(ast: AstNode): string[] {
  const names: string[] = [];
  const body = ast.body as AstNode[] | undefined;
  if (!body) {
    return names;
  }

  for (const node of body) {
    if (node.type === 'ExportNamedDeclaration') {
      const declaration = node.declaration as AstNode | undefined; // cast safe: AST property
      if (!declaration) {
        continue;
      }

      if (declaration.type === 'FunctionDeclaration') {
        const id = declaration.id as AstNode | undefined; // cast safe: AST property
        const name: string = (id?.name as string) ?? ''; // cast safe: AST name
        if (name) {
          names.push(name);
        }
      }

      if (declaration.type === 'VariableDeclaration') {
        const declarations = declaration.declarations as AstNode[] | undefined; // cast safe: AST property
        if (!declarations) {
          continue;
        }

        for (const decl of declarations) {
          const init = decl.init as AstNode | undefined; // cast safe: AST property
          if (
            init &&
            (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
          ) {
            const id = decl.id as AstNode | undefined; // cast safe: AST property
            const name: string = (id?.name as string) ?? ''; // cast safe: AST name
            if (name) {
              names.push(name);
            }
          }
        }
      }
    }

    if (node.type === 'ExportDefaultDeclaration') {
      const declaration = node.declaration as AstNode | undefined; // cast safe: AST property
      if (!declaration) {
        continue;
      }

      if (
        declaration.type === 'FunctionDeclaration' ||
        declaration.type === 'ArrowFunctionExpression' ||
        declaration.type === 'FunctionExpression'
      ) {
        const id = declaration.id as AstNode | undefined; // cast safe: AST property
        const name: string = (id?.name as string) ?? 'default'; // cast safe: AST name
        names.push(name);
      }
    }
  }

  return names;
}

/**
 * Check which exported functions have test cases in the test file.
 *
 * @param {string} testPath - Path to the test file
 * @param {string[]} functionNames - Exported function names to check
 * @returns {string[]} Function names that have NO test cases
 */
function getUntestedFunctions(testPath: string, functionNames: string[]): string[] {
  const testContent: string = readFileSync(testPath, 'utf8');
  return functionNames.filter((name: string): boolean => !testContent.includes(name));
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
/** The require-colocated-tests lint rule. */
const rule: TypeScriptRule = {
  id: 'testing/require-colocated-tests',
  description: 'Files exporting functions must have a colocated .test.ts file',
  patterns: ['**/*.ts'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      if (isExemptFile(context.file)) {
        return [];
      }

      const functionNames: string[] = getExportedFunctionNames(node);
      if (functionNames.length === 0) {
        return [];
      }

      const testPath: string = getTestFilePath(context.file);

      if (!existsSync(testPath)) {
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
      }

      // Test file exists — check that every exported function is referenced
      const untested: string[] = getUntestedFunctions(testPath, functionNames);
      return untested.map(
        (name: string): LintResult => ({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: `Exported function '${name}' has no test cases in ${basename(testPath)}`,
          ruleId: 'testing/require-colocated-tests',
          tip: `Add tests for '${name}' in ${basename(testPath)}`,
          fix: { range: { start: 0, end: 0 }, text: '' },
        }),
      );
    },
  },
};

export default rule;
