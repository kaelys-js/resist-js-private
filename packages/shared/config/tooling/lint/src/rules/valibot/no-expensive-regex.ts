/**
 * Rule: valibot/no-expensive-regex
 *
 * Warns about potentially ReDoS-prone regular expressions in `v.regex()`.
 * Nested quantifiers like `(a+)+`, `(a*)*`, `(a+)*` can cause catastrophic
 * backtracking, leading to denial-of-service vulnerabilities.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern that detects nested quantifiers indicating ReDoS vulnerability. */
const REDOS_PATTERN: RegExp = /(\+|\*|\})\)(\+|\*|\{)/;

/** The no-expensive-regex lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'security'],
  description: 'Warns about potentially ReDoS-prone regex in v.regex()',
  id: 'valibot/no-expensive-regex',
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
          propName === 'regex' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          // Extract the regex argument text
          const args = node.arguments as AstNode[] | undefined;
          if (!args || args.length === 0) {
            return results;
          }

          const firstArg = args[0] as AstNode;
          const argText: string = context.content.slice(firstArg.start, firstArg.end);

          // Check for nested quantifiers
          if (REDOS_PATTERN.test(argText)) {
            results.push({
              column: node.loc.start.column + 1,
              file: context.file,
              fix: { range: { end: 0, start: 0 }, text: '' },
              line: node.loc.start.line,
              message:
                'v.regex() contains a potentially ReDoS-prone pattern with nested quantifiers',
              ruleId: 'valibot/no-expensive-regex',
              severity: 'warning',
              tip: 'Avoid nested quantifiers like (a+)+, (a*)*. Use atomic groups or possessive quantifiers, or simplify the pattern.',
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
