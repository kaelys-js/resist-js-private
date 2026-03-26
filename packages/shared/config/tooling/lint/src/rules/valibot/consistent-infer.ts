/**
 * Rule: valibot/consistent-infer
 *
 * Use `v.InferOutput` consistently; flag `v.InferInput` unless the type name
 * contains "Input". This keeps the codebase consistent and avoids accidental
 * use of the input type when the output type was intended.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The consistent-infer lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'imports'],
  description:
    'Use v.InferOutput consistently; flag v.InferInput unless type name contains "Input"',
  id: 'valibot/consistent-infer',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    TSTypeAliasDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const id = node.id as AstNode | undefined;
      const typeName: string = (id?.name as string) ?? '';
      if (!typeName) {
        return results;
      }

      const nodeText: string = context.getNodeText(node);

      // If it uses v.InferInput but the type name does NOT contain 'Input', warn
      if (nodeText.includes('v.InferInput') && !typeName.includes('Input')) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `Type '${typeName}' uses v.InferInput but the name does not contain 'Input' — use v.InferOutput instead`,
          ruleId: 'valibot/consistent-infer',
          severity: 'warning',
          tip: 'Replace v.InferInput with v.InferOutput, or rename the type to include "Input"',
        });
      }

      return results;
    },
  },
};

export default rule;
