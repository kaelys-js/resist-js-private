/**
 * Rule: result/no-ignore-result
 *
 * Detects when a function that returns Result is called but the return
 * value is not captured. Ignoring a Result silently swallows errors.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Function name patterns that likely return Result. */
const RESULT_FUNCTION_PATTERNS: readonly RegExp[] = [
  /^parse/i,
  /^safeParse/i,
  /^validate/i,
  /^create/i,
  /^update/i,
  /^delete/i,
  /^save/i,
  /^fetch/i,
  /^load/i,
  /^submit/i,
  /^process/i,
  /^handle/i,
  /^execute/i,
  /^run/i,
  /^check/i,
  /^verify/i,
];

/** Import source patterns that indicate Result usage in the file. */
const RESULT_IMPORT_PATTERNS: readonly RegExp[] = [
  /@\/schemas\/result/,
  /@\/utils\/result/,
  /from\s+['"].*result['"]/i,
  /Result\s*</,
];

/**
 * Extract the CallExpression from an expression, handling await.
 *
 * @param {AstNode} node - The expression node
 * @returns {AstNode | null} The CallExpression or null
 */
function getCallExpression(node: AstNode): AstNode | null {
  if (node.type === 'CallExpression') {
    return node;
  }

  if (node.type === 'AwaitExpression') {
    const argument = node.argument as AstNode | undefined;
    if (argument?.type === 'CallExpression') {
      return argument;
    }
  }

  return null;
}

/**
 * Get the function name from a CallExpression.
 *
 * @param {AstNode} node - The CallExpression node
 * @returns {string | null} The function name or null
 */
function getFunctionName(node: AstNode): string | null {
  const callee = node.callee as AstNode | undefined;
  if (!callee) {
    return null;
  }

  if (callee.type === 'Identifier') {
    return (callee.name as string) ?? null;
  }

  if (callee.type === 'MemberExpression' || callee.type === 'StaticMemberExpression') {
    const property = callee.property as AstNode | undefined;
    if (property?.type === 'Identifier') {
      return (property.name as string) ?? null;
    }
  }

  return null;
}

/**
 * Check if a call expression is a method on a native collection (Map, Set, Array).
 * Native collection methods like Map.delete(), Set.delete() return boolean, not Result.
 *
 * @param {AstNode} callNode - The CallExpression node
 * @param {VisitorContext} context - The visitor context
 * @returns {boolean} Whether the call is on a native collection
 */
function isNativeCollectionMethod(callNode: AstNode, context: VisitorContext): boolean {
  const callee = callNode.callee as AstNode | undefined;
  if (!callee) {
    return false;
  }
  if (callee.type !== 'MemberExpression' && callee.type !== 'StaticMemberExpression') {
    return false;
  }

  const object = callee.object as AstNode | undefined;
  if (!object || object.type !== 'Identifier') {
    return false;
  }

  const objectName: string = (object.name as string) ?? '';

  // Check if the variable is typed as Map<...>, Set<...>, or Array
  const typePattern: RegExp = new RegExp(
    `(?:const|let)\\s+${objectName}\\s*(?::\\s*(?:Map|Set|WeakMap|WeakSet|ReadonlyMap|ReadonlySet)\\s*<|=\\s*new\\s+(?:Map|Set|WeakMap|WeakSet)\\s*[<(])`,
  );

  return typePattern.test(context.content);
}

/**
 * Check if a function likely returns a Result based on name and file context.
 *
 * @param {string} funcName - The function name
 * @param {VisitorContext} context - The visitor context
 * @returns {boolean} Whether the function likely returns Result
 */
function likelyReturnsResult(funcName: string, context: VisitorContext): boolean {
  // Check function name patterns and file Result usage
  if (
    RESULT_FUNCTION_PATTERNS.some((p: RegExp): boolean => p.test(funcName)) &&
    RESULT_IMPORT_PATTERNS.some((p: RegExp): boolean => p.test(context.content))
  ) {
    return true;
  }

  // Check if the function is defined in this file with Result return type
  const funcDefPattern: RegExp = new RegExp(
    `(?:function\\s+${funcName}|const\\s+${funcName}\\s*=)[^{]*:\\s*(?:Promise\\s*<\\s*)?Result\\s*<`,
    'i',
  );

  if (funcDefPattern.test(context.content)) {
    return true;
  }

  return false;
}
/** The no-ignore-result lint rule. */
const rule: TypeScriptRule = {
  id: 'result/no-ignore-result',
  description: 'Result return values must be captured — do not ignore them',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    ExpressionStatement(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const expression = node.expression as AstNode | undefined;
      if (!expression) {
        return results;
      }

      const callExpr: AstNode | null = getCallExpression(expression);
      if (!callExpr) {
        return results;
      }

      const funcName: string | null = getFunctionName(callExpr);
      if (!funcName) {
        return results;
      }

      if (!likelyReturnsResult(funcName, context)) {
        return results;
      }

      // Skip native collection methods (Map.delete, Set.delete, etc.) — they return boolean, not Result
      if (isNativeCollectionMethod(callExpr, context)) {
        return results;
      }

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Result from ${funcName}() is not handled — errors may be lost`,
        ruleId: 'result/no-ignore-result',
        tip: 'Assign the Result and check .ok, or return it to the caller',
        fix: {
          range: { start: node.start, end: node.start },
          text: 'const result = ',
        },
      });

      return results;
    },
  },
};

export default rule;
