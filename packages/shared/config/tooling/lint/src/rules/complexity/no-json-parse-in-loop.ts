/**
 * Rule: complexity/no-json-parse-in-loop
 *
 * Detects JSON.parse() and JSON.stringify() calls inside loop bodies.
 * These operations are expensive and should be performed outside loops
 * when the input does not change between iterations.
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

/**
 * Check a loop node for JSON.parse()/JSON.stringify() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any JSON serialization calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  const parseCall: AstNode | undefined = findStaticMemberCallInBody(node, 'JSON', 'parse');
  if (parseCall) {
    results.push({
      file: context.file,
      line: parseCall.loc.start.line,
      column: parseCall.loc.start.column + 1,
      severity: 'warning',
      message: 'JSON.parse()/JSON.stringify() inside loop is expensive — cache or restructure',
      ruleId: 'complexity/no-json-parse-in-loop',
      tip: 'Parse/stringify outside the loop when possible',
      fix: { range: { start: 0, end: 0 }, text: '' },
    });
  }

  const stringifyCall: AstNode | undefined = findStaticMemberCallInBody(node, 'JSON', 'stringify');
  if (stringifyCall) {
    results.push({
      file: context.file,
      line: stringifyCall.loc.start.line,
      column: stringifyCall.loc.start.column + 1,
      severity: 'warning',
      message: 'JSON.parse()/JSON.stringify() inside loop is expensive — cache or restructure',
      ruleId: 'complexity/no-json-parse-in-loop',
      tip: 'Parse/stringify outside the loop when possible',
      fix: { range: { start: 0, end: 0 }, text: '' },
    });
  }

  return results;
};

/** The no-json-parse-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-json-parse-in-loop',
  description: 'Avoid JSON.parse()/JSON.stringify() inside loops',
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
