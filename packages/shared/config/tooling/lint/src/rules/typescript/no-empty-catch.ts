/**
 * Rule: typescript/no-empty-catch
 *
 * Catch blocks must:
 * 1. Not be empty (must contain statements or an explanatory comment)
 * 2. Use `fromUnknownError()` to convert the caught value to AppError
 * 3. Return via `err()` or `return err()` / `return ok()` to propagate errors
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/**
 * Check if a catch clause body contains a comment.
 *
 * @param {AstNode} catchBody - The catch block body node
 * @param {string} content - File source text
 * @returns {boolean} Whether the catch body contains a comment
 */
function hasComment(catchBody: AstNode, content: string): boolean {
  const bodyText: string = content.slice(catchBody.start, catchBody.end);
  // Check for block comments /* ... */ or line comments //
  return /\/\*[\s\S]*?\*\//.test(bodyText) || /\/\//.test(bodyText);
}

/**
 * Check if the catch body uses fromUnknownError() to convert the error.
 *
 * @param {string} bodyText - The catch block body text
 * @returns {boolean} Whether fromUnknownError is called
 */
function hasFromUnknownError(bodyText: string): boolean {
  return /fromUnknownError\s*\(/.test(bodyText);
}

/**
 * Check if the catch body returns via err()/ok() pattern.
 *
 * @param {string} bodyText - The catch block body text
 * @returns {boolean} Whether err/ok return pattern is used
 */
function hasErrReturn(bodyText: string): boolean {
  return (
    /return\s+err\s*\(/.test(bodyText) ||
    /return\s+ok\s*\(/.test(bodyText) ||
    /return\s+okUnchecked\s*[<(]/.test(bodyText)
  );
}

const rule: TypeScriptRule = {
  id: 'typescript/no-empty-catch',
  description: 'Catch blocks must use fromUnknownError() + err() pattern',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    CatchClause(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const body = node.body as AstNode | undefined;
      if (!body) return results;

      // Check if body has statements
      const stmts = body.body as AstNode[] | undefined;
      const isEmpty: boolean = !stmts || stmts.length === 0;
      const bodyText: string = context.content.slice(body.start, body.end);

      if (isEmpty && !hasComment(body, context.content)) {
        // Insert a placeholder comment inside the empty catch block
        const insertPos: number = body.start + 1; // After opening {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: 'Empty catch block without explanatory comment',
          ruleId: 'typescript/no-empty-catch',
          tip: 'Add a comment explaining why this error is safe to ignore',
          fix: {
            range: { start: insertPos, end: insertPos },
            text: '\n    /* TODO: explain why this error is safe to ignore */\n  ',
          },
        });
        return results;
      }

      // Non-empty catch: check for fromUnknownError() + err() pattern
      if (!isEmpty) {
        if (!hasComment(body, context.content)) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: 'Catch block should have a comment explaining error handling',
            ruleId: 'typescript/no-empty-catch',
            tip: 'Add an inline comment explaining the error handling strategy',
            fix: {
              range: { start: body.start + 1, end: body.start + 1 },
              text: '\n    /* Error handling: <explain> */\n',
            },
          });
        }

        // Check for fromUnknownError() usage
        if (!hasFromUnknownError(bodyText)) {
          const paramName: string = ((node.param as AstNode | undefined)?.name as string) ?? 'e';
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: 'Catch block should use fromUnknownError() to convert error',
            ruleId: 'typescript/no-empty-catch',
            tip: `Use: const appError = fromUnknownError(${paramName})`,
            fix: {
              range: { start: body.start + 1, end: body.start + 1 },
              text: `\n    const appError = fromUnknownError(${paramName});\n`,
            },
          });
        }

        // Check for err() return pattern
        if (!hasErrReturn(bodyText)) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: 'Catch block should return err() to propagate errors via Result',
            ruleId: 'typescript/no-empty-catch',
            tip: 'Use: return err(ERRORS.DOMAIN.CODE, { cause: fromUnknownError(e) })',
            fix: {
              range: { start: body.end - 1, end: body.end - 1 },
              text: '  return err(ERRORS.DOMAIN.CODE, { cause: appError });\n',
            },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
