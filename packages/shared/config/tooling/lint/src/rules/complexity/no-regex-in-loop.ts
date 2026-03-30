/**
 * Rule: complexity/no-regex-in-loop
 *
 * Detects new RegExp() calls inside loop bodies. Creating a regex inside a loop
 * recompiles the pattern on every iteration, wasting CPU. The regex should be
 * declared once before the loop and reused.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { findNewExprInBody } from './_utils.ts';

/**
 * Check a loop node for new RegExp() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any RegExp construction found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  const found: AstNode | undefined = findNewExprInBody(node, 'RegExp');
  if (found) {
    results.push({
      file: context.file,
      line: found.loc.start.line,
      column: found.loc.start.column + 1,
      severity: 'warning',
      message: 'new RegExp() inside loop recompiles on every iteration',
      ruleId: 'complexity/no-regex-in-loop',
      tip: 'Declare the RegExp before the loop: const re = new RegExp(...)',
      fix: { range: { start: 0, end: 0 }, text: '' },
    });
  }

  return results;
};

/** The no-regex-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-regex-in-loop',
  description: 'Compile regex outside loops — avoid new RegExp() in loop body',
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
