/**
 * Rule: svelte5-config/prerender-config
 *
 * Static adapter requires prerender configuration for static hosting.
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
  getAdapterImport,
  STATIC_ADAPTERS,
} from './_config-ast.ts';

/** The prerender-config lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/prerender-config',
  description: 'Static adapter requires prerender configuration',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const adapterPkg: string | undefined = getAdapterImport(context.imports);
      if (!adapterPkg || !STATIC_ADAPTERS.has(adapterPkg)) {
        return [];
      }

      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);
      if (!configObj) {
        return [];
      }

      const prerenderValue: AstNode | undefined = getNestedValue(configObj, 'kit.prerender');
      if (prerenderValue) {
        return [];
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Static adapter requires prerender configuration',
          ruleId: rule.id,
          tip: "Add prerender: { entries: ['*'], handleHttpError: 'warn' }",
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};

export default rule;
