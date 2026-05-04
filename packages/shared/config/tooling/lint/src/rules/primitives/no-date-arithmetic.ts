/**
 * Rule: primitives/no-date-arithmetic
 *
 * Detects subtraction involving Date constructor calls, which returns
 * raw milliseconds and is error-prone for date calculations.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

function isNewDateExpression(node: AstNode): boolean {
  const { callee } = node;

  if (callee === null || typeof callee !== 'object') {
    return false;
  }

  const calleeNode = callee as AstNode;

  return (
    node.type === 'NewExpression' &&
    calleeNode.type === 'Identifier' &&
    (calleeNode.name as string) === 'Date'
  );
}

const rule: TypeScriptRule = {
  id: 'primitives/no-date-arithmetic',
  description: 'Date arithmetic returns milliseconds - use date-fns or explicit getTime()',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;

      if (operator !== '-') {
        return results;
      }

      const leftRaw: unknown = node.left;
      const rightRaw: unknown = node.right;
      const leftNode =
        leftRaw !== null && typeof leftRaw === 'object' ? (leftRaw as AstNode) : undefined;
      const rightNode =
        rightRaw !== null && typeof rightRaw === 'object' ? (rightRaw as AstNode) : undefined;

      const leftIsDate: boolean = leftNode !== undefined && isNewDateExpression(leftNode);
      const rightIsDate: boolean = rightNode !== undefined && isNewDateExpression(rightNode);

      if (!leftIsDate && !rightIsDate) {
        return results;
      }

      /* Fix: append .getTime() to each new Date(...) operand */
      let leftText: string = leftNode ? context.getNodeText(leftNode) : '';
      let rightText: string = rightNode ? context.getNodeText(rightNode) : '';

      if (leftIsDate) {
        leftText = `${leftText}.getTime()`;
      }
      if (rightIsDate) {
        rightText = `${rightText}.getTime()`;
      }

      const fix = {
        range: { start: node.start, end: node.end },
        text: `${leftText} - ${rightText}`,
      };

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'warning',
        message: 'Date arithmetic returns milliseconds - use date-fns or explicit getTime()',
        ruleId: 'primitives/no-date-arithmetic',
        tip: 'Use differenceInDays/Hours/etc from date-fns, or explicitly use getTime()',
        fix,
      });

      return results;
    },
  },
};

export default rule;
