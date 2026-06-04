/**
 * Rule: complexity/no-dom-query-in-loop
 *
 * Detects DOM queries inside loop bodies. DOM queries are expensive operations
 * that should be cached outside loops to avoid redundant lookups on each
 * iteration.
 *
 * The auto-fix hoists the DOM query call before the loop ONLY when the loop has
 * exactly one DOM query, the selector argument is a string literal, and the call
 * is a direct statement of the loop body. Falls back to no-op for dynamic
 * selectors, multiple queries, or calls nested in conditionals / inner scopes.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type LintFix,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';
import { findStaticMemberCallInBody, walkBody } from './_utils.ts';

/** No-op fix sentinel. */
const NO_FIX: LintFix = NO_OP_FIX;

/** DOM query methods to check for. */
const DOM_METHODS: readonly string[] = [
  'querySelector',
  'querySelectorAll',
  'getElementById',
  'getElementsByClassName',
  'getElementsByTagName',
];

/**
 * Extract source text for an AST node.
 *
 * @param {AstNode} astNode - Node with start/end byte offsets
 * @param {string} source - Full source text
 * @returns {string} The node's source text
 */
function nodeText(astNode: AstNode, source: string): string {
  return source.slice(astNode.start as number, astNode.end as number);
}

/**
 * Detect indentation at a byte offset.
 *
 * @param {number} offset - Byte offset
 * @param {string} source - Full source text
 * @returns {string} Whitespace prefix of the line
 */
function detectIndent(offset: number, source: string): string {
  let lineStart: number = offset;

  while (lineStart > 0 && source[lineStart - 1] !== '\n') {
    lineStart--;
  }

  let end: number = lineStart;

  while (end < source.length && (source[end] === ' ' || source[end] === '\t')) {
    end++;
  }

  return source.slice(lineStart, end);
}

/**
 * Count every `document.<method>(...)` DOM-query call inside a subtree.
 *
 * @param {AstNode} node - Root node of the subtree
 * @returns {number} Total number of DOM-query calls
 */
function countDomQueries(node: AstNode): number {
  let count: number = 0;

  walkBody(node, (child: AstNode): void => {
    if (child.type !== 'CallExpression') {
      return;
    }

    const callee: AstNode | undefined = child.callee as AstNode | undefined;

    if (
      !callee ||
      (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression')
    ) {
      return;
    }

    const obj: AstNode | undefined = callee.object as AstNode | undefined;
    const prop: AstNode | undefined = callee.property as AstNode | undefined;

    if (
      obj?.type === 'Identifier' &&
      (obj.name as string) === 'document' &&
      prop &&
      DOM_METHODS.includes(prop.name as string)
    ) {
      count++;
    }
  });

  return count;
}

/**
 * Whether `callNode` is a direct statement of the loop body — either a bare
 * `document.query(...)` expression statement or the initializer of a
 * `const el = document.query(...)` declarator. This excludes calls nested in a
 * conditional, a nested loop, or a nested function, where a flat hoist would be
 * unsafe.
 *
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {AstNode} callNode - The DOM-query CallExpression
 * @returns {boolean} True if the call is a direct loop-body statement
 */
function isDirectLoopBodyCall(loopNode: AstNode, callNode: AstNode): boolean {
  const body: AstNode | undefined = loopNode.body as AstNode | undefined;

  if (!body) {
    return false;
  }

  const statements: AstNode[] =
    body.type === 'BlockStatement' ? ((body.body ?? []) as AstNode[]) : [body];

  const callStart: number = callNode.start as number;
  const callEnd: number = callNode.end as number;

  const sameSpan = (n: AstNode | undefined): boolean =>
    Boolean(n && (n.start as number) === callStart && (n.end as number) === callEnd);

  for (const stmt of statements) {
    if (stmt.type === 'ExpressionStatement' && sameSpan(stmt.expression as AstNode | undefined)) {
      return true;
    }

    if (stmt.type === 'VariableDeclaration') {
      const decls: AstNode[] = (stmt.declarations ?? []) as AstNode[];

      for (const d of decls) {
        if (sameSpan(d.init as AstNode | undefined)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Build a fix that hoists a DOM query call before the loop.
 *
 * Only fires when the loop contains exactly ONE DOM query, the selector is a
 * string literal (loop-invariant), and the call is a direct statement of the
 * loop body. The hoist var name is derived from the call's start offset so it
 * is unique within the file. Encoded as a single range `[loopStart, callEnd]`.
 *
 * @param {string} method - The DOM method name (e.g. 'querySelector')
 * @param {AstNode} callNode - The CallExpression node
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildDomQueryFix(
  method: string,
  callNode: AstNode,
  loopNode: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;
  const args: AstNode[] = (callNode.arguments ?? []) as AstNode[];
  const [firstArg] = args;

  /* Only hoist when the selector is a literal string (loop-invariant) */
  if (!firstArg || (firstArg.type !== 'StringLiteral' && firstArg.type !== 'Literal')) {
    return NO_FIX;
  }

  /* Only one DOM query in the loop — multiple would need multiple hoists and
   * this single-range fix can only express one. */
  if (countDomQueries(loopNode) !== 1) {
    return NO_FIX;
  }

  /* The call must be a direct loop-body statement, not nested in a conditional /
   * nested loop / nested function. */
  if (!isDirectLoopBodyCall(loopNode, callNode)) {
    return NO_FIX;
  }

  const callText: string = nodeText(callNode, src);
  const loopStart: number = loopNode.start as number;
  const callStart: number = callNode.start as number;
  const callEnd: number = callNode.end as number;
  const indent: string = detectIndent(loopStart, src);

  /* Derive a unique name from the call's start offset to avoid collisions when
   * multiple loops in the same file are fixed. */
  const prefix: string =
    method === 'querySelector' || method === 'getElementById'
      ? '_cachedElement'
      : '_cachedElements';
  const varName: string = `${prefix}${callStart}`;

  /* Single range [loopStart, callEnd]: hoist decl, then the loop text up to the
   * call, then the var name. Everything after the call (rest of body + `}`) is
   * outside the range and preserved verbatim. */
  const hoisted: string = `${indent}const ${varName} = ${callText};\n`;
  const beforeCall: string = src.slice(loopStart, callStart);

  return {
    range: { start: loopStart, end: callEnd },
    text: hoisted + beforeCall + varName,
  };
}

/**
 * Check a loop node for DOM query calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any DOM query patterns found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  for (const method of DOM_METHODS) {
    const found: AstNode | undefined = findStaticMemberCallInBody(node, 'document', method);

    if (found) {
      results.push({
        file: context.file,
        line: found.loc.start.line,
        column: found.loc.start.column + 1,
        severity: 'warning',
        message: 'DOM query inside loop — cache the result outside the loop',
        ruleId: 'complexity/no-dom-query-in-loop',
        tip: 'Move document.querySelector() before the loop and reuse the reference',
        fix: buildDomQueryFix(method, found, node, context),
      });
    }
  }

  return results;
};

/** The no-dom-query-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-dom-query-in-loop',
  description: 'Cache DOM queries outside loops',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    ForStatement: checkLoop,
    ForOfStatement: checkLoop,
    WhileStatement: checkLoop,
  },
};

export default rule;
