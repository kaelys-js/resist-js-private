/**
 * Rule: svelte5/no-legacy-props
 *
 * Catches `export let` prop declarations (Svelte 4 syntax). Svelte 5 uses
 * the `$props()` rune instead.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 3
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-legacy-props lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-legacy-props',
  description: "Legacy prop declaration 'export let' - use $props() instead",
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const declaration: AstNode | undefined = node.declaration as AstNode | undefined;

      if (!declaration || declaration.type !== 'VariableDeclaration') {
        return [];
      }

      if ((declaration as { kind?: string }).kind !== 'let') {
        return [];
      }

      const results: LintResult[] = [];
      const declarators: AstNode[] | undefined = declaration.declarations as AstNode[] | undefined;

      if (declarators) {
        for (const declarator of declarators) {
          const id: AstNode | undefined = declarator.id as AstNode | undefined;
          const name: string =
            id?.type === 'Identifier' ? (id as unknown as { name: string }).name : 'unknown';

          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'error',
            message: `Legacy prop declaration 'export let ${name}' - use $props() instead`,
            ruleId: rule.id,
            tip: `Destructure props from $props(): let { ${name} } = $props();`,
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
