/**
 * Rule: complexity/no-index-of-in-loop
 *
 * Detects .indexOf() calls inside loop bodies. Array .indexOf() is O(n)
 * per call, so using it inside a loop creates O(n²) complexity.
 * Suggests using a Map or Set for O(1) lookups.
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
 * Check a loop node for .indexOf() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any .indexOf() calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];
  const found: AstNode | undefined = findCallInBody(node, 'indexOf');

  if (found) {
    results.push({
      file: context.file,
      line: found.loc.start.line,
      column: found.loc.start.column + 1,
      severity: 'warning',
      message: '.indexOf() inside loop creates O(n²) complexity',
      ruleId: 'complexity/no-index-of-in-loop',
      tip: 'Use a Set or Map for O(1) lookups instead of .indexOf()',
      fix: { range: { start: 0, end: 0 }, text: '' },
    });
  }

  return results;
};

/** The no-index-of-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-index-of-in-loop',
  description: 'Avoid .indexOf() inside loops — use Map or Set instead',
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
