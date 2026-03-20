/**
 * Rule: typescript/no-bare-data-types
 *
 * Forbids `interface` declarations and `type X = { ... }` bare object types.
 * Data types must be derived from Valibot schemas using `v.InferOutput<>`.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File paths exempt from this rule (tooling, test harness, etc.). */
const EXEMPT_PATHS: readonly RegExp[] = [
  /config\/tooling\/lint\/src\/framework\//,
  /config\/tooling\/vite\//,
  /config\/tooling\/svelte\//,
  /config\/test\/src\/harness\//,
  /extensions\/vscode/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

/**
 * Check if a file path is exempt from this rule.
 *
 * @param {string} filePath - The file path
 * @returns {boolean} Whether the file is exempt
 */
function isExemptFile(filePath: string): boolean {
  return EXEMPT_PATHS.some((p: RegExp): boolean => p.test(filePath));
}

const rule: TypeScriptRule = {
  id: 'typescript/no-bare-data-types',
  description: 'Data types must use Valibot schemas, not interface/type literals',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    TSInterfaceDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      if (isExemptFile(context.file)) return [];

      const name: string = ((node.id as AstNode)?.name as string) ?? 'unknown';

      // Check if the interface extends a Valibot base type
      const bodyText: string = context.content.slice(
        Math.max(0, node.start - 5),
        Math.min(context.content.length, node.end + 5),
      );
      if (/extends\s+.*(?:Base|Valibot|Schema)/.test(bodyText)) return [];

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: `Interface '${name}' should be a Valibot schema with v.InferOutput<>`,
          ruleId: 'typescript/no-bare-data-types',
          tip: 'Define a Valibot schema and derive the type: type X = v.InferOutput<typeof XSchema>',
          fix: {
            range: { start: node.start, end: node.end },
            text: `const ${name}Schema = v.strictObject({ /* fields */ });\ntype ${name} = v.InferOutput<typeof ${name}Schema>;`,
          },
        },
      ];
    },

    TSTypeAliasDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      if (isExemptFile(context.file)) return [];

      const typeAnnotation = node.typeAnnotation as AstNode | undefined;
      if (!typeAnnotation) return [];

      // Only flag bare object literal types: type X = { ... }
      if (typeAnnotation.type !== 'TSTypeLiteral') return [];

      const name: string = ((node.id as AstNode)?.name as string) ?? 'unknown';

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: `Type '${name}' uses bare object literal — use Valibot schema instead`,
          ruleId: 'typescript/no-bare-data-types',
          tip: 'Define a Valibot schema and derive the type: type X = v.InferOutput<typeof XSchema>',
          fix: {
            range: { start: node.start, end: node.end },
            text: `const ${name}Schema = v.strictObject({ /* fields */ });\ntype ${name} = v.InferOutput<typeof ${name}Schema>;`,
          },
        },
      ];
    },
  },
};

export default rule;
