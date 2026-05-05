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

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';
import { getAdapterImport, STATIC_ADAPTERS } from './_config-ast.ts';

/** The static-adapter-for-capacitor lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/static-adapter-for-capacitor',
  description: "Capacitor project requires @sveltejs/adapter-static — current adapter won't work",
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],
  fixable: true,

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

      /* Fix: replace adapter import source with adapter-static */
      let fix = NO_OP_FIX;
      const importMatch: RegExpExecArray | null = new RegExp(
        adapterPkg.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`),
      ).exec(context.content);

      if (importMatch) {
        fix = {
          range: { start: importMatch.index, end: importMatch.index + importMatch[0].length },
          text: '@sveltejs/adapter-static',
        };
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
          fix,
        },
      ];
    },
  },
};

export default rule;
