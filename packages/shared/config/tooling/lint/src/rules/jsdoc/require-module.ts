/**
 * Rule: jsdoc/require-module
 *
 * Every TypeScript file must have a top-level JSDoc comment with `@module`.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The require-module lint rule. */
const rule: TypeScriptRule = {
  id: 'jsdoc/require-module',
  description: 'Every TypeScript file must have a top-level /** @module */ JSDoc comment',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  fixable: false,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const hasModule: boolean = /@module\b/.test(context.content.slice(0, 500));

      if (!hasModule) {
        results.push({
          file: context.file,
          line: 1,
          column: 1,
          severity: 'error',
          message: 'File is missing a top-level /** @module */ JSDoc comment',
          ruleId: 'jsdoc/require-module',
          tip: 'Add a /** ... @module */ comment at the top of the file',
          fix: {
            range: { start: 0, end: 0 },
            text: '/**\n * Module description.\n *\n * @module\n */\n\n',
          },
        });
      }

      return results;
    },
  },
};

export default rule;
