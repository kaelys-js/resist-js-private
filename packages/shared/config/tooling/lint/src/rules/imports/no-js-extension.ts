/**
 * Rule: imports/no-js-extension
 *
 * Forbids `.js` file extensions in import and export paths. This is a
 * TypeScript project using Vite — imports should use `.ts` extension
 * or omit the extension entirely.
 *
 * Exempts VS Code extension files where `.js` may be required for
 * CommonJS compatibility.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Check an import/export source for .js extension.
 *
 * @param {AstNode} node - The import/export node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintResult[]} Array of lint results
 */
function checkJsExtension(node: AstNode, context: VisitorContext): LintResult[] {
  const results: LintResult[] = [];

  const source = node.source as AstNode | undefined;
  const value: string | undefined = (source as { value?: string } | undefined)?.value;
  if (!value) {
    return results;
  }

  // Skip bare package names like 'perfume.js' (npm packages, not file paths)
  if (
    value.endsWith('.js') &&
    !value.startsWith('.') &&
    !value.startsWith('@') &&
    !value.includes('/')
  ) {
    return results;
  }

  if (value.endsWith('.js')) {
    const fixedPath: string = value.replace(/\.js$/, '.ts');
    results.push({
      file: context.file,
      line: node.loc.start.line,
      column: node.loc.start.column + 1,
      severity: 'error',
      message: `Import uses '.js' extension '${value}' — use '.ts' or omit extension`,
      ruleId: 'imports/no-js-extension',
      tip: `Change to '${fixedPath}' — Vite resolves .ts files directly`,
      fix: {
        range: { start: (source?.start ?? 0) + 1, end: (source?.end ?? 0) - 1 },
        text: fixedPath,
      },
    });
  }

  return results;
}
/** The no-js-extension lint rule. */
const rule: TypeScriptRule = {
  id: 'imports/no-js-extension',
  description: 'Import paths must not use .js extension — use .ts or omit',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['imports'],
  stages: ['lint'],

  visitor: {
    ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      return checkJsExtension(node, context);
    },

    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      return checkJsExtension(node, context);
    },

    ExportAllDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      return checkJsExtension(node, context);
    },
  },
};

export default rule;
