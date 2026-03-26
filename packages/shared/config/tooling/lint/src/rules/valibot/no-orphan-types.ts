/**
 * Rule: valibot/no-orphan-types
 *
 * Type aliases for data shapes should have corresponding Valibot schemas.
 * Only flags types with `TSTypeLiteral` annotation (object literal types)
 * that are not derived from valibot and do not match allowed patterns.
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
  'Props',
  'State',
  'Context',
  'Ref',
  'Event',
  'Handler',
  'Callback',
  'Options',
  'Config',
];

/** The no-orphan-types lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Type aliases for data shapes should have corresponding Valibot schemas',
  id: 'valibot/no-orphan-types',
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

      // Skip allowed patterns
      if (ALLOWED_SUFFIXES.some((suffix: string): boolean => typeName.endsWith(suffix))) {
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

      // Skip generic type parameters (type has typeParameters)
      const typeParameters = node.typeParameters as AstNode | undefined;
      if (typeParameters) {
        return results;
      }

      // Only flag types with TSTypeLiteral annotation (object literal types)
      const typeAnnotation = node.typeAnnotation as AstNode | undefined;
      if (!typeAnnotation || typeAnnotation.type !== 'TSTypeLiteral') {
        return results;
      }

      // Check if a schema named <TypeName>Schema exists in the file content
      const expectedSchema: string = `${typeName}Schema`;
      if (context.content.includes(expectedSchema)) {
        return results;
      }

      results.push({
        column: node.loc.start.column + 1,
        file: context.file,
        fix: { range: { end: node.start, start: node.start }, text: '' },
        line: node.loc.start.line,
        message: `Type '${typeName}' is an object literal without a corresponding '${expectedSchema}' — consider creating a Valibot schema`,
        ruleId: 'valibot/no-orphan-types',
        severity: 'warning',
        tip: `Create: const ${expectedSchema} = v.strictObject({ ... }); export type ${typeName} = v.InferOutput<typeof ${expectedSchema}>;`,
      });

      return results;
    },
  },
};

export default rule;
