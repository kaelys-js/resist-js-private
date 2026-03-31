/**
 * Rule: svelte5-config/csp-headers
 *
 * Warns when `kit.csp` is missing. Production apps should have Content
 * Security Policy configuration for XSS protection.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { getDefaultExportObject, getNestedValue, hasProperty } from './_config-ast.ts';

/** The csp-headers lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/csp-headers',
  description: 'Consider adding CSP configuration for security',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

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

      if (hasProperty(kitObj, 'csp')) {
        return [];
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Consider adding CSP configuration for security',
          ruleId: rule.id,
          tip: "Add csp: { directives: { 'default-src': ['self'], 'script-src': ['self'] } }",
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};

export default rule;
