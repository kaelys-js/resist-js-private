/**
 * Rule: svelte5/prefer-derived-by
 *
 * Catches `$derived()` with complex multi-step logic (3+ chained method calls).
 * `$derived.by()` is clearer for complex derivations with intermediate steps.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 13
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Count the depth of a member expression call chain.
 *
 * For `items.filter(...).sort(...).slice(...)`, returns 3.
 *
 * @param {AstNode} node - A CallExpression node
 * @returns {number} The chain depth
 */
function countCallChainDepth(node: AstNode): number {
  let depth: number = 0;
  let current: AstNode | undefined = node;

  while (current?.type === 'CallExpression') {
    const callee: AstNode | undefined = current.callee as AstNode | undefined;
    if (callee?.type === 'StaticMemberExpression' || callee?.type === 'MemberExpression') {
      depth++;
      const object: AstNode | undefined = callee.object as AstNode | undefined;
      current = object;
    } else {
      break;
    }
  }

  return depth;
}

/** The prefer-derived-by lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/prefer-derived-by',
  description: 'Complex derivation should use $derived.by() for clarity',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const callee: AstNode | undefined = node.callee as AstNode | undefined;
      if (!callee) {
        return [];
      }

      // Only match $derived(), not $derived.by()
      if (callee.type !== 'Identifier' || (callee as { name?: string }).name !== '$derived') {
        return [];
      }

      const args: AstNode[] | undefined = node.arguments as AstNode[] | undefined;
      if (!args || args.length === 0) {
        return [];
      }

      const [arg]: AstNode | undefined = args;
      if (!arg) {
        return [];
      }

      // Check if the argument has 3+ chained method calls
      if (arg.type === 'CallExpression') {
        const chainDepth: number = countCallChainDepth(arg);
        if (chainDepth >= 3) {
          return [
            {
              file: context.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'warning',
              message: 'Complex derivation should use $derived.by() for clarity',
              ruleId: rule.id,
              tip: 'Use $derived.by(() => { ...intermediate steps...; return result; })',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        }
      }

      return [];
    },
  },
};

export default rule;
