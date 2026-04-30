/**
 * Rule: svelte5-config/no-deprecated-options
 *
 * Flags deprecated Svelte 4 configuration options with migration guidance.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { getDefaultExportObject, collectPropertyPaths } from './_config-ast.ts';

/** Map of deprecated option paths to migration messages. */
const DEPRECATED_OPTIONS: ReadonlyMap<string, string> = new Map([
  ['compilerOptions.hydratable', 'Always true in Svelte 5'],
  ['compilerOptions.immutable', 'Use $state runes for reactivity'],
  ['compilerOptions.accessors', 'Use $props rune instead'],
  ['compilerOptions.legacy', 'No legacy mode in Svelte 5'],
  ['kit.browser.hydrate', 'Removed in SvelteKit 2'],
  ['kit.browser.router', 'Use kit.router.type instead'],
  ['kit.vite', 'Use vite.config.js instead'],
  ['kit.package', 'Use svelte-package CLI instead'],
  ['kit.endpointExtensions', 'Removed — use +server.js convention'],
  ['kit.hydrate', 'Removed in SvelteKit 2'],
  ['kit.routes', 'Use route-level config in +page.js instead'],
]);

/** The no-deprecated-options lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/no-deprecated-options',
  description: 'Deprecated Svelte 4 config options should be removed',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);

      if (!configObj) {
        return [];
      }

      const allPaths: string[] = collectPropertyPaths(configObj);
      const results: LintResult[] = [];

      for (const path of allPaths) {
        const reason: string | undefined = DEPRECATED_OPTIONS.get(path);

        if (reason) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: `Deprecated config option '${path}' — ${reason}`,
            ruleId: rule.id,
            tip: `Remove '${path}': ${reason}`,
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
