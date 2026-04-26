/**
 * Rule: complexity/array-size-warning
 *
 * Detects unbounded .push() calls inside while(true) loops. An infinite loop
 * that pushes to an array without a size check or break condition can cause
 * the array to grow without limit, eventually exhausting memory.
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

/** The array-size-warning lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/array-size-warning',
  description: 'Warn on unbounded array growth in while(true) loops',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    /**
     * Check if a WhileStatement is while(true) with a .push() call in its body.
     *
     * @param {AstNode} node - The WhileStatement AST node
     * @param {VisitorContext} context - The visitor context
     * @returns {LintResult[]} Diagnostics if unbounded push is found
     */
    WhileStatement(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const { test } = node;
      if (test === null || typeof test !== 'object') {
        return results;
      }

      const testNode: AstNode = test as AstNode;
      if (
        !(testNode.type === 'BooleanLiteral' || testNode.type === 'Literal') ||
        testNode.value !== true
      ) {
        return results;
      }

      const pushCall: AstNode | undefined = findCallInBody(node, 'push');
      if (pushCall) {
        results.push({
          file: context.file,
          line: pushCall.loc.start.line,
          column: pushCall.loc.start.column + 1,
          severity: 'warning',
          message: 'Unbounded .push() in while(true) — array may grow without limit',
          ruleId: 'complexity/array-size-warning',
          tip: 'Add a maximum size check or break condition to prevent unbounded growth',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
