/**
 * Rule: complexity/no-dom-query-in-loop
 *
 * Detects DOM queries inside loop bodies. DOM queries are expensive operations
 * that should be cached outside loops to avoid redundant lookups on each
 * iteration.
 *
 * The auto-fix hoists the DOM query call before the loop when the selector
 * argument is a string literal (loop-invariant). Falls back to no-op when
 * the argument is dynamic (depends on the loop variable).
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
import { findStaticMemberCallInBody } from './_utils.ts';

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
 * Build a fix that hoists a DOM query call before the loop.
 *
 * Only hoists when the first argument is a string literal (loop-invariant).
 * Falls back to NO_FIX for dynamic selectors.
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

  const callText: string = nodeText(callNode, src);
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const callStart: number = callNode.start as number;
  const callEnd: number = callNode.end as number;
  const indent: string = detectIndent(loopStart, src);

  /* Generate a descriptive variable name from the method.
   * Uses if/else chain instead of nested ternary for clarity. */
  let varName: string;

  if (method === 'querySelector' || method === 'getElementById') {
    varName = '_cachedElement';
  } else {
    /* querySelectorAll, getElementsByClassName, getElementsByTagName, etc. */
    varName = '_cachedElements';
  }

  const hoisted: string = `${indent}const ${varName} = ${callText};\n`;

  const beforeCall: string = src.slice(loopStart, callStart);
  const afterCall: string = src.slice(callEnd, loopEnd);

  return {
    range: { start: loopStart, end: loopEnd },
    text: hoisted + beforeCall + varName + afterCall,
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
