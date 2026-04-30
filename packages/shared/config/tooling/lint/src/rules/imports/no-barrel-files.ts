/**
 * Rule: imports/no-barrel-files
 *
 * Files named `index.ts` that contain re-export statements
 * (`export * from` or `export { } from`) are flagged as barrel files.
 * Barrel files create circular dependency risk.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
/** The no-barrel-files lint rule. */
const rule: TypeScriptRule = {
  id: 'imports/no-barrel-files',
  description: 'Forbids barrel files (index.ts with re-exports)',
  patterns: ['**/index.ts'],
  categories: ['imports', 'architecture'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Only check files named index.ts
      const parts: string[] = context.file.split('/');
      const filename: string = parts.at(-1) ?? '';

      if (filename !== 'index.ts') {
        return results;
      }

      const body = node.body as AstNode[] | undefined;

      if (!body) {
        return results;
      }

      // Check for re-export statements
      let hasReexport: boolean = false;

      for (const stmt of body) {
        // export * from '...'
        if (stmt.type === 'ExportAllDeclaration') {
          hasReexport = true;
          break;
        }

        // export { x } from '...'
        if (stmt.type === 'ExportNamedDeclaration') {
          const source = stmt.source as AstNode | undefined;

          if (source) {
            hasReexport = true;
            break;
          }
        }
      }

      if (hasReexport) {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message:
            'Barrel file detected — index.ts with re-exports creates circular dependency risk',
          ruleId: 'imports/no-barrel-files',
          tip: 'Import from subpath entrypoints instead of barrel files',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
