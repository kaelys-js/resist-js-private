/**
 * Rule: complexity/no-sort-in-loop
 *
 * Detects .sort() calls inside loop bodies. Sorting inside a loop creates
 * O(n² log n) complexity since each iteration sorts the array again.
 * The sort should be performed once before or after the loop.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { findCallInBody } from './_utils.ts';

/**
 * Check a loop node for .sort() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any sort calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  const found: AstNode | undefined = findCallInBody(node, 'sort');
  if (found) {
    results.push({
      file: context.file,
      line: found.loc.start.line,
      column: found.loc.start.column + 1,
      severity: 'warning',
      message: '.sort() inside loop creates O(n² log n) complexity',
      ruleId: 'complexity/no-sort-in-loop',
      tip: 'Sort the array once before or after the loop',
      fix: { range: { start: 0, end: 0 }, text: '' },
    });
  }

  return results;
};

/** The no-sort-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-sort-in-loop',
  description: 'Avoid .sort() inside loops — O(n² log n) complexity',
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
