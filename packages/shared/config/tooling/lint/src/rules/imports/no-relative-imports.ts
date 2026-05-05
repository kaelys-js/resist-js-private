/**
 * Rule: imports/no-relative-imports
 *
 * Forbids relative import paths (`./` and `../`). All imports must use
 * workspace aliases (e.g. `@/schemas/common`) or package names.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Check whether a node has a relative source path.
 *
 * @param {AstNode} node - Import or export declaration node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintResult[]} Array of lint results
 */
function checkRelativeSource(node: AstNode, context: VisitorContext): LintResult[] {
  const results: LintResult[] = [];

  const source = node.source as AstNode | undefined;
  const value: string | undefined = (source as { value?: string } | undefined)?.value;

  if (!value) {
    return results;
  }

  if (value.startsWith('./') || value.startsWith('../')) {
    results.push({
      file: context.file,
      line: node.loc.start.line,
      column: node.loc.start.column + 1,
      severity: 'error',
      message: `Relative import '${value}' — use workspace alias instead`,
      ruleId: 'imports/no-relative-imports',
      tip: 'Replace with an @/ workspace alias (e.g. @/schemas/common)',
      fix: NO_OP_FIX,
    });
  }

  return results;
}
/** The no-relative-imports lint rule. */
const rule: TypeScriptRule = {
  id: 'imports/no-relative-imports',
  description: 'Import paths must not use relative paths (./ or ../)',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['imports'],
  stages: ['lint'],
  fixable: true,

  visitor: {
    ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      return checkRelativeSource(node, context);
    },

    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      return checkRelativeSource(node, context);
    },

    ExportAllDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      return checkRelativeSource(node, context);
    },
  },
};

export default rule;
