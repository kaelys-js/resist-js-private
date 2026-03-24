/**
 * Rule: imports/require-import-groups
 *
 * Enforces blank lines between import groups:
 * 1. Node builtins (`node:*`)
 * 2. External packages (`valibot`, `@sveltejs/*`, etc.)
 * 3. Workspace aliases (`@/*`)
 *
 * A blank line must appear when consecutive imports change groups.
 * No blank line required within the same group.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /config\/tooling\/lint\//,
];

/**
 * Classify an import source into a group.
 *
 * @param {string} source - The import source string (e.g., 'node:fs', 'valibot', '@/schemas/common')
 * @returns {number} Group number: 1 = node builtins, 2 = external, 3 = workspace
 */
function classifyImport(source: string): number {
  if (source.startsWith('node:')) {
    return 1;
  }
  if (source.startsWith('@/')) {
    return 3;
  }
  return 2;
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'imports/require-import-groups',
  description: 'Require blank lines between import groups (node, external, workspace)',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      if (EXEMPT_PATTERNS.some((p: RegExp): boolean => p.test(context.file))) {
        return [];
      }

      const body = node.body as AstNode[] | undefined;
      if (!body) {
        return [];
      }

      // Collect consecutive import declarations
      const imports: AstNode[] = [];
      for (const stmt of body) {
        if (stmt.type === 'ImportDeclaration') {
          imports.push(stmt);
        } else if (imports.length > 0) {
          break; // Imports end when a non-import statement appears
        }
      }

      if (imports.length < 2) {
        return [];
      }

      const results: LintResult[] = [];

      for (let i: number = 0; i < imports.length - 1; i++) {
        const current: AstNode = imports[i];
        const next: AstNode = imports[i + 1];

        const currentSource: string = ((current.source as AstNode)?.value as string) ?? '';
        const nextSource: string = ((next.source as AstNode)?.value as string) ?? '';

        const currentGroup: number = classifyImport(currentSource);
        const nextGroup: number = classifyImport(nextSource);

        if (currentGroup === nextGroup) {
          continue;
        }

        // Groups differ — check for blank line
        const between: string = context.content.slice(current.end, next.start);
        const hasBlankLine: boolean = /\n\s*\n/.test(between);

        if (!hasBlankLine) {
          results.push({
            file: context.file,
            line: next.loc.start.line,
            column: 1,
            severity: 'error',
            message: `Add a blank line between import groups (${currentGroup === 1 ? 'node' : currentGroup === 2 ? 'external' : 'workspace'} → ${nextGroup === 1 ? 'node' : nextGroup === 2 ? 'external' : 'workspace'})`,
            ruleId: 'imports/require-import-groups',
            tip: 'Separate node:*, external, and @/ imports with blank lines',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
