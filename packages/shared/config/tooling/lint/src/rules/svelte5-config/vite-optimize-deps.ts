/**
 * Rule: svelte5-config/vite-optimizeDeps
 *
 * Warns when `vite.config` excludes Svelte packages from `optimizeDeps`.
 * Svelte and SvelteKit packages should be optimized, not excluded.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { getDefaultExportObject, getNestedValue, getStringValue } from './_config-ast.ts';

/** Packages that should NOT be excluded from optimizeDeps. */
const SVELTE_PACKAGES: ReadonlySet<string> = new Set([
  'svelte',
  '@sveltejs/kit',
  '@sveltejs/vite-plugin-svelte',
]);

/** The vite-optimizeDeps lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/vite-optimizeDeps',
  description: 'Svelte packages should not be excluded from Vite optimizeDeps',
  patterns: ['**/vite.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);

      if (!configObj) {
        return [];
      }

      const excludeValue: AstNode | undefined = getNestedValue(configObj, 'optimizeDeps.exclude');

      if (!excludeValue || excludeValue.type !== 'ArrayExpression') {
        return [];
      }

      const elements: AstNode[] | undefined = excludeValue.elements as AstNode[] | undefined;

      if (!elements) {
        return [];
      }

      const results: LintResult[] = [];

      for (const el of elements) {
        if (!el) {
          continue;
        }

        const pkg: string | undefined = getStringValue(el);

        if (pkg && SVELTE_PACKAGES.has(pkg)) {
          /* Fix: remove the element from the exclude array */
          const afterEl: string = context.content.slice(el.end, el.end + 20);
          const commaMatch: RegExpExecArray | null = /^\s*,/.exec(afterEl);
          const endOffset: number = commaMatch ? el.end + commaMatch[0].length : el.end;

          results.push({
            file: context.file,
            line: el.loc.start.line,
            column: el.loc.start.column + 1,
            severity: 'warning',
            message: `Package '${pkg}' should not be excluded from optimizeDeps`,
            ruleId: rule.id,
            tip: `Move '${pkg}' from optimizeDeps.exclude to optimizeDeps.include`,
            fix: { range: { start: el.start, end: endOffset }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
