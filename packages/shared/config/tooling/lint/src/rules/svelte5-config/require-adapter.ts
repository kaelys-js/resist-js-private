/**
 * Rule: svelte5-config/require-adapter
 *
 * SvelteKit config must have `kit.adapter` specified. Without an adapter,
 * `svelte-kit build` fails.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import {
  getDefaultExportObject,
  getNestedValue,
  hasProperty,
  isUndefinedValue,
} from './_config-ast.ts';

/** The require-adapter lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/require-adapter',
  description: 'SvelteKit config missing adapter — build will fail without one',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);

      if (!configObj) {
        return [];
      }

      const kitObj: AstNode | undefined = getNestedValue(configObj, 'kit');

      if (!kitObj || kitObj.type !== 'ObjectExpression') {
        return [];
      }

      const adapterValue: AstNode | undefined = getNestedValue(kitObj, 'adapter');

      if (!hasProperty(kitObj, 'adapter') || !adapterValue || isUndefinedValue(adapterValue)) {
        /* Fix: insert adapter property into kit object */
        const fix = {
          range: { start: kitObj.end - 1, end: kitObj.end - 1 },
          text: ',\n    adapter: adapter()\n  ',
        };

        return [
          {
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: 'SvelteKit config missing adapter — build will fail without one',
            ruleId: rule.id,
            tip: "Add adapter: import adapter from '@sveltejs/adapter-cloudflare'; then adapter: adapter()",
            fix,
          },
        ];
      }

      return [];
    },
  },
};

export default rule;
