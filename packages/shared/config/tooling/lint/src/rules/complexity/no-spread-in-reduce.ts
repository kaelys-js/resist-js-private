/**
 * Rule: complexity/no-spread-in-reduce
 *
 * Detects spread operators inside .reduce() callbacks. Each spread creates
 * a full copy of the accumulator, resulting in O(n²) total allocations.
 * Suggests mutating the accumulator directly instead.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { isCallTo, findSpreadInBody } from './_utils.ts';

/** The no-spread-in-reduce lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-spread-in-reduce',
  description: 'Avoid object/array spread inside .reduce() — creates O(n²) copies',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    /**
     * Check if a CallExpression is a .reduce() call with spread in its callback.
     *
     * @param {AstNode} node - The CallExpression AST node
     * @param {VisitorContext} context - The visitor context
     * @returns {LintResult[]} Diagnostics if spread is found inside .reduce()
     */
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (!isCallTo(node, 'reduce')) {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;
      if (!args || args.length === 0) {
        return results;
      }

      const callback: AstNode = args[0] as AstNode;
      if (!callback) {
        return results;
      }

      const spread: AstNode | undefined = findSpreadInBody(callback);
      if (spread) {
        results.push({
          file: context.file,
          line: spread.loc.start.line,
          column: spread.loc.start.column + 1,
          severity: 'warning',
          message: 'Spread operator inside .reduce() creates O(n²) copies',
          ruleId: 'complexity/no-spread-in-reduce',
          tip: 'Mutate the accumulator directly instead of spreading: acc[key] = value',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
