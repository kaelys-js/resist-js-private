/**
 * Rule: primitives/no-lossy-math-operation
 *
 * Flags patterns like Math.round(x) / y which lose decimal precision. This
 * commonly appears in currency calculations where rounding before division
 * produces incorrect results.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

const rule: TypeScriptRule = {
  id: 'primitives/no-lossy-math-operation',
  description:
    'Lossy rounding pattern for decimal precision - use integers (cents) or decimal library',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;
      const leftRaw: unknown = node.left;
      const leftNode =
        leftRaw !== null && typeof leftRaw === 'object' ? (leftRaw as AstNode) : undefined;

      let isMathRoundCall = false;

      if (leftNode && leftNode.type === 'CallExpression') {
        const calleeRaw: unknown = leftNode.callee;
        const calleeNode =
          calleeRaw !== null && typeof calleeRaw === 'object' ? (calleeRaw as AstNode) : undefined;

        if (calleeNode && calleeNode.type === 'MemberExpression') {
          const objRaw: unknown = calleeNode.object;
          const objNode =
            objRaw !== null && typeof objRaw === 'object' ? (objRaw as AstNode) : undefined;
          const propRaw: unknown = calleeNode.property;
          const propNode =
            propRaw !== null && typeof propRaw === 'object' ? (propRaw as AstNode) : undefined;
          const objName = objNode?.name as string | undefined;
          const propName = propNode?.name as string | undefined;

          if (
            objNode &&
            objNode.type === 'Identifier' &&
            objName === 'Math' &&
            propNode &&
            propName === 'round'
          ) {
            isMathRoundCall = true;
          }
        }
      }

      if (operator === '/' && isMathRoundCall) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message:
            'Lossy rounding pattern for decimal precision - use integers (cents) or decimal library',
          ruleId: 'primitives/no-lossy-math-operation',
          tip: 'Work with integers (cents for currency) or use a decimal library like decimal.js',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
