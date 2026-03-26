/**
 * Rule: valibot/no-class-validator
 *
 * Bans `class-validator` and `class-transformer` imports. Use Valibot for
 * all validation and transformation needs.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-class-validator lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'imports'],
  description: 'Use Valibot instead of class-validator/class-transformer',
  id: 'valibot/no-class-validator',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const source = node.source as AstNode | undefined;
      const value: string | undefined = (source as { value?: string } | undefined)?.value;

      if (value === 'class-validator' || value === 'class-transformer') {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.end, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: 'Use Valibot instead of class-validator/class-transformer',
          ruleId: 'valibot/no-class-validator',
          severity: 'error',
          tip: "Replace with Valibot schemas and import * as v from 'valibot'",
        });
      }

      return results;
    },
  },
};

export default rule;
