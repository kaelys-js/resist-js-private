/**
 * Rule: typescript/no-throw
 *
 * Forbids `throw` statements. Use `return err(ERRORS.DOMAIN.CODE, message)`
 * instead to maintain the Result pattern.
 *
 * Exception: `throw result.error` is allowed at integration boundaries
 * (where the caller doesn't understand Result) when the line contains
 * an `// integration boundary` comment.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/**
 * Check if a throw is an allowed integration boundary throw.
 *
 * Allowed when throwing `.error` property AND the line has
 * an `// integration boundary` comment.
 *
 * @param {AstNode} node - The ThrowStatement node
 * @param {VisitorContext} context - Visitor context
 * @returns {boolean} Whether this throw is exempt
 */
function isIntegrationBoundaryThrow(node: AstNode, context: VisitorContext): boolean {
  const argument = node.argument as AstNode | undefined;
  if (!argument) return false;

  // Must be throwing `.error` property (e.g., result.error)
  const isErrorAccess: boolean =
    (argument.type === 'MemberExpression' || argument.type === 'StaticMemberExpression') &&
    ((argument.property as AstNode | undefined)?.name as string) === 'error';

  if (!isErrorAccess) return false;

  // Must have `// integration boundary` comment on the same line
  const lines: string[] = context.content.split('\n');
  const lineIdx: number = node.loc.start.line - 1;
  if (lineIdx < 0 || lineIdx >= lines.length) return false;

  const currentLine: string = lines[lineIdx];
  return /\/\/.*integration boundary/i.test(currentLine);
}

const rule: TypeScriptRule = {
  id: 'typescript/no-throw',
  description: 'Forbids throw statements — use return err() instead',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    ThrowStatement(node: AstNode, context: VisitorContext): LintResult[] {
      // Allow throw result.error at integration boundaries
      if (isIntegrationBoundaryThrow(node, context)) return [];

      return [{
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: 'Do not use throw — return err(ERRORS.DOMAIN.CODE, message) instead',
        ruleId: 'typescript/no-throw',
        tip: 'Replace throw with return err() to maintain the Result pattern',
        fix: { range: { start: node.start, end: node.start }, text: '' },
      }];
    },
  },
};

export default rule;
