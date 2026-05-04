/**
 * Rule: complexity/no-array-method-in-loop
 *
 * Detects array methods (.find, .filter, .includes, .some, .every) used inside
 * loop bodies, which creates O(n²) complexity. Suggests pre-computing with a
 * Map or Set before the loop.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { walkBody, isCallTo } from './_utils.ts';

/** Array methods that indicate O(n) scans when used inside loops. */
const ARRAY_METHODS: readonly string[] = ['find', 'filter', 'includes', 'some', 'every'];

/**
 * Check a loop node for array method calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any array method calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  walkBody(node, (child: AstNode): boolean | void => {
    if (child.type !== 'CallExpression') {
      return;
    }

    for (const method of ARRAY_METHODS) {
      if (isCallTo(child, method)) {
        /* Skip .includes() with a string-literal argument — that is String.prototype.includes,
           not Array.prototype.includes, and is O(n) not O(n²). */
        if (method === 'includes') {
          const args: unknown = child.arguments;

          if (Array.isArray(args) && args.length > 0) {
            const firstArg: AstNode = args[0] as AstNode;

            if (
              firstArg.type === 'StringLiteral' ||
              (firstArg.type === 'Literal' && typeof firstArg.value === 'string')
            ) {
              return;
            }
          }
        }

        results.push({
          file: context.file,
          line: child.loc.start.line,
          column: child.loc.start.column + 1,
          severity: 'warning',
          message: `Array method ".${method}()" inside loop body creates O(n²) complexity`,
          ruleId: 'complexity/no-array-method-in-loop',
          tip: 'Pre-compute with a Map or Set before the loop',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
        return true;
      }
    }
  });

  return results;
};

/** The no-array-method-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-array-method-in-loop',
  description: 'Avoid array methods (.find, .filter, .includes, .some, .every) inside loops',
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
