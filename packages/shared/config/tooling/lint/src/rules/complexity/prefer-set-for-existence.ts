/**
 * Rule: complexity/prefer-set-for-existence
 *
 * Detects .includes() calls inside loop bodies. Array .includes() is O(n)
 * per call, so using it inside a loop creates O(n²) complexity.
 * Suggests converting to a Set for O(1) lookups.
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
 * Check a loop node for .includes() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any .includes() calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];
  const found: AstNode | undefined = findCallInBody(node, 'includes');

  if (found) {
    results.push({
      file: context.file,
      line: found.loc.start.line,
      column: found.loc.start.column + 1,
      severity: 'warning',
      message: '.includes() inside loop is O(n) per iteration — use a Set for O(1) lookups',
      ruleId: 'complexity/prefer-set-for-existence',
      tip: 'Convert the array to a Set before the loop: new Set(array)',
      fix: { range: { start: 0, end: 0 }, text: '' },
    });
  }

  return results;
};

/** The prefer-set-for-existence lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/prefer-set-for-existence',
  description: 'Use Set for existence checks instead of .includes() in loops',
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
