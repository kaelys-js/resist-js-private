/**
 * Rule: svelte5-config/trailing-slash-consistency
 *
 * Warns when `kit.trailingSlash` is not explicitly set.
 * Inconsistent trailing slashes cause SEO issues and routing confusion.
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

/** The trailing-slash-consistency lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/trailing-slash-consistency',
  description: 'Trailing slash handling not explicitly configured',
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

      if (hasProperty(kitObj, 'trailingSlash')) {
        return [];
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Trailing slash handling not explicitly configured',
          ruleId: rule.id,
          tip: "Add trailingSlash: 'never' | 'always' | 'ignore' for consistent URL handling",
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};

export default rule;
