/**
 * Rule: complexity/prefer-map-for-lookup
 *
 * Detects arrays with multiple .find() calls and suggests using a Map for
 * O(1) lookups instead of repeated O(n) scans.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { walkBody, isCallTo, getCalleeObjectName } from './_utils.ts';

/** The prefer-map-for-lookup lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/prefer-map-for-lookup',
  description: 'Use Map for repeated key lookups instead of multiple .find() calls',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    /**
     * Scan the entire program for arrays with multiple .find() calls.
     *
     * @param {AstNode} node - The Program AST node
     * @param {VisitorContext} context - The visitor context
     * @returns {LintResult[]} Diagnostics for arrays with multiple .find() calls
     */
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const findCalls: Map<string, AstNode[]> = new Map();

      walkBody(node, (child: AstNode): boolean | void => {
        if (isCallTo(child, 'find')) {
          const objectName: string | undefined = getCalleeObjectName(child);

          if (objectName) {
            const existing: AstNode[] = findCalls.get(objectName) ?? [];
            existing.push(child);
            findCalls.set(objectName, existing);
          }
        }
      });

      for (const [name, calls] of findCalls) {
        if (calls.length >= 2) {
          const firstCall: AstNode = calls[0] as AstNode;
          results.push({
            file: context.file,
            line: firstCall.loc.start.line,
            column: firstCall.loc.start.column + 1,
            severity: 'warning',
            message: `Array "${name}" has multiple .find() calls — use a Map for O(1) lookups`,
            ruleId: 'complexity/prefer-map-for-lookup',
            tip: 'Create a Map from the array once, then use map.get() for lookups',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
