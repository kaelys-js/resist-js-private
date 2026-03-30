/**
 * Rule: primitives/prefer-math-trunc
 *
 * Flags Math.floor() usage which behaves differently from Math.trunc() on
 * negative values. Math.floor(-1.5) returns -2 while Math.trunc(-1.5) returns -1.
 * If truncation toward zero is intended, Math.trunc() is more explicit.
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
  id: 'primitives/prefer-math-trunc',
  description:
    'Math.floor() on potentially negative value - use Math.trunc() for consistent truncation toward zero',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const calleeRaw: unknown = node.callee;
      const calleeNode =
        calleeRaw !== null && typeof calleeRaw === 'object' ? (calleeRaw as AstNode) : undefined;
      const calleeObjRaw: unknown = calleeNode?.object;
      const calleeObjNode =
        calleeObjRaw !== null && typeof calleeObjRaw === 'object'
          ? (calleeObjRaw as AstNode)
          : undefined;
      const calleePropRaw: unknown = calleeNode?.property;
      const calleePropNode =
        calleePropRaw !== null && typeof calleePropRaw === 'object'
          ? (calleePropRaw as AstNode)
          : undefined;
      const calleeObjName = calleeObjNode?.name as string | undefined;
      const calleePropName = calleePropNode?.name as string | undefined;

      if (
        calleeNode &&
        calleeNode.type === 'MemberExpression' &&
        calleeObjNode &&
        calleeObjNode.type === 'Identifier' &&
        calleeObjName === 'Math' &&
        calleePropNode &&
        calleePropName === 'floor'
      ) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message:
            'Math.floor() on potentially negative value - use Math.trunc() for consistent truncation toward zero',
          ruleId: 'primitives/prefer-math-trunc',
          tip: 'Use Math.trunc(x) if you want integer part, Math.floor(x) if you want toward -∞',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
