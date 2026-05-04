/**
 * Rule: complexity/no-concat-in-loop
 *
 * Detects string concatenation (+=) or .concat() calls inside loop bodies.
 * String concatenation in loops creates O(n²) complexity because strings are
 * immutable and each concatenation copies the entire string.
 * Suggests collecting parts in an array and joining after the loop.
 *
 * The auto-fix replaces `acc += expr` with `_parts.push(expr)` inside the loop
 * and adds `const acc = _parts.join('')` after the loop. Only handles simple
 * `+=` assignments where the left-hand side is a plain identifier.
 * Falls back to no-op for `.concat()` calls and complex expressions.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  LintFix,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { findPlusAssignInBody, findCallInBody } from './_utils.ts';

/** No-op fix sentinel. */
const NO_FIX: LintFix = { range: { start: 0, end: 0 }, text: '' };

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
 * Build a fix for += string concatenation inside a loop.
 *
 * Replaces `acc += expr` with `_parts.push(expr)` and wraps the loop
 * with `const _parts: string[] = [];` before and `const acc = _parts.join('');`
 * after.
 *
 * Only handles simple `+=` where the LHS is a plain Identifier.
 *
 * @param {AstNode} assignNode - The AssignmentExpression node
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildPlusAssignFix(
  assignNode: AstNode,
  loopNode: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;

  /* LHS must be a plain identifier (e.g. `result += ...`) */
  const left: AstNode | undefined = assignNode.left as AstNode | undefined;

  if (!left || left.type !== 'Identifier') {
    return NO_FIX;
  }

  const accName: string = left.name as string;

  /* RHS is the expression being concatenated */
  const right: AstNode | undefined = assignNode.right as AstNode | undefined;

  if (!right) {
    return NO_FIX;
  }

  const rhsText: string = nodeText(right, src);

  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const assignStart: number = assignNode.start as number;
  const assignEnd: number = assignNode.end as number;
  const indent: string = detectIndent(loopStart, src);

  const partsVar: string = '_parts';
  const hoisted: string = `${indent}const ${partsVar}: string[] = [];\n`;
  const joined: string = `\n${indent}const ${accName} = ${partsVar}.join('');`;

  /* Replace the += assignment with a push call */
  const pushCall: string = `${partsVar}.push(${rhsText})`;

  const beforeAssign: string = src.slice(loopStart, assignStart);
  const afterAssign: string = src.slice(assignEnd, loopEnd);

  return {
    range: { start: loopStart, end: loopEnd },
    text: hoisted + beforeAssign + pushCall + afterAssign + joined,
  };
}

/**
 * Check a loop node for string concatenation patterns in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any concatenation patterns found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  const plusAssign: AstNode | undefined = findPlusAssignInBody(node);

  if (plusAssign) {
    results.push({
      file: context.file,
      line: plusAssign.loc.start.line,
      column: plusAssign.loc.start.column + 1,
      severity: 'warning',
      message:
        'String concatenation inside loop creates O(n²) complexity — use array.join() or template literals',
      ruleId: 'complexity/no-concat-in-loop',
      tip: 'Collect parts in an array and call .join() after the loop',
      fix: buildPlusAssignFix(plusAssign, node, context),
    });
  }

  const concatCall: AstNode | undefined = findCallInBody(node, 'concat');

  if (concatCall) {
    results.push({
      file: context.file,
      line: concatCall.loc.start.line,
      column: concatCall.loc.start.column + 1,
      severity: 'warning',
      message:
        'String concatenation inside loop creates O(n²) complexity — use array.join() or template literals',
      ruleId: 'complexity/no-concat-in-loop',
      tip: 'Collect parts in an array and call .join() after the loop',
      fix: NO_FIX,
    });
  }

  return results;
};

/** The no-concat-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-concat-in-loop',
  description: 'Avoid string concatenation (+=) or .concat() inside loops',
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
