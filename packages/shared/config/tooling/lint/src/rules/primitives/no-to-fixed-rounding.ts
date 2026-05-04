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
  fixable: true,

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
          /* Fix: expr.toFixed(n) → (Math.round(expr * 10**n) / 10**n).toString() */
          let fix = { range: { start: 0, end: 0 }, text: '' };
          const objRaw: unknown = calleeNode.object;
          const objNode =
            objRaw !== null && typeof objRaw === 'object' ? (objRaw as AstNode) : undefined;

          if (objNode) {
            const objText: string = context.getNodeText(objNode);
            const nodeArgs = node.arguments as AstNode[] | undefined;

            if (!nodeArgs || nodeArgs.length === 0) {
              /* .toFixed() with no args = .toFixed(0) */
              fix = {
                range: { start: node.start, end: node.end },
                text: `Math.round(${objText}).toString()`,
              };
            } else {
              const digitsArg = nodeArgs[0] as AstNode;

              if (
                digitsArg.type === 'Literal' &&
                typeof (digitsArg.value as unknown) === 'number'
              ) {
                const digits = digitsArg.value as number;
                const multiplier = 10 ** digits;
                fix = {
                  range: { start: node.start, end: node.end },
                  text: `(Math.round(${objText} * ${multiplier}) / ${multiplier}).toString()`,
                };
              } else {
                const digitsText: string = context.getNodeText(digitsArg);
                fix = {
                  range: { start: node.start, end: node.end },
                  text: `(Math.round(${objText} * 10 ** ${digitsText}) / 10 ** ${digitsText}).toString()`,
                };
              }
            }
          }

          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message:
              'toFixed() has inconsistent rounding - use decimal library for precision or integers for currency',
            ruleId: 'primitives/no-toFixed-rounding',
            tip: 'For currency, use integers (cents). For display, round explicitly first.',
            fix,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
