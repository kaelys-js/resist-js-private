/**
 * Rule: valibot/import-type-only
 *
 * When importing type-only identifiers from valibot (like `InferOutput`,
 * `InferInput`, `BaseSchema`, etc.), use `import type` to ensure they are
 * erased at compile time.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Identifiers from valibot that are always types. */
const TYPE_IDENTIFIERS: ReadonlySet<string> = new Set([
  'InferOutput',
  'InferInput',
  'Output',
  'Input',
  'BaseSchema',
  'BaseSchemaAsync',
  'GenericSchema',
  'GenericSchemaAsync',
]);

/** The import-type-only lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'imports'],
  description: 'When importing types from valibot, use import type',
  id: 'valibot/import-type-only',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const source = node.source as AstNode | undefined;
      const value: string | undefined = (source as { value?: string } | undefined)?.value;

      if (value !== 'valibot') {
        return results;
      }

      // Already a type-only import — nothing to do
      if (node.importKind === 'type') {
        return results;
      }

      const specifiers = node.specifiers as AstNode[] | undefined;

      if (!specifiers || specifiers.length === 0) {
        return results;
      }

      // Skip namespace imports (import * as v from 'valibot')
      const hasNamespace: boolean = specifiers.some(
        (s: AstNode): boolean => s.type === 'ImportNamespaceSpecifier',
      );

      if (hasNamespace) {
        return results;
      }

      // Check if ALL specifiers are type identifiers
      const allTypes: boolean = specifiers.every((s: AstNode): boolean => {
        const imported = s.imported as AstNode | undefined;
        const name: string = (imported?.name as string) ?? '';

        return TYPE_IDENTIFIERS.has(name);
      });

      if (allTypes) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: 'Import type-only identifiers from valibot using import type',
          ruleId: 'valibot/import-type-only',
          severity: 'warning',
          tip: "Replace with: import type { ... } from 'valibot'",
        });
      }

      return results;
    },
  },
};

export default rule;
