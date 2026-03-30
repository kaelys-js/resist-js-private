/**
 * Rule: complexity/no-dom-query-in-loop
 *
 * Detects DOM queries inside loop bodies. DOM queries are expensive operations
 * that should be cached outside loops to avoid redundant lookups on each
 * iteration.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { findStaticMemberCallInBody } from './_utils.ts';

/** DOM query methods to check for. */
const DOM_METHODS: readonly string[] = [
  'querySelector',
  'querySelectorAll',
  'getElementById',
  'getElementsByClassName',
  'getElementsByTagName',
];

/**
 * Check a loop node for DOM query calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any DOM query patterns found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  for (const method of DOM_METHODS) {
    const found: AstNode | undefined = findStaticMemberCallInBody(node, 'document', method);
    if (found) {
      results.push({
        file: context.file,
        line: found.loc.start.line,
        column: found.loc.start.column + 1,
        severity: 'warning',
        message: 'DOM query inside loop — cache the result outside the loop',
        ruleId: 'complexity/no-dom-query-in-loop',
        tip: 'Move document.querySelector() before the loop and reuse the reference',
        fix: { range: { start: 0, end: 0 }, text: '' },
      });
    }
  }

  return results;
};

/** The no-dom-query-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-dom-query-in-loop',
  description: 'Cache DOM queries outside loops',
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
