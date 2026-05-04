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
  fixable: true,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);

      if (!configObj) {
        return [];
      }

      const runesValue: AstNode | undefined = getNestedValue(configObj, 'compilerOptions.runes');

      if (!runesValue || !isBooleanLiteral(runesValue, true)) {
        /* Fix: ensure compilerOptions.runes = true */
        let fix = { range: { start: 0, end: 0 }, text: '' };

        if (runesValue) {
          /* runes exists but is false — replace with true */
          fix = { range: { start: runesValue.start, end: runesValue.end }, text: 'true' };
        } else {
          const compilerOpts: AstNode | undefined = getNestedValue(configObj, 'compilerOptions');

          if (compilerOpts && compilerOpts.type === 'ObjectExpression') {
            /* compilerOptions exists — insert runes: true */
            fix = {
              range: { start: compilerOpts.end - 1, end: compilerOpts.end - 1 },
              text: ', runes: true ',
            };
          } else if (configObj.type === 'ObjectExpression') {
            /* No compilerOptions — insert full block into config */
            fix = {
              range: { start: configObj.end - 1, end: configObj.end - 1 },
              text: ',\n  compilerOptions: { runes: true }\n',
            };
          }
        }

        return [
          {
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message: 'Svelte 5 project should have compilerOptions.runes: true',
            ruleId: rule.id,
            tip: 'Add compilerOptions: { runes: true } to enable Svelte 5 runes',
            fix,
          },
        ];
      }

      return [];
    },
  },
};

export default rule;
