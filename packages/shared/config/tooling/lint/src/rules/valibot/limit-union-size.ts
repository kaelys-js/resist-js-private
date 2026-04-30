/**
 * Rule: valibot/limit-union-size
 *
 * Warns when `v.union()` has more than 10 variants. Large unions are slow
 * to validate because Valibot must try each variant sequentially until one
 * matches. Consider splitting into smaller unions or using `v.variant()`.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Maximum number of union variants before triggering a warning. */
const MAX_UNION_SIZE: number = 10;

/** The limit-union-size lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'performance'],
  description: 'Warns when v.union() has more than 10 variants',
  id: 'valibot/limit-union-size',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;

      if (!callee) {
        return results;
      }

      if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
        const object = callee.object as AstNode | undefined;
        const property = callee.property as AstNode | undefined;
        const propName: string = (property?.name as string) ?? '';

        if (
          propName === 'union' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          const args = node.arguments as AstNode[] | undefined;

          if (!args || args.length === 0) {
            return results;
          }

          const firstArg = args[0] as AstNode;

          if (firstArg.type === 'ArrayExpression') {
            const elements = firstArg.elements as AstNode[] | undefined;

            if (elements && elements.length > MAX_UNION_SIZE) {
              results.push({
                column: node.loc.start.column + 1,
                file: context.file,
                fix: { range: { end: 0, start: 0 }, text: '' },
                line: node.loc.start.line,
                message: `v.union() has ${elements.length} variants (max ${MAX_UNION_SIZE}) — consider splitting or using v.variant()`,
                ruleId: 'valibot/limit-union-size',
                severity: 'warning',
                tip: 'Large unions are slow to validate. Use v.variant() with a discriminator field, or split into smaller unions.',
              });
            }
          }
        }
      }

      return results;
    },
  },
};

export default rule;
