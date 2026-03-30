/**
 * Rule: complexity/recursive-depth
 *
 * Detects recursive functions that lack a depth or limit parameter.
 * Unbounded recursion can overflow the call stack. A depth parameter with
 * a default value ensures the recursion terminates.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { walkBody } from './_utils.ts';

/** Parameter names that indicate a depth/limit guard. */
const DEPTH_PARAM_NAMES: ReadonlySet<string> = new Set([
  'depth',
  'limit',
  'maxDepth',
  'level',
  'max',
]);

/**
 * Extract the name from a parameter node, handling both Identifier and
 * AssignmentPattern (default value) forms.
 *
 * @param {AstNode} param - The parameter AST node
 * @returns {string | undefined} The parameter name, or undefined if not extractable
 */
function getParamName(param: AstNode): string | undefined {
  if (param.type === 'Identifier') {
    return param.name as string;
  }
  if (param.type === 'AssignmentPattern') {
    const left: unknown = param.left;
    if (left !== null && typeof left === 'object') {
      const leftNode: AstNode = left as AstNode;
      if (leftNode.type === 'Identifier') {
        return leftNode.name as string;
      }
    }
  }
  return undefined;
}

/** The recursive-depth lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/recursive-depth',
  description: 'Recursive functions should include a depth/limit parameter',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    /**
     * Check if a FunctionDeclaration is recursive and lacks a depth parameter.
     *
     * @param {AstNode} node - The FunctionDeclaration AST node
     * @param {VisitorContext} context - The visitor context
     * @returns {LintResult[]} Diagnostics if recursive function lacks depth guard
     */
    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const id: unknown = node.id;
      if (id === null || typeof id !== 'object') {
        return results;
      }

      const idNode: AstNode = id as AstNode;
      const funcName: string | undefined = idNode.name as string | undefined;
      if (!funcName) {
        return results;
      }

      let isRecursive: boolean = false;
      walkBody(node, (child: AstNode): boolean | void => {
        if (child.type === 'CallExpression') {
          const callee: unknown = child.callee;
          if (callee !== null && typeof callee === 'object') {
            const calleeNode: AstNode = callee as AstNode;
            if (calleeNode.type === 'Identifier' && (calleeNode.name as string) === funcName) {
              isRecursive = true;
              return true;
            }
          }
        }
      });

      if (!isRecursive) {
        return results;
      }

      const params: AstNode[] = (node.params as AstNode[]) ?? [];
      const hasDepthParam: boolean = params.some((param: AstNode): boolean => {
        const name: string | undefined = getParamName(param);
        return name !== undefined && DEPTH_PARAM_NAMES.has(name);
      });

      if (!hasDepthParam) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: `Recursive function "${funcName}" has no depth limit parameter`,
          ruleId: 'complexity/recursive-depth',
          tip: `Add a depth parameter with a default value: function ${funcName}(depth = 0) { if (depth > MAX) return; ... ${funcName}(depth + 1); }`,
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
