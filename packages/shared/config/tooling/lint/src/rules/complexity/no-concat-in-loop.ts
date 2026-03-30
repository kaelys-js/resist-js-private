/**
 * Rule: complexity/no-concat-in-loop
 *
 * Detects string concatenation (+=) or .concat() calls inside loop bodies.
 * String concatenation in loops creates O(n²) complexity because strings are
 * immutable and each concatenation copies the entire string.
 * Suggests collecting parts in an array and joining after the loop.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { findPlusAssignInBody, findCallInBody } from './_utils.ts';

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
      fix: { range: { start: 0, end: 0 }, text: '' },
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
      fix: { range: { start: 0, end: 0 }, text: '' },
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
  fixable: false,

  visitor: {
    ForStatement: checkLoop,
    ForOfStatement: checkLoop,
    WhileStatement: checkLoop,
  },
};

export default rule;
