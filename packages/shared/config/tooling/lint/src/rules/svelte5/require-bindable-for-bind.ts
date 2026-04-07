/**
 * Rule: svelte5/require-bindable-for-bind
 *
 * Catches props used with `bind:` directive but not declared with `$bindable()`.
 * Two-way binding requires explicit opt-in in Svelte 5.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 7
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { walkNode } from '@/lint/framework/oxc-runner.ts';
import { isRuneCall } from './_svelte-helpers.ts';

/**
 * Collect prop names declared with $bindable() from a $props() destructuring.
 *
 * @param {AstNode} ast - The TypeScript AST root
 * @returns {Set<string>} Set of prop names that use $bindable()
 */
function collectBindableProps(ast: AstNode): Set<string> {
  const bindableProps: Set<string> = new Set<string>();

  walkNode(ast, (node: AstNode): void => {
    if (node.type !== 'VariableDeclarator') {
      return;
    }

    const init: AstNode | undefined = node.init as AstNode | undefined;
    if (!init || !isRuneCall(init, '$props')) {
      return;
    }

    const id: AstNode | undefined = node.id as AstNode | undefined;
    if (!id || id.type !== 'ObjectPattern') {
      return;
    }

    const properties: AstNode[] | undefined = id.properties as AstNode[] | undefined;
    if (!properties) {
      return;
    }

    for (const prop of properties) {
      if (prop.type !== 'AssignmentPattern' && prop.type !== 'Property') {
        continue;
      }

      // For AssignmentPattern: { value = $bindable() } = $props()
      if (prop.type === 'AssignmentPattern') {
        const right: AstNode | undefined = prop.right as AstNode | undefined;
        if (right && isRuneCall(right, '$bindable')) {
          const left: AstNode | undefined = prop.left as AstNode | undefined;
          if (left?.type === 'Identifier') {
            bindableProps.add((left as unknown as { name: string }).name);
          }
        }
        continue;
      }

      // For Property with default: { value = $bindable() }
      if (prop.type === 'Property') {
        const value: AstNode | undefined = prop.value as AstNode | undefined;
        if (value?.type === 'AssignmentPattern') {
          const right: AstNode | undefined = value.right as AstNode | undefined;
          if (right && isRuneCall(right, '$bindable')) {
            const key: AstNode | undefined = prop.key as AstNode | undefined;
            if (key?.type === 'Identifier') {
              bindableProps.add((key as unknown as { name: string }).name);
            }
          }
        }
      }
    }
  });

  return bindableProps;
}

/** The require-bindable-for-bind lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/require-bindable-for-bind',
  description: 'Props used with bind: must be declared as $bindable()',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    BindDirective(node: AstNode, context: VisitorContext): LintResult[] {
      const bindName: string | undefined = (node as { name?: string }).name;
      if (!bindName) {
        return [];
      }

      // Collect $bindable() props from the script AST
      const bindableProps: Set<string> = collectBindableProps(context.ast);

      // If this bound prop is not declared as $bindable(), report
      if (bindableProps.has(bindName)) {
        return [];
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Prop '${bindName}' used with bind: but not declared as $bindable()`,
          ruleId: rule.id,
          tip: `Declare as: let { ${bindName} = $bindable() } = $props();`,
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};

export default rule;
