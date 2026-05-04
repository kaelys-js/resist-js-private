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
  LintFix,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** No-op fix sentinel. */
const NO_FIX: LintFix = { range: { start: 0, end: 0 }, text: '' };

/**
 * Build a fix that removes all re-export statements from a barrel file.
 *
 * Scans the AST body for `ExportAllDeclaration` and `ExportNamedDeclaration`
 * with a source, then produces a new file content with those lines removed.
 *
 * @param {AstNode[]} body - The Program body statements
 * @param {string} content - Full source text
 * @returns {LintFix} Fix that replaces the file with re-exports removed
 */
function buildRemoveReexportsFix(body: AstNode[], content: string): LintFix {
  /* Collect byte ranges of re-export statements (including trailing newline) */
  const ranges: Array<{ start: number; end: number }> = [];

  for (const stmt of body) {
    let isReexport: boolean = false;

    if (stmt.type === 'ExportAllDeclaration') {
      isReexport = true;
    } else if (stmt.type === 'ExportNamedDeclaration') {
      const source = stmt.source as AstNode | undefined;

      if (source) {
        isReexport = true;
      }
    }

    if (isReexport) {
      let end: number = stmt.end as number;

      /* Extend past trailing whitespace to include the newline */
      while (end < content.length && content[end] !== '\n') {
        end++;
      }

      if (end < content.length && content[end] === '\n') {
        end++;
      }

      ranges.push({ start: stmt.start as number, end });
    }
  }

  if (ranges.length === 0) {
    return NO_FIX;
  }

  /* Build the new content by excluding the re-export ranges */
  let result: string = '';
  let cursor: number = 0;

  for (const range of ranges) {
    result += content.slice(cursor, range.start);
    cursor = range.end;
  }

  result += content.slice(cursor);

  return { range: { start: 0, end: content.length }, text: result };
}

/** The no-barrel-files lint rule. */
const rule: TypeScriptRule = {
  id: 'imports/no-barrel-files',
  description: 'Forbids barrel files (index.ts with re-exports)',
  patterns: ['**/index.ts'],
  categories: ['imports', 'architecture'],
  stages: ['lint', 'ci'],
  fixable: true,

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
          fix: buildRemoveReexportsFix(body, context.content),
        });
      }

      return results;
    },
  },
};

export default rule;
