/**
 * Rule: valibot/require-generic-schema
 *
 * When a v.strictObject() or v.pipe() schema is used by a generic type alias
 * via v.InferOutput, the schema should be created with generic() from
 * @/schemas/generic to preserve type parameter inference.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /config\/tooling\/lint\//,
];

/** Pattern to extract schema name from v.InferOutput<typeof SchemaName>. */
const INFER_OUTPUT_PATTERN: RegExp = /v\.InferOutput\s*<\s*typeof\s+(\w+)\s*>/;

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'valibot/require-generic-schema',
  description: 'Schemas used by generic types should use generic() from @/schemas/generic',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    TSTypeAliasDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      if (EXEMPT_PATTERNS.some((p: RegExp): boolean => p.test(context.file))) {
        return [];
      }

      // Only check generic type aliases (has typeParameters)
      if (!node.typeParameters) {
        return [];
      }

      // Skip intersection types where InferOutput is one arm — generic params come from the & arm
      const typeAnnotation = node.typeAnnotation as AstNode | undefined;
      if (typeAnnotation?.type === 'TSIntersectionType') {
        return [];
      }

      const typeText: string = context.content.slice(node.start, node.end);
      const inferMatch: RegExpMatchArray | null = typeText.match(INFER_OUTPUT_PATTERN);

      if (!inferMatch) {
        return [];
      }

      const schemaName: string = inferMatch[1];

      // Check if the schema is created with generic()
      const genericPattern: RegExp = new RegExp(
        `(?:const|let)\\s+${schemaName}\\s*=\\s*generic\\s*\\(`,
      );

      if (genericPattern.test(context.content)) {
        return []; // Already uses generic() — good
      }

      // Check if the schema exists in this file (might be imported)
      const schemaDeclarationPattern: RegExp = new RegExp(`(?:const|let)\\s+${schemaName}\\s*=`);

      if (!schemaDeclarationPattern.test(context.content)) {
        return []; // Schema not declared in this file — skip (might be imported as generic)
      }

      const typeName: string = ((node.id as AstNode)?.name as string) ?? '<unknown>';

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Schema '${schemaName}' is used by generic type '${typeName}' — wrap in generic() from @/schemas/generic`,
          ruleId: 'valibot/require-generic-schema',
          tip: `Import { generic } from '@/schemas/generic/generic' and wrap the schema: const ${schemaName} = generic(<T>(...) => v.strictObject({...}))`,
        },
      ];
    },
  },
};

export default rule;
