/**
 * Rule: imports/no-reexport
 *
 * Forbids re-export syntax: `export { x } from './module'` and
 * `export * from './module'`. All exports must be original declarations.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  LintFix,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Build a fix that deletes the entire re-export statement including trailing newline.
 *
 * @param {AstNode} node - The re-export AST node
 * @param {string} content - Full source text
 * @returns {LintFix} Fix that removes the statement line
 */
function buildDeleteStatementFix(node: AstNode, content: string): LintFix {
  let end: number = node.end as number;

  /* Extend past trailing semicolons and whitespace to the next newline */
  while (end < content.length && content[end] !== '\n') {
    end++;
  }

  /* Include the newline itself */
  if (end < content.length && content[end] === '\n') {
    end++;
  }

  return { range: { start: node.start as number, end }, text: '' };
}

/** The no-reexport lint rule. */
const rule: TypeScriptRule = {
  id: 'imports/no-reexport',
  description: 'Forbids re-exports — always import from canonical source',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['imports', 'architecture'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    ExportAllDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const source = node.source as AstNode | undefined;
      const value: string = ((source as { value?: string } | undefined)?.value as string) ?? '';

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Re-export 'export * from "${value}"' is forbidden — import from canonical source`,
        ruleId: 'imports/no-reexport',
        tip: 'Import directly from the canonical source instead of re-exporting',
        fix: buildDeleteStatementFix(node, context.content),
      });

      return results;
    },

    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const source = node.source as AstNode | undefined;

      if (!source) {
        return results;
      }

      const value: string = ((source as { value?: string } | undefined)?.value as string) ?? '';

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Re-export from "${value}" is forbidden — import from canonical source`,
        ruleId: 'imports/no-reexport',
        tip: 'Import directly from the canonical source instead of re-exporting',
        fix: buildDeleteStatementFix(node, context.content),
      });

      return results;
    },
  },
};

export default rule;
