/**
 * Rule: result/require-ok-return
 *
 * Functions returning `Result<T>` must use `ok()`, `okUnchecked()`, or `err()`
 * in all return statements. Additionally:
 * - Error paths (catch blocks, after !result.ok) must use `err()`, not `ok()`
 * - If a matching schema exists (e.g. `UserSchema` for `Result<User>`),
 *   prefer `ok(schema, data)` over `okUnchecked(data)`
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Allowed Result constructor patterns in return expressions. */
const OK_RETURN_PATTERNS: readonly RegExp[] = [/^ok\s*\(/, /^okUnchecked\s*[<(]/, /^err\s*\(/];

/**
 * Check if a return expression uses ok/okUnchecked/err or returns a variable.
 *
 * @param {string} returnText - The return expression source text
 * @returns {boolean} Whether the return is valid
 */
function isValidResultReturn(returnText: string): boolean {
  const trimmed: string = returnText.trim();

  // ok(), okUnchecked(), err() calls
  if (OK_RETURN_PATTERNS.some((p: RegExp): boolean => p.test(trimmed))) {
    return true;
  }

  // Returning a variable (identifier) — presumed to already be a Result
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return true;
  }

  // Returning a property access like result.data or obj.result — presumed Result
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed)) {
    return true;
  }

  // Returning a function call result (e.g., safeParse(...), someHelper(...))
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/.test(trimmed)) {
    return true;
  }

  // Returning an await expression
  if (/^await\s+/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Check if a return statement is inside a catch block.
 *
 * @param {AstNode} ret - The return statement node
 * @param {AstNode} funcBody - The function body node
 * @param {VisitorContext} context - The visitor context
 * @returns {boolean} Whether the return is inside a catch block
 */
function isInsideCatch(ret: AstNode, funcBody: AstNode, context: VisitorContext): boolean {
  // Get the text between function body start and the return statement
  const textBefore: string = context.content.slice(funcBody.start, ret.start);

  // Count unmatched catch blocks — simplified heuristic
  const catchCloseCount: number = (textBefore.match(/catch\s*\([^)]*\)\s*\{/g) ?? []).length;

  if (catchCloseCount === 0) {
    return false;
  }

  // Check if the return is within the last catch block's braces
  const lastCatchIndex: number = textBefore.lastIndexOf('catch');
  if (lastCatchIndex === -1) {
    return false;
  }

  const afterCatch: string = textBefore.slice(lastCatchIndex);
  const openBraces: number = (afterCatch.match(/\{/g) ?? []).length;
  const closeBraces: number = (afterCatch.match(/\}/g) ?? []).length;

  // If more opens than closes, we're still inside the catch block
  return openBraces > closeBraces;
}

/**
 * Check if a return statement is after an error guard (e.g. if (!result.ok) return ...).
 *
 * @param {AstNode} ret - The return statement node
 * @param {AstNode} funcBody - The function body node
 * @param {VisitorContext} context - The visitor context
 * @returns {boolean} Whether the return is in an error guard path
 */
function isAfterErrorGuard(ret: AstNode, funcBody: AstNode, context: VisitorContext): boolean {
  const textBefore: string = context.content.slice(funcBody.start, ret.start);

  // Check if the nearest if-statement before this return checks !result.ok
  const lastIfIndex: number = textBefore.lastIndexOf('if');
  if (lastIfIndex === -1) {
    return false;
  }

  const afterIf: string = textBefore.slice(lastIfIndex);
  const isErrorGuard: boolean = /if\s*\(\s*![\w]+\.ok\s*\)/.test(afterIf);
  if (!isErrorGuard) {
    return false;
  }

  // If the guard body contains return/throw, it's an early-return guard.
  // Code AFTER an early-return guard is the SUCCESS path, not error path.
  const guardBody: string = afterIf.slice(0, afterIf.indexOf(';') + 1);
  if (/\breturn\b/.test(guardBody) || /\bthrow\b/.test(guardBody)) {
    return false;
  }

  return true;
}

/**
 * Extract the Result type parameter from a return type annotation.
 * e.g. "Result<User>" → "User", "Promise<Result<Config>>" → "Config"
 *
 * @param {AstNode} node - The function node
 * @param {VisitorContext} context - The visitor context
 * @returns {string | null} The type parameter name or null
 */
function extractResultTypeParam(node: AstNode, context: VisitorContext): string | null {
  const returnType = node.returnType as AstNode | undefined;
  if (!returnType) {
    return null;
  }

  const typeAnnotation = returnType.typeAnnotation as AstNode | undefined;
  if (!typeAnnotation) {
    return null;
  }

  const typeText: string = context.content.slice(typeAnnotation.start, typeAnnotation.end);

  // Match Result<TypeName> or Promise<Result<TypeName>>
  const match: RegExpExecArray | null =
    /Result<(\w+)>/.exec(typeText) ?? /Promise<Result<(\w+)>>/.exec(typeText);

  if (!match) {
    return null;
  }

  const typeName: string = match[1] ?? '';

  // Skip void — no schema needed
  if (typeName === 'void') {
    return null;
  }

  return typeName;
}

/**
 * Check if a schema variable exists in the file for the given type name.
 * Looks for TypeNameSchema in imports and variable declarations.
 *
 * @param {string} typeName - The type name (e.g. "User")
 * @param {VisitorContext} context - The visitor context
 * @returns {boolean} Whether a matching schema was found
 */
function hasMatchingSchema(typeName: string, context: VisitorContext): boolean {
  const schemaName: string = `${typeName}Schema`;

  // Check imports
  for (const imp of context.imports) {
    for (const spec of imp.specifiers) {
      if (spec.local === schemaName || spec.imported === schemaName) {
        return true;
      }
    }
  }

  // Check if declared in file as const/let/var
  const declPattern: RegExp = new RegExp(`(?:const|let|var)\\s+${schemaName}\\s*=`);
  if (declPattern.test(context.content)) {
    return true;
  }

  return false;
}

/**
 * Check if a function has a Result return type.
 *
 * @param {AstNode} node - The function node
 * @param {VisitorContext} context - The visitor context
 * @returns {boolean} Whether the function returns Result<T>
 */
function hasResultReturnType(node: AstNode, context: VisitorContext): boolean {
  const returnType = node.returnType as AstNode | undefined;
  if (!returnType) {
    return false;
  }

  const typeAnnotation = returnType.typeAnnotation as AstNode | undefined;
  if (!typeAnnotation) {
    return false;
  }

  const typeText: string = context.content.slice(typeAnnotation.start, typeAnnotation.end);
  return (
    typeText.startsWith('Result<') ||
    typeText.startsWith('Promise<Result<') ||
    typeText.startsWith('Result') ||
    typeText.startsWith('Promise<Result>')
  );
}

/**
 * Collect all ReturnStatement nodes within a function body (non-recursive into nested functions).
 *
 * @param {AstNode} body - The function body node
 * @returns {AstNode[]} Array of return statement nodes
 */
function collectReturnStatements(body: AstNode): AstNode[] {
  const returns: AstNode[] = [];

  /**
   * Walk nodes collecting returns, stopping at nested function boundaries.
   *
   * @param {AstNode} node - The current node
   */
  function walk(node: AstNode): void {
    if (node.type === 'ReturnStatement') {
      returns.push(node);
      return;
    }

    // Don't descend into nested functions
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      return;
    }

    // Walk children
    for (const key of Object.keys(node)) {
      const value = node[key] as unknown;
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              walk(item as AstNode);
            }
          }
        } else if ('type' in (value as Record<string, unknown>)) {
          walk(value as AstNode);
        }
      }
    }
  }

  const stmts = body.body as AstNode[] | undefined;
  if (stmts) {
    for (const stmt of stmts) {
      walk(stmt);
    }
  }

  return returns;
}

/**
 * Check a function's return statements for proper Result constructors.
 *
 * @param {AstNode} node - The function node
 * @param {VisitorContext} context - The visitor context
 * @param {string} [funcName] - Optional function name
 * @returns {LintResult[]} Any lint violations
 */
function checkFunction(
  node: AstNode,
  context: VisitorContext,
  funcName: string | undefined,
): LintResult[] {
  const results: LintResult[] = [];

  if (!hasResultReturnType(node, context)) {
    return results;
  }

  const body = node.body as AstNode | undefined;
  if (!body) {
    return results;
  }

  const name: string = funcName ?? ((node.id as AstNode)?.name as string) ?? 'anonymous';
  const returnStmts: AstNode[] = collectReturnStatements(body);
  const typeName: string | null = extractResultTypeParam(node, context);
  const schemaAvailable: boolean = typeName !== null && hasMatchingSchema(typeName, context);

  for (const ret of returnStmts) {
    const argument = ret.argument as AstNode | undefined;
    if (!argument) {
      continue;
    } // bare `return;` — might be in void branch

    const returnText: string = context.content.slice(argument.start, argument.end);
    const trimmedReturn: string = returnText.trim();

    // Check 1: Raw value return (not ok/okUnchecked/err/variable/call)
    if (!isValidResultReturn(returnText)) {
      results.push({
        file: context.file,
        line: ret.loc.start.line,
        column: ret.loc.start.column + 1,
        severity: 'error',
        message: `Function '${name}' returns raw value instead of ok()/err()`,
        ruleId: 'result/require-ok-return',
        tip: 'Wrap return value with ok(Schema, data) or err(ERRORS.DOMAIN.CODE)',
        fix: {
          range: { start: argument.start, end: argument.end },
          text: `ok(Schema, ${returnText})`,
        },
      });
      continue;
    }

    // Check 2: ok()/okUnchecked() in error paths (should be err())
    const inCatch: boolean = isInsideCatch(ret, body, context);
    const inErrorGuard: boolean = isAfterErrorGuard(ret, body, context);

    if (
      (inCatch || inErrorGuard) &&
      (trimmedReturn.startsWith('ok') || trimmedReturn.startsWith('okUnchecked'))
    ) {
      results.push({
        file: context.file,
        line: ret.loc.start.line,
        column: ret.loc.start.column + 1,
        severity: 'error',
        message: `Function '${name}' uses ok() in error path — use err() instead`,
        ruleId: 'result/require-ok-return',
        tip: 'Error paths should return err(ERRORS.DOMAIN.CODE, { cause: ... })',
        fix: {
          range: { start: argument.start, end: argument.end },
          text: `err(ERRORS.DOMAIN.CODE)`,
        },
      });
      continue;
    }

    // Check 3: safeParse() in return position — should use ok() instead
    // safeParse is for untrusted input; ok() is for wrapping known-valid data in a Result
    if (trimmedReturn.startsWith('safeParse')) {
      results.push({
        file: context.file,
        line: ret.loc.start.line,
        column: ret.loc.start.column + 1,
        severity: 'error',
        message: `Function '${name}' returns safeParse() — use ok() instead for already-typed values`,
        ruleId: 'result/require-ok-return',
        tip: 'safeParse() is for untrusted input. Use ok(schema, data) to wrap known-valid data in a Result',
        fix: {
          range: { start: argument.start, end: argument.end },
          text: trimmedReturn.replace(/^safeParse\s*\(/, 'ok('),
        },
      });
      continue;
    }

    // Check 4: okUnchecked() when a matching schema exists (should use ok(schema, data))
    if (schemaAvailable && trimmedReturn.startsWith('okUnchecked')) {
      const schemaName: string = `${typeName}Schema`;
      results.push({
        file: context.file,
        line: ret.loc.start.line,
        column: ret.loc.start.column + 1,
        severity: 'error',
        message: `Function '${name}' uses okUnchecked() but ${schemaName} is available — use ok(${schemaName}, data)`,
        ruleId: 'result/require-ok-return',
        tip: `Use ok(${schemaName}, data) for validated returns`,
        fix: {
          range: { start: argument.start, end: argument.end },
          text: trimmedReturn.replace(/^okUnchecked\s*(<[^>]*>)?\s*\(/, `ok(${schemaName}, `),
        },
      });
    }
  }

  return results;
}
/** The require-ok-return lint rule. */
const rule: TypeScriptRule = {
  id: 'result/require-ok-return',
  description: 'Functions returning Result<T> must use ok()/okUnchecked()/err() in returns',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const declaration = node.declaration as AstNode | undefined;
      if (!declaration) {
        return results;
      }

      if (declaration.type === 'FunctionDeclaration') {
        results.push(...checkFunction(declaration, context, undefined));
      }

      if (declaration.type === 'VariableDeclaration') {
        const declarations = declaration.declarations as AstNode[] | undefined;
        if (!declarations) {
          return results;
        }

        for (const decl of declarations) {
          const init = decl.init as AstNode | undefined;
          if (
            init &&
            (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
          ) {
            const funcName: string = ((decl.id as AstNode)?.name as string) ?? '';
            results.push(...checkFunction(init, context, funcName));
          }
        }
      }

      return results;
    },

    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      // Skip exported functions — already handled by ExportNamedDeclaration
      const before: string = context.content.slice(Math.max(0, node.start - 20), node.start);
      if (/export\s+(default\s+)?$/.test(before)) {
        return [];
      }

      return checkFunction(node, context, undefined);
    },
  },
};

export default rule;
