/**
 * Rule: valibot/prefer-methods
 *
 * Suggests using built-in Valibot methods instead of custom `v.transform()`
 * calls. Valibot provides many built-in validation and transformation methods
 * that are more readable and maintainable than custom transforms.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type AstNode,
  type LintResult,
  type TypeScriptRule,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/** The prefer-methods lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'idiom'],
  description: 'Use built-in Valibot methods instead of custom v.transform() calls',
  fixable: true,
  id: 'valibot/prefer-methods',
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
          propName === 'transform' &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          // Get the transform callback text to check for common patterns
          const args = node.arguments as AstNode[] | undefined;
          if (!args || args.length === 0) {
            return results;
          }

          const callbackArg = args[0] as AstNode;

          // Detect common patterns that have built-in equivalents
          let suggestion: string = '';
          if (context.content.slice(callbackArg.start, callbackArg.end).includes('.trim()')) {
            suggestion = 'v.trim()';
          } else if (
            context.content.slice(callbackArg.start, callbackArg.end).includes('.toLowerCase()')
          ) {
            suggestion = 'v.toLowerCase()';
          } else if (
            context.content.slice(callbackArg.start, callbackArg.end).includes('.toUpperCase()')
          ) {
            suggestion = 'v.toUpperCase()';
          }

          const message: string = suggestion
            ? `v.transform() could be replaced with built-in ${suggestion}`
            : 'v.transform() detected — check if a built-in Valibot method exists';

          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: suggestion
              ? {
                  range: { end: node.end as number, start: node.start as number },
                  text: suggestion,
                }
              : NO_OP_FIX,
            line: node.loc.start.line,
            message,
            ruleId: 'valibot/prefer-methods',
            severity: 'info',
            tip: 'Built-in methods like v.trim(), v.toLowerCase(), v.toUpperCase() are more readable than custom transforms',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
