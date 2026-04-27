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
  categories: ['jsdoc'],
  stages: ['lint'],
  fixable: false,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // The @module convention applies to TypeScript source modules only.
      // .md/.mdx (README documentation, code-fence examples) and .html
      // (e.g. SvelteKit app shell) are out of scope.
      if (/\.(md|mdx|html)$/i.test(context.file)) {
        return results;
      }

      // Scan the first 2000 chars to allow long-form leading JSDoc blocks
      // (multi-paragraph descriptions with bullet lists) to still place
      // `@module` near the bottom of the comment without tripping the rule.
      const hasModule: boolean = /@module\b/.test(context.content.slice(0, 2000));

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
