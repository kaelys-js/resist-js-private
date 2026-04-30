/**
 * Rule: svelte5-config/no-node-adapter-cloudflare
 *
 * Node.js adapter is incompatible with Cloudflare Workers — use
 * `@sveltejs/adapter-cloudflare` instead.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { getAdapterImport } from './_config-ast.ts';

/** The no-node-adapter-cloudflare lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/no-node-adapter-cloudflare',
  description:
    'Node.js adapter incompatible with Cloudflare Workers — use @sveltejs/adapter-cloudflare',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const adapterPkg: string | undefined = getAdapterImport(context.imports);

      if (adapterPkg !== '@sveltejs/adapter-node') {
        return [];
      }

      const dir: string = dirname(context.file);

      const hasWrangler: boolean =
        existsSync(join(dir, 'wrangler.toml')) || existsSync(join(dir, 'wrangler.json'));

      if (!hasWrangler) {
        return [];
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message:
            'Node.js adapter incompatible with Cloudflare Workers — use @sveltejs/adapter-cloudflare',
          ruleId: rule.id,
          tip: "Replace with: import adapter from '@sveltejs/adapter-cloudflare'",
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};

export default rule;
