/**
 * Rule: complexity/no-repeated-traversal
 *
 * Detects arrays that are traversed multiple times with separate .filter()
 * and .map() (or .forEach) calls. Suggests combining into a single pass
 * with .reduce() or a for...of loop.
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

/** Array traversal methods that indicate separate passes. */
const TRAVERSAL_METHODS: readonly string[] = ['filter', 'map', 'forEach'];

/** The no-repeated-traversal lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-repeated-traversal',
  description: 'Combine multiple array passes (.filter + .map on same array) into a single pass',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    /**
     * Scan the entire program for arrays with multiple traversal calls.
     *
     * @param {AstNode} node - The Program AST node
     * @param {VisitorContext} context - The visitor context
     * @returns {LintResult[]} Diagnostics for arrays with redundant traversals
     */
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callsByObject: Map<string, Array<{ method: string; node: AstNode }>> = new Map();

      walkBody(node, (child: AstNode): boolean | void => {
        for (const method of TRAVERSAL_METHODS) {
          if (isCallTo(child, method)) {
            const objectName: string | undefined = getCalleeObjectName(child);

            if (objectName) {
              const existing: Array<{ method: string; node: AstNode }> =
                callsByObject.get(objectName) ?? [];
              existing.push({ method, node: child });
              callsByObject.set(objectName, existing);
            }
          }
        }
      });

      for (const [name, calls] of callsByObject) {
        const methods: Set<string> = new Set(calls.map((c) => c.method));
        const hasFilter: boolean = methods.has('filter');
        const hasMapOrForEach: boolean = methods.has('map') || methods.has('forEach');

        if (hasFilter && hasMapOrForEach) {
          const firstCall: AstNode = (calls[0] as { method: string; node: AstNode }).node;
          results.push({
            file: context.file,
            line: firstCall.loc.start.line,
            column: firstCall.loc.start.column + 1,
            severity: 'warning',
            message: `Array "${name}" is traversed multiple times (.filter + .map) — combine into a single pass`,
            ruleId: 'complexity/no-repeated-traversal',
            tip: 'Use .reduce() or a single for...of loop to process in one pass',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
