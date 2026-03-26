/**
 * Rule: valibot/no-yup
 *
 * Bans `yup` imports. Use Valibot for all validation needs.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-yup lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'imports'],
  description: 'Use Valibot instead of Yup',
  id: 'valibot/no-yup',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const source = node.source as AstNode | undefined;
      const value: string | undefined = (source as { value?: string } | undefined)?.value;

      if (value === 'yup' || (value && value.startsWith('yup/'))) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.end, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: 'Use Valibot instead of Yup',
          ruleId: 'valibot/no-yup',
          severity: 'error',
          tip: "Replace with Valibot schemas and import * as v from 'valibot'",
        });
      }

      return results;
    },
  },
};

export default rule;
