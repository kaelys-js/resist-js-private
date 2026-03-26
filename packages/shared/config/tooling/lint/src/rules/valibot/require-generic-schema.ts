/**
 * Rule: valibot/require-generic-schema
 *
 * When a v.strictObject() or v.pipe() schema is used by a generic type alias
 * via v.InferOutput, the schema should be created with generic() from
 * `@/schemas/generic` to preserve type parameter inference.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

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
  categories: ['valibot'],
  description: 'Schemas used by generic types should use generic() from @/schemas/generic',
  id: 'valibot/require-generic-schema',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

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

      const schemaName: string = inferMatch[1] ?? '';

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
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.end, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `Schema '${schemaName}' is used by generic type '${typeName}' — wrap in generic() from @/schemas/generic`,
          ruleId: 'valibot/require-generic-schema',
          severity: 'error',
          tip: `Import { generic } from '@/schemas/generic/generic' and wrap the schema: const ${schemaName} = generic(<T>(...) => v.strictObject({...}))`,
        },
      ];
    },
  },
};

export default rule;
