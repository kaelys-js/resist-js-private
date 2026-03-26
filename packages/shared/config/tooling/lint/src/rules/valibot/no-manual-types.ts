/**
 * Rule: valibot/no-manual-types
 *
 * Flags hand-written object literal type aliases that lack a corresponding
 * Valibot schema. Data shapes should be defined as schemas with types
 * derived via `v.InferOutput`.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Suffixes that indicate a type is not a data shape requiring a schema. */
const ALLOWED_SUFFIXES: readonly string[] = [
  'Callback',
  'Config',
  'Context',
  'Event',
  'Handler',
  'Options',
  'Props',
  'Ref',
  'State',
];

/** The no-manual-types lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Object literal type aliases should have a corresponding Valibot schema',
  id: 'valibot/no-manual-types',
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

      // Skip allowed suffixes
      if (ALLOWED_SUFFIXES.some((suffix: string): boolean => typeName.endsWith(suffix))) {
        return results;
      }

      // Skip generic types (has typeParameters)
      const typeParameters = node.typeParameters as AstNode | undefined;
      if (typeParameters) {
        return results;
      }

      // Skip types derived from valibot (v.InferOutput, v.InferInput)
      const nodeText: string = context.getNodeText(node);
      if (
        nodeText.includes('v.InferOutput') ||
        nodeText.includes('v.InferInput') ||
        nodeText.includes('v.Output') ||
        nodeText.includes('v.Input')
      ) {
        return results;
      }

      // Only flag types with TSTypeLiteral annotation (object literal types)
      const typeAnnotation = node.typeAnnotation as AstNode | undefined;
      if (!typeAnnotation || typeAnnotation.type !== 'TSTypeLiteral') {
        return results;
      }

      // Skip if a matching schema exists in file content
      const expectedSchema: string = `${typeName}Schema`;
      if (context.content.includes(expectedSchema)) {
        return results;
      }

      results.push({
        column: node.loc.start.column + 1,
        file: context.file,
        fix: { range: { end: node.start, start: node.start }, text: '' },
        line: node.loc.start.line,
        message: `Type '${typeName}' is an object literal without a corresponding '${expectedSchema}' — define a Valibot schema instead`,
        ruleId: 'valibot/no-manual-types',
        severity: 'warning',
        tip: `Create: const ${expectedSchema} = v.strictObject({ ... }); export type ${typeName} = v.InferOutput<typeof ${expectedSchema}>;`,
      });

      return results;
    },
  },
};

export default rule;
