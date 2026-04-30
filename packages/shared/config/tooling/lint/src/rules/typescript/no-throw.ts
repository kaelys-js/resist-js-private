/**
 * @module
 *
 * Rule: typescript/no-throw
 *
 * Forbids `throw` statements. Use `return err(ERRORS.DOMAIN.CODE, message)`
 * instead to maintain the Result pattern.
 *
 * Exception: throws are allowed at integration boundaries (where the caller
 * doesn't understand Result) when the line or surrounding block contains
 * an `// integration boundary: <reason>` comment. Allowed forms:
 * - `throw result.error` — re-throw the original error
 * - `throw new Error(...)` — wrap with a descriptive message
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Check if a line (or its surrounding IfStatement block) contains an
 * `// integration boundary: <reason>` comment.
 *
 * @param {AstNode} node - The ThrowStatement node
 * @param {VisitorContext} context - Visitor context
 * @returns {boolean} Whether this line has an integration boundary comment
 */
function hasIntegrationBoundaryComment(node: AstNode, context: VisitorContext): boolean {
  const lines: string[] = context.content.split('\n');
  const lineIdx: number = node.loc.start.line - 1;

  if (lineIdx < 0 || lineIdx >= lines.length) {
    return false;
  }

  const currentLine: string = lines[lineIdx] ?? '';

  if (/\/\/.*integration boundary:\s*\S+/i.test(currentLine)) {
    return true;
  }

  // Check the line immediately above (comment may be on its own line above the throw)
  if (lineIdx > 0 && /\/\/.*integration boundary:\s*\S+/i.test(lines[lineIdx - 1] ?? '')) {
    return true;
  }

  return false;
}

/**
 * Check if a throw is an allowed integration boundary throw.
 *
 * Allowed when the throw has an `// integration boundary: <reason>` comment
 * on its line or the line immediately above, AND the argument is either:
 * - `.error` property access (e.g., `throw result.error`)
 * - `new Error(...)` constructor
 *
 * @param {AstNode} node - The ThrowStatement node
 * @param {VisitorContext} context - Visitor context
 * @returns {boolean} Whether this throw is exempt
 */
function isIntegrationBoundaryThrow(node: AstNode, context: VisitorContext): boolean {
  const argument = node.argument as AstNode | undefined;

  if (!argument) {
    return false;
  }

  // Check if the argument is `.error` property access (e.g., result.error)
  const isErrorAccess: boolean =
    (argument.type === 'MemberExpression' || argument.type === 'StaticMemberExpression') &&
    ((argument.property as AstNode | undefined)?.name as string) === 'error';

  // Check if the argument is `new Error(...)` constructor
  const isNewError: boolean =
    argument.type === 'NewExpression' &&
    ((argument.callee as AstNode | undefined)?.name as string) === 'Error';

  if (!isErrorAccess && !isNewError) {
    return false;
  }

  return hasIntegrationBoundaryComment(node, context);
}
/** The no-throw lint rule. */
const rule: TypeScriptRule = {
  id: 'typescript/no-throw',
  description: 'Forbids throw statements — use return err() instead',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript', 'safety', 'result'],
  stages: ['lint', 'pre-commit', 'ci'],
  fixable: false,

  visitor: {
    ThrowStatement(node: AstNode, context: VisitorContext): LintResult[] {
      // Allow throw result.error at integration boundaries
      if (isIntegrationBoundaryThrow(node, context)) {
        return [];
      }

      // Allow throw inside v.check() / v.transform() / v.rawCheck() callbacks
      // These are valibot pipeline stages that catch throws as validation failures
      const beforeThrow: string = context.content.slice(Math.max(0, node.start - 500), node.start);
      const lastValibotCallback: number = Math.max(
        beforeThrow.lastIndexOf('v.check('),
        beforeThrow.lastIndexOf('v.transform('),
        beforeThrow.lastIndexOf('v.rawCheck('),
      );

      if (lastValibotCallback !== -1) {
        // Count open/close parens after the v.check( to see if we're still inside
        const afterCallback: string = beforeThrow.slice(lastValibotCallback);
        let depth: number = 0;

        for (const ch of afterCallback) {
          if (ch === '(') {
            depth++;
          }
          if (ch === ')') {
            depth--;
          }
        }

        // If depth > 0, we're still inside the callback — exempt
        if (depth > 0) {
          return [];
        }
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: 'Do not use throw — return err(ERRORS.DOMAIN.CODE, message) instead',
          ruleId: 'typescript/no-throw',
          tip: 'Replace throw with return err() to maintain the Result pattern',
          fix: { range: { start: node.start, end: node.start }, text: '' },
        },
      ];
    },
  },
};

export default rule;
