/**
 * Rule: valibot/type-alias-from-schema
 *
 * Type aliases for data shapes must be derived from schemas using
 * `v.InferOutput` or `v.InferInput`. Object literal types should use
 * a schema instead; union/intersection/array types get a softer warning.
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

/** The type-alias-from-schema lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Type aliases for data shapes must be derived from schemas using v.InferOutput',
  id: 'valibot/type-alias-from-schema',
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

      // Skip generic type parameters
      const typeParameters = node.typeParameters as AstNode | undefined;
      if (typeParameters) {
        return results;
      }

      // Check if type is derived from valibot
      const nodeText: string = context.getNodeText(node);
      if (
        nodeText.includes('v.InferOutput') ||
        nodeText.includes('v.InferInput') ||
        nodeText.includes('v.Output') ||
        nodeText.includes('v.Input')
      ) {
        return results;
      }

      // Check the type annotation (right side of the = sign)
      const typeAnnotation = node.typeAnnotation as AstNode | undefined;
      if (!typeAnnotation) {
        return results;
      }

      if (typeAnnotation.type === 'TSTypeLiteral') {
        // Object literal type — should use a schema (error)
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `Type '${typeName}' uses an object literal — define a Valibot schema and derive the type with v.InferOutput`,
          ruleId: 'valibot/type-alias-from-schema',
          severity: 'error',
          tip: `Create: const ${typeName}Schema = v.strictObject({ ... }); type ${typeName} = v.InferOutput<typeof ${typeName}Schema>;`,
        });
      } else if (
        typeAnnotation.type === 'TSUnionType' ||
        typeAnnotation.type === 'TSIntersectionType' ||
        typeAnnotation.type === 'TSArrayType'
      ) {
        // Union, intersection, or array type — softer warning
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `Type '${typeName}' should be derived from a Valibot schema using v.InferOutput`,
          ruleId: 'valibot/type-alias-from-schema',
          severity: 'warning',
          tip: `Create a Valibot schema and use: type ${typeName} = v.InferOutput<typeof ${typeName}Schema>;`,
        });
      }

      return results;
    },
  },
};

export default rule;
