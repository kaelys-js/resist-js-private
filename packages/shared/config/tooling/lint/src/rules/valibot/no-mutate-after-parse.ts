/**
 * Rule: valibot/no-mutate-after-parse
 *
 * Bans assignment to properties of parsed data. After validation, the
 * data conforms to the schema — mutating it can break that guarantee.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-mutate-after-parse lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Bans mutation of parsed data — validated data should remain immutable',
  id: 'valibot/no-mutate-after-parse',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    ExpressionStatement(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const expression = node.expression as AstNode | undefined;
      if (!expression) {
        return results;
      }

      if (expression.type !== 'AssignmentExpression') {
        return results;
      }

      const left = expression.left as AstNode | undefined;
      if (!left) {
        return results;
      }

      if (left.type !== 'StaticMemberExpression' && left.type !== 'MemberExpression') {
        return results;
      }

      // Check if the left-hand side references parsed data (e.g., result.data.foo or parsed.foo)
      const leftText: string = context.content.slice(left.start, left.end);
      if (
        leftText.includes('.data.') ||
        leftText.includes('.output.') ||
        leftText.startsWith('parsed.') ||
        leftText.startsWith('result.data')
      ) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: 0, start: 0 }, text: '' },
          line: node.loc.start.line,
          message:
            'Do not mutate parsed data — validated data should remain immutable after parsing',
          ruleId: 'valibot/no-mutate-after-parse',
          severity: 'error',
          tip: 'Create a new object with the desired changes instead of mutating parsed data',
        });
      }

      return results;
    },
  },
};

export default rule;
