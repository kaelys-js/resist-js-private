/**
 * Rule: valibot/no-reexport-infer
 *
 * Don't re-export `v.InferOutput`, `v.InferInput`, etc. from valibot.
 * Export concrete types instead so consumers don't depend on valibot
 * internals.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Identifiers that should not be re-exported from valibot. */
const BANNED_REEXPORTS: ReadonlySet<string> = new Set([
  'InferOutput',
  'InferInput',
  'Output',
  'Input',
]);

/** The no-reexport-infer lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'imports'],
  description: 'Do not re-export v.InferOutput/v.InferInput — export concrete types instead',
  id: 'valibot/no-reexport-infer',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const source = node.source as AstNode | undefined;
      const sourceValue: string | undefined = (source as { value?: string } | undefined)?.value;

      // Only check re-exports from valibot
      if (sourceValue !== 'valibot') {
        return results;
      }

      const specifiers = node.specifiers as AstNode[] | undefined;

      if (!specifiers) {
        return results;
      }

      for (const spec of specifiers) {
        const local = spec.local as AstNode | undefined;
        const exported = spec.exported as AstNode | undefined;
        const localName: string = (local?.name as string) ?? '';
        const exportedName: string = (exported?.name as string) ?? localName;

        if (BANNED_REEXPORTS.has(localName) || BANNED_REEXPORTS.has(exportedName)) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: node.start, start: node.start }, text: '' },
            line: node.loc.start.line,
            message: `Do not re-export '${localName}' from valibot — export concrete types instead`,
            ruleId: 'valibot/no-reexport-infer',
            severity: 'error',
            tip: 'Define and export a concrete type alias: export type MyType = v.InferOutput<typeof MySchema>;',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
