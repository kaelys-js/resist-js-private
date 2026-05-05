/**
 * Rule: complexity/no-await-in-loop
 *
 * Detects await expressions inside loop bodies. Sequential awaits in loops
 * run promises one at a time instead of in parallel, leading to unnecessary
 * latency. Suggests using Promise.all() for concurrent execution.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';
import { findAwaitInBody } from './_utils.ts';

/**
 * Check a loop node for await expressions in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any await expressions found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  const found: AstNode | undefined = findAwaitInBody(node);

  if (found) {
    results.push({
      file: context.file,
      line: found.loc.start.line,
      column: found.loc.start.column + 1,
      severity: 'warning',
      message: 'await inside loop runs sequentially — use Promise.all() for parallel execution',
      ruleId: 'complexity/no-await-in-loop',
      tip: 'Collect promises in an array and await Promise.all(promises)',
      fix: NO_OP_FIX,
    });
  }

  return results;
};

/** The no-await-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-await-in-loop',
  description: 'Avoid await inside loops — use Promise.all() for parallel execution',
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
