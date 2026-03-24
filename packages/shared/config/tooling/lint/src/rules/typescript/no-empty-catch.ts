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

/** File paths exempt from this rule (test infrastructure, test files). */
const EXEMPT_PATHS: readonly RegExp[] = [/config\/test\//, /\.test\.ts$/, /\.spec\.ts$/];

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

      if (EXEMPT_PATHS.some((p: RegExp): boolean => p.test(context.file))) {
        return results;
      }

      // Exempt catch blocks inside v.check/v.transform/v.rawCheck callbacks
      const beforeCatch: string = context.content.slice(Math.max(0, node.start - 500), node.start);
      const lastCallback: number = Math.max(
        beforeCatch.lastIndexOf('v.check('),
        beforeCatch.lastIndexOf('v.transform('),
        beforeCatch.lastIndexOf('v.rawCheck('),
      );

      if (lastCallback !== -1) {
        const afterCallback: string = beforeCatch.slice(lastCallback);
        let depth: number = 0;

        for (const ch of afterCallback) {
          if (ch === '(') depth++;
          if (ch === ')') depth--;
        }

        if (depth > 0) return results; // inside callback — exempt
      }

      const body = node.body as AstNode | undefined;
      if (!body) {
        return results;
      }

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

        // Check for err() return pattern — only in functions returning Result
        // Functions returning Promise<Response> or other non-Result types can't use err()
        const beforeFunc: string = context.content.slice(Math.max(0, node.start - 3000), node.start);
        const isResultFunc: boolean = /\):\s*(?:Promise<\s*)?Result\b/.test(beforeFunc);

        if (isResultFunc && !hasErrReturn(bodyText)) {
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

        // Check that fromUnknownError result is passed as cause in err() meta (Result functions only)
        if (isResultFunc && hasFromUnknownError(bodyText) && hasErrReturn(bodyText)) {
          if (!/err\s*\([^)]*cause/.test(bodyText) && !/\{\s*cause/.test(bodyText)) {
            results.push({
              file: context.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'error',
              message: 'err() in catch block should include { cause: fromUnknownError(error) } in meta',
              ruleId: 'typescript/no-empty-catch',
              tip: 'Pass the converted error as cause: err(ERRORS.X.Y, { cause: appError })',
            });
          }
        }

        // Check that err() uses a specific error code, not generic INTERNAL.UNEXPECTED (Result functions only)
        if (isResultFunc && /err\s*\(\s*ERRORS\.INTERNAL\.UNEXPECTED/.test(bodyText)) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: 'Use a specific error code in catch block, not ERRORS.INTERNAL.UNEXPECTED',
            ruleId: 'typescript/no-empty-catch',
            tip: 'Use a domain-specific code: ERRORS.IO.READ_FAILED, ERRORS.NETWORK.PORT_UNAVAILABLE, etc.',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
