/**
 * Rule: typescript/require-return-type
 *
 * Every function declaration and arrow function expression must have
 * an explicit return type annotation.
 *
 * @module
 */

import {
  createFixableResult,
  createResult,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Get the insert position for a return type annotation: the byte offset just
 * after the params' closing paren. Returns -1 when no closing paren is found
 * before the function body begins.
 *
 * @param funcNode - Function AST node
 * @param content - File source text
 * @returns Byte offset to insert the return type, or -1
 */
function getReturnTypeInsertPos(funcNode: AstNode, content: string): number {
  const params = funcNode.params as AstNode[] | undefined;

  if (!params) {
    return -1;
  }

  const lastParam: AstNode | undefined = params.at(-1);
  const searchStart: number = lastParam ? lastParam.end : funcNode.start;
  const body = funcNode.body as AstNode | undefined;
  const bodyStart: number = typeof body?.start === 'number' ? body.start : content.length;
  const parenIdx: number = content.indexOf(')', searchStart);

  // The `)` must exist AND precede the body opener — otherwise indexOf found a
  // paren inside the body (e.g. a paren-less arrow's call expression).
  if (parenIdx === -1 || parenIdx >= bodyStart) {
    return -1;
  }

  return parenIdx + 1;
}

/**
 * Whether the body subtree contains a `return` or `throw` at this function's
 * own scope (does NOT descend into nested function scopes).
 *
 * @param node - The node to scan (typically the body BlockStatement)
 * @returns Whether a return/throw exists in this scope
 */
function bodyHasReturnOrThrow(node: AstNode): boolean {
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') {
      continue;
    }

    const val = node[key];
    const children: unknown[] = Array.isArray(val) ? val : [val];

    for (const child of children) {
      if (!child || typeof child !== 'object' || !('type' in child)) {
        continue;
      }

      const childNode = child as AstNode;
      const childType: string = childNode.type;

      if (childType === 'ReturnStatement' || childType === 'ThrowStatement') {
        return true;
      }
      // Do not descend into nested function scopes — their return/throw is theirs.
      if (
        childType === 'FunctionDeclaration' ||
        childType === 'FunctionExpression' ||
        childType === 'ArrowFunctionExpression'
      ) {
        continue;
      }
      if (bodyHasReturnOrThrow(childNode)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Whether an arrow has a single un-parenthesized identifier param (e.g. `x => …`).
 * A return type there needs added parens — a two-point edit a single zero-width
 * insert cannot express — so such arrows must NO_OP.
 *
 * @param node - The ArrowFunctionExpression node
 * @param content - File source text
 * @returns Whether the arrow is the paren-less single-param form
 */
function isParenlessArrow(node: AstNode, content: string): boolean {
  const params = node.params as AstNode[] | undefined;

  if (!params || params.length !== 1) {
    return false;
  }

  const [first] = params;

  if (!first || first.type !== 'Identifier') {
    return false;
  }

  return content[first.start - 1] !== '(';
}

/**
 * Build the lint result for a function/arrow missing a return type: a real
 * `: void` / `: Promise<void>` fix when the body is provably void, else NO_OP.
 *
 * @param node - The function/arrow node (already known to lack a return type)
 * @param context - Visitor context
 * @param message - Diagnostic message
 * @param tip - Fix tip
 * @returns The lint result
 */
function buildResult(
  node: AstNode,
  context: VisitorContext,
  message: string,
  tip: string,
): LintResult {
  const ruleId = 'typescript/require-return-type';
  const { line, column: rawColumn } = node.loc.start;
  const column: number = rawColumn + 1;
  const body = node.body as AstNode | undefined;

  const isInferableVoid: boolean =
    !node.declare &&
    !node.generator &&
    body?.type === 'BlockStatement' &&
    !(node.type === 'ArrowFunctionExpression' && isParenlessArrow(node, context.content)) &&
    !bodyHasReturnOrThrow(body);

  if (isInferableVoid) {
    const insertPos: number = getReturnTypeInsertPos(node, context.content);

    if (insertPos >= 0 && context.content[insertPos - 1] === ')') {
      const text: string = node.async ? ': Promise<void>' : ': void';

      return createFixableResult(ruleId, context.file, line, column, 'error', message, {
        fix: { range: { start: insertPos, end: insertPos }, text },
        tip,
      });
    }
  }

  return createResult(ruleId, context.file, line, column, 'error', message, { tip });
}
/** The require-return-type lint rule. */
const rule: TypeScriptRule = {
  id: 'typescript/require-return-type',
  description: 'Every function must have an explicit return type annotation',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      if (node.returnType) {
        return [];
      }

      const funcName: string = ((node.id as AstNode | undefined)?.name as string) ?? '<anonymous>';

      return [
        buildResult(
          node,
          context,
          `Function '${funcName}' is missing a return type annotation`,
          'Add an explicit return type: function name(): ReturnType { ... }',
        ),
      ];
    },

    ArrowFunctionExpression(node: AstNode, context: VisitorContext): LintResult[] {
      if (node.returnType) {
        return [];
      }

      return [
        buildResult(
          node,
          context,
          'Arrow function is missing a return type annotation',
          'Add an explicit return type: (args): ReturnType => { ... }',
        ),
      ];
    },
  },
};

export default rule;
