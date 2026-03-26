/**
 * Rule: valibot/no-inline-infer
 *
 * Don't use `v.InferOutput<>` or `v.InferInput<>` inline in function
 * parameters or return types. Declare a type alias instead for readability
 * and reuse.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-inline-infer lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'readability'],
  description: 'Do not use v.InferOutput<> inline in function signatures — declare a type alias',
  id: 'valibot/no-inline-infer',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const nodeText: string = context.getNodeText(node);

      // Look for v.InferOutput or v.InferInput in the function signature
      // We check the params and return type by examining the function text
      // up to the opening brace
      const braceIndex: number = nodeText.indexOf('{');
      if (braceIndex === -1) {
        return results;
      }

      const hasInlineInfer: boolean =
        nodeText.slice(0, braceIndex).includes('v.InferOutput<') ||
        nodeText.slice(0, braceIndex).includes('v.InferInput<');

      if (hasInlineInfer) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: 'Do not use v.InferOutput<>/v.InferInput<> inline in function signatures',
          ruleId: 'valibot/no-inline-infer',
          severity: 'warning',
          tip: 'Declare a type alias: type MyType = v.InferOutput<typeof MySchema>; then use MyType in the signature',
        });
      }

      return results;
    },
  },
};

export default rule;
