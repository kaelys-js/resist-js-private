/**
 * Rule: primitives/no-relational-null-undefined
 *
 * Detects relational comparisons (<, >, <=, >=) with null or undefined,
 * which produce counterintuitive results due to the abstract relational
 * comparison algorithm.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type LintFix,
  type NoOpFix,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Returns true when `n` is a `null` literal or the `undefined` identifier.
 *
 * @param n - AST node to test
 * @returns True when the node is null/undefined
 */
function isNullOrUndefined(n: AstNode): boolean {
  return (
    (n.type === 'Literal' && (n.value as unknown) === null) ||
    (n.type === 'Identifier' && (n.name as string) === 'undefined')
  );
}

const rule: TypeScriptRule = {
  id: 'primitives/no-relational-null-undefined',
  description: 'Relational comparison with null/undefined has counterintuitive results',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;

      if (operator !== '<' && operator !== '>' && operator !== '<=' && operator !== '>=') {
        return results;
      }

      const leftRaw: unknown = node.left;
      const rightRaw: unknown = node.right;

      if (!leftRaw || !rightRaw || typeof leftRaw !== 'object' || typeof rightRaw !== 'object') {
        return results;
      }

      const left = leftRaw as AstNode;
      const right = rightRaw as AstNode;

      if (isNullOrUndefined(left) || isNullOrUndefined(right)) {
        /* Fix: add explicit nullish guard before the relational comparison */
        let fix: LintFix | NoOpFix = NO_OP_FIX;
        const leftIsNullish = isNullOrUndefined(left);
        const valueNode = leftIsNullish ? right : left;
        const nullishNode = leftIsNullish ? left : right;
        const valueText: string = context.getNodeText(valueNode);

        const isUndefined =
          nullishNode.type === 'Identifier' && (nullishNode.name as string) === 'undefined';
        const guard: string = isUndefined ? `${valueText} !== undefined` : `${valueText} != null`;

        fix = {
          range: { start: node.start, end: node.end },
          text: `${guard} && ${valueText} ${operator} 0`,
        };

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Relational comparison with null/undefined has counterintuitive results',
          ruleId: 'primitives/no-relational-null-undefined',
          tip: 'Check for null/undefined separately before relational comparison',
          fix,
        });
      }

      return results;
    },
  },
};

export default rule;
