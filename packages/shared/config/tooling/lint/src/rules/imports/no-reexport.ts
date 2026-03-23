/**
 * Rule: imports/no-reexport
 *
 * Forbids re-export syntax: `export { x } from './module'` and
 * `export * from './module'`. All exports must be original declarations.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

const rule: TypeScriptRule = {
  id: 'imports/no-reexport',
  description: 'Forbids re-exports — always import from canonical source',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

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
        fix: { range: { start: node.start, end: node.end }, text: '' },
      });

      return results;
    },

    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const source = node.source as AstNode | undefined;
      if (!source) return results;

      const value: string = ((source as { value?: string } | undefined)?.value as string) ?? '';

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Re-export from "${value}" is forbidden — import from canonical source`,
        ruleId: 'imports/no-reexport',
        tip: 'Import directly from the canonical source instead of re-exporting',
        fix: { range: { start: node.start, end: node.end }, text: '' },
      });

      return results;
    },
  },
};

export default rule;
