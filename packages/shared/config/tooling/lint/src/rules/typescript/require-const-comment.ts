/**
 * Rule: typescript/require-const-comment
 *
 * Every top-level `const` declaration must have a preceding comment
 * (JSDoc block comment or inline `//` comment).
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/**
 * Check if there is a comment on the line(s) immediately before a node.
 *
 * @param node - The AST node to check
 * @param content - Full file source text
 * @returns Whether a comment precedes the node
 */
function hasPrecedingComment(node: AstNode, content: string): boolean {
  const before: string = content.slice(0, node.start);
  const trimmed: string = before.trimEnd();

  // Check for JSDoc or block comment ending
  if (trimmed.endsWith('*/')) {
    return true;
  }

  // Check for single-line comment on the preceding line
  const lastNewline: number = trimmed.lastIndexOf('\n');
  const lastLine: string = lastNewline === -1 ? trimmed : trimmed.slice(lastNewline + 1);
  if (lastLine.trim().startsWith('//')) {
    return true;
  }

  return false;
}

const rule: TypeScriptRule = {
  id: 'typescript/require-const-comment',
  description: 'Every top-level const must have a preceding comment',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    // We check at the Program level to identify top-level declarations only
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const body = node.body as AstNode[] | undefined;
      if (!body) {
        return results;
      }

      for (const stmt of body) {
        let varDecl: AstNode | null = null;

        // Direct top-level: const x = ...
        if (stmt.type === 'VariableDeclaration' && stmt.kind === 'const') {
          varDecl = stmt;
        }
        // Exported: export const x = ...
        if (stmt.type === 'ExportNamedDeclaration') {
          const declaration = stmt.declaration as AstNode | undefined;
          if (declaration?.type === 'VariableDeclaration' && declaration.kind === 'const') {
            varDecl = stmt; // Check comment before the export, not the const
          }
        }

        if (!varDecl) {
          continue;
        }

        if (!hasPrecedingComment(varDecl, context.content)) {
          // Get the const name(s)
          const innerDecl: AstNode =
            varDecl.type === 'ExportNamedDeclaration' ? (varDecl.declaration as AstNode) : varDecl;
          const declarations = innerDecl.declarations as AstNode[] | undefined;
          const names: string[] = [];
          if (declarations) {
            for (const d of declarations) {
              const id = d.id as AstNode | undefined;
              if (id?.type === 'Identifier') {
                names.push((id.name as string) ?? '');
              }
            }
          }
          const nameStr: string = names.join(', ') || '<unnamed>';
          results.push({
            file: context.file,
            line: varDecl.loc.start.line,
            column: varDecl.loc.start.column + 1,
            severity: 'error',
            message: `Top-level const '${nameStr}' is missing a preceding comment`,
            ruleId: 'typescript/require-const-comment',
            tip: 'Add a /** ... */ or // comment above the declaration',
            fix: {
              range: { start: varDecl.start, end: varDecl.start },
              text: `/** Description. */\n`,
            },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
