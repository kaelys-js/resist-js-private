/**
 * Rule: svelte5-config/require-runes-mode
 *
 * Svelte 5 projects should have `compilerOptions.runes: true` explicitly
 * enabled to avoid legacy mode confusion.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { getDefaultExportObject, getNestedValue, isBooleanLiteral } from './_config-ast.ts';

/** The require-runes-mode lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/require-runes-mode',
  description: 'Svelte 5 project should have compilerOptions.runes: true',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);

      if (!configObj) {
        return [];
      }

      const runesValue: AstNode | undefined = getNestedValue(configObj, 'compilerOptions.runes');

      if (!runesValue || !isBooleanLiteral(runesValue, true)) {
        return [
          {
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message: 'Svelte 5 project should have compilerOptions.runes: true',
            ruleId: rule.id,
            tip: 'Add compilerOptions: { runes: true } to enable Svelte 5 runes',
            fix: { range: { start: 0, end: 0 }, text: '' },
          },
        ];
      }

      return [];
    },
  },
};

export default rule;
