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

      if (hasProperty(kitObj, 'csp')) {
        return [];
      }

      /* Fix: insert csp property before closing } of kit object */
      const fix = {
        range: { start: kitObj.end - 1, end: kitObj.end - 1 },
        text: ",\n    csp: { directives: { 'default-src': ['self'] } }\n  ",
      };

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Consider adding CSP configuration for security',
          ruleId: rule.id,
          tip: "Add csp: { directives: { 'default-src': ['self'], 'script-src': ['self'] } }",
          fix,
        },
      ];
    },
  },
};

export default rule;
