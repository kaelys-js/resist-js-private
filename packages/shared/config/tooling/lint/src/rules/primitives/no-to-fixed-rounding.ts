/**
 * Rule: primitives/no-toFixed-rounding
 *
 * Warns against using toFixed() for rounding, as it has inconsistent behavior
 * across implementations (e.g. (1.255).toFixed(2) may return "1.25" or "1.26").
 * Suggests using a decimal library or integer arithmetic for precision.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-toFixed-rounding lint rule. */
const rule: TypeScriptRule = {
  id: 'primitives/no-toFixed-rounding',
  description: 'Warn against toFixed() due to inconsistent rounding behavior',
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

      if (
        calleeNode &&
        (calleeNode.type === 'MemberExpression' || calleeNode.type === 'StaticMemberExpression')
      ) {
        const propRaw: unknown = calleeNode.property;
        const property =
          propRaw !== null && typeof propRaw === 'object' ? (propRaw as AstNode) : undefined;
        const propNameVal = property?.name as string | undefined;
        const propValueVal: unknown = property?.value;
        let propertyName: string | undefined;

        if (property?.type === 'Identifier') {
          propertyName = propNameVal;
        } else if (property?.type === 'Literal' && typeof propValueVal === 'string') {
          propertyName = propValueVal;
        }

        if (propertyName === 'toFixed') {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message:
              'toFixed() has inconsistent rounding - use decimal library for precision or integers for currency',
            ruleId: 'primitives/no-toFixed-rounding',
            tip: 'For currency, use integers (cents). For display, round explicitly first.',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
