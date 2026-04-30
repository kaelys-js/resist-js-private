/**
 * Rule: svelte5-config/version-skew-handling
 *
 * Warns when `kit.version` is missing or has no `pollInterval`.
 * Version config helps handle deployment updates gracefully.
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

/** The version-skew-handling lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/version-skew-handling',
  description: 'Consider adding version config for deployment updates',
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

      const versionObj: AstNode | undefined = getNestedValue(kitObj, 'version');

      // No version config at all
      if (!versionObj) {
        return [
          {
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message: 'Consider adding version config for deployment updates',
            ruleId: rule.id,
            tip: 'Add version: { name: process.env.COMMIT_SHA, pollInterval: 60000 }',
            fix: { range: { start: 0, end: 0 }, text: '' },
          },
        ];
      }

      // Version without pollInterval
      if (versionObj.type === 'ObjectExpression' && !hasProperty(versionObj, 'pollInterval')) {
        return [
          {
            file: context.file,
            line: versionObj.loc.start.line,
            column: versionObj.loc.start.column + 1,
            severity: 'warning',
            message: 'Version config missing pollInterval — stale clients will not detect updates',
            ruleId: rule.id,
            tip: 'Add pollInterval: 60000 to check for updates every minute',
            fix: { range: { start: 0, end: 0 }, text: '' },
          },
        ];
      }

      return [];
    },
  },
};

export default rule;
