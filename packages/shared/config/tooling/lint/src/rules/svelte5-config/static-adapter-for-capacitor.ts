/**
 * Rule: svelte5-config/static-adapter-for-capacitor
 *
 * Capacitor projects require `@sveltejs/adapter-static` — server adapters
 * won't work because Capacitor needs static HTML output.
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
import { getAdapterImport, STATIC_ADAPTERS } from './_config-ast.ts';

/** The static-adapter-for-capacitor lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/static-adapter-for-capacitor',
  description: "Capacitor project requires @sveltejs/adapter-static — current adapter won't work",
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const dir: string = dirname(context.file);

      const hasCapacitor: boolean =
        existsSync(join(dir, 'capacitor.config.ts')) ||
        existsSync(join(dir, 'capacitor.config.json'));

      if (!hasCapacitor) {
        return [];
      }

      const adapterPkg: string | undefined = getAdapterImport(context.imports);
      if (!adapterPkg || STATIC_ADAPTERS.has(adapterPkg)) {
        return [];
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Capacitor project requires @sveltejs/adapter-static — current adapter '${adapterPkg}' won't work`,
          ruleId: rule.id,
          tip: "Install and use: import adapter from '@sveltejs/adapter-static'; with fallback: 'index.html'",
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};

export default rule;
