/**
 * Rule: valibot/prefer-picklist
 *
 * Suggests using `v.picklist()` instead of `v.union([v.literal(...), ...])`.
 * `v.picklist()` is more concise, readable, and performant for unions of
 * literal values.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The prefer-picklist lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'idiom'],
  description: 'Use v.picklist() instead of v.union([v.literal(...), ...]) for literal unions',
  id: 'valibot/prefer-picklist',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

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

          if (firstArg.type !== 'ArrayExpression') {
            return results;
          }

          const elements = firstArg.elements as AstNode[] | undefined;

          if (!elements || elements.length === 0) {
            return results;
          }

          // Check if ALL elements are v.literal(...) calls
          let allLiterals: boolean = true;

          for (const elem of elements) {
            if (!elem) {
              allLiterals = false;
              break;
            }

            const elemText: string = context.content.slice(elem.start, elem.end);

            if (!elemText.startsWith('v.literal(') && !elemText.startsWith('valibot.literal(')) {
              allLiterals = false;
              break;
            }
          }

          if (allLiterals) {
            results.push({
              column: node.loc.start.column + 1,
              file: context.file,
              fix: {
                range: { end: property?.end ?? 0, start: property?.start ?? 0 },
                text: 'picklist',
              },
              line: node.loc.start.line,
              message:
                'Use v.picklist() instead of v.union([v.literal(...), ...]) for literal unions',
              ruleId: 'valibot/prefer-picklist',
              severity: 'warning',
              tip: "Replace with v.picklist(['value1', 'value2', ...]) for better readability and performance",
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
