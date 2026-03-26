/**
 * Rule: valibot/discriminated-unions
 *
 * Suggests using `v.variant()` for discriminated unions instead of `v.union()`.
 * `v.variant()` is more performant because it can use a discriminator field to
 * select the correct schema without trying all alternatives.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The discriminated-unions lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'performance'],
  description: 'Use v.variant() for discriminated unions instead of v.union()',
  id: 'valibot/discriminated-unions',
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
          // Check if first argument is an array of object schemas
          const args = node.arguments as AstNode[] | undefined;
          if (!args || args.length === 0) {
            return results;
          }

          const firstArg = args[0] as AstNode;
          if (firstArg.type === 'ArrayExpression') {
            const elements = firstArg.elements as AstNode[] | undefined;
            if (elements && elements.length >= 2) {
              // Check if elements are object schema calls (v.strictObject, v.object)
              let allObjectSchemas: boolean = true;
              for (const elem of elements) {
                if (!elem) {
                  continue;
                }
                if (
                  !context.content.slice(elem.start, elem.end).includes('strictObject(') &&
                  !context.content.slice(elem.start, elem.end).includes('object(')
                ) {
                  allObjectSchemas = false;
                  break;
                }
              }

              if (allObjectSchemas) {
                results.push({
                  column: node.loc.start.column + 1,
                  file: context.file,
                  fix: {
                    range: { end: property?.end ?? 0, start: property?.start ?? 0 },
                    text: 'variant',
                  },
                  line: node.loc.start.line,
                  message:
                    'Consider using v.variant() instead of v.union() for object schemas with a common discriminator field',
                  ruleId: 'valibot/discriminated-unions',
                  severity: 'info',
                  tip: "v.variant('type', [...]) is more performant — it uses the discriminator to select the schema directly",
                });
              }
            }
          }
        }
      }

      return results;
    },
  },
};

export default rule;
