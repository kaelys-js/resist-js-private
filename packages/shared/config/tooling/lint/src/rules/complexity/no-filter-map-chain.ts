/**
 * Rule: complexity/no-filter-map-chain
 *
 * Detects .filter().map() chains that traverse the array twice.
 * A single-pass .reduce() or for...of loop achieves the same result
 * with half the iterations.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { isCallTo } from './_utils.ts';

/** The no-filter-map-chain lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-filter-map-chain',
  description: 'Avoid .filter().map() chains — use a single-pass reduce or for...of',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    /**
     * Check if a CallExpression is a .map() call chained on a .filter() call.
     *
     * @param {AstNode} node - The CallExpression AST node
     * @param {VisitorContext} context - The visitor context
     * @returns {LintResult[]} Diagnostics if .filter().map() chain is found
     */
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (!isCallTo(node, 'map')) {
        return results;
      }

      const callee: unknown = node.callee;
      if (callee === null || typeof callee !== 'object') {
        return results;
      }

      const calleeNode: AstNode = callee as AstNode;
      if (calleeNode.type !== 'StaticMemberExpression' && calleeNode.type !== 'MemberExpression') {
        return results;
      }

      const obj: unknown = calleeNode.object;
      if (obj === null || typeof obj !== 'object') {
        return results;
      }

      const objNode: AstNode = obj as AstNode;
      if (objNode.type !== 'CallExpression') {
        return results;
      }

      if (isCallTo(objNode, 'filter')) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message:
            '.filter().map() traverses the array twice — use .reduce() or for...of for a single pass',
          ruleId: 'complexity/no-filter-map-chain',
          tip: 'Use a single .reduce() or for...of loop to filter and transform in one pass',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
