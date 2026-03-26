/**
 * Rule: valibot/prefer-pipe
 *
 * Suggests using `v.pipe()` for chained validations instead of deprecated
 * patterns where validation functions take a schema as the first argument.
 * The modern Valibot API uses `v.pipe(v.string(), v.minLength(3))` instead
 * of `v.minLength(v.string(), 3)`.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Validation method names that should be used inside v.pipe() instead of wrapping schemas. */
const PIPE_METHODS: ReadonlySet<string> = new Set([
  'email',
  'maxLength',
  'maxValue',
  'minLength',
  'minValue',
  'regex',
  'url',
  'uuid',
]);

/** Schema factory names that produce base schemas. */
const SCHEMA_FACTORIES: ReadonlySet<string> = new Set([
  'array',
  'boolean',
  'number',
  'object',
  'strictObject',
  'string',
]);

/** The prefer-pipe lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'idiom'],
  description: 'Use v.pipe() for chained validations instead of deprecated nested patterns',
  id: 'valibot/prefer-pipe',
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
          PIPE_METHODS.has(propName) &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          // Check if the first argument is a schema call (deprecated pattern)
          const args = node.arguments as AstNode[] | undefined;
          if (!args || args.length === 0) {
            return results;
          }

          const firstArg = args[0] as AstNode;
          if (firstArg.type === 'CallExpression') {
            const firstArgCallee = firstArg.callee as AstNode | undefined;
            if (
              firstArgCallee &&
              (firstArgCallee.type === 'StaticMemberExpression' ||
                firstArgCallee.type === 'MemberExpression')
            ) {
              const innerProp = firstArgCallee.property as AstNode | undefined;
              const innerName: string = (innerProp?.name as string) ?? '';

              if (SCHEMA_FACTORIES.has(innerName)) {
                results.push({
                  column: node.loc.start.column + 1,
                  file: context.file,
                  fix: { range: { end: 0, start: 0 }, text: '' },
                  line: node.loc.start.line,
                  message: `Use v.pipe(v.${innerName}(), v.${propName}(...)) instead of v.${propName}(v.${innerName}(), ...)`,
                  ruleId: 'valibot/prefer-pipe',
                  severity: 'info',
                  tip: 'The modern Valibot API uses v.pipe() for chaining validations on a base schema',
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
