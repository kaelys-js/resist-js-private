/**
 * Rule: complexity/no-nested-array-iteration
 *
 * Detects nested loops over arrays which produce O(n²) complexity.
 * Suggests converting the inner loop to a Map or Set lookup for O(n) total.
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
import { walkBody, isLoopNode } from './_utils.ts';

/**
 * Check a loop node for nested loops in its body.
 *
 * @param {AstNode} node - The outer loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any nested loops found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  walkBody(node, (child: AstNode): boolean | void => {
    if (isLoopNode(child)) {
      results.push({
        file: context.file,
        line: child.loc.start.line,
        column: child.loc.start.column + 1,
        severity: 'warning',
        message: 'Nested loop detected — consider using a Map or Set for O(1) lookups',
        ruleId: 'complexity/no-nested-array-iteration',
        tip: 'Convert inner loop to Map/Set lookup for O(n) total complexity',
        fix: NO_OP_FIX,
      });
      return true;
    }
  });

  return results;
};

/** The no-nested-array-iteration lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-nested-array-iteration',
  description: 'Avoid nested loops over arrays — O(n²) complexity',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    ForStatement: checkLoop,
    ForOfStatement: checkLoop,
  },
};

export default rule;
