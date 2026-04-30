/**
 * Rule: primitives/no-in-operator-primitive
 *
 * Detects use of the 'in' operator with a literal primitive on the right
 * side, which throws a TypeError at runtime since 'in' requires an object.
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
  id: 'primitives/no-in-operator-primitive',
  description: "'in' operator throws on primitives - check type first or use optional chaining",
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    BinaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;

      if (operator !== 'in') {
        return results;
      }

      const rightRaw: unknown = node.right;

      if (!rightRaw || typeof rightRaw !== 'object') {
        return results;
      }

      const right = rightRaw as AstNode;

      if (right.type === 'Literal') {
        const valueType = typeof (right.value as unknown);

        if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message:
              "'in' operator throws on primitives - check type first or use optional chaining",
            ruleId: 'primitives/no-in-operator-primitive',
            tip: 'Check typeof first: typeof obj === "object" && obj !== null && "key" in obj',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
