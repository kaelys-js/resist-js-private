/**
 * Rule: svelte5/require-snippet-typing
 *
 * Catches snippet props used with `{@render}` but not typed as `Snippet`.
 * Type safety for render functions in TypeScript Svelte files.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 11
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
import { walkSvelteNode } from '@/lint/framework/svelte-template.ts';
import { isRuneCall } from './_svelte-helpers.ts';

/**
 * Check if a file has `lang="ts"` on its script tag.
 *
 * @param {string} content - Full svelte file content
 * @returns {boolean} Whether the file uses TypeScript
 */
function isTypeScriptFile(content: string): boolean {
  return /^<script\s[^>]*lang\s*=\s*["']ts["']/m.test(content);
}

/**
 * Collect rendered snippet prop names from the template AST.
 *
 * @param {AstNode} templateAst - Svelte template AST
 * @returns {Set<string>} Set of prop names used with {@render}
 */
function collectRenderedProps(templateAst: AstNode): Set<string> {
  const rendered: Set<string> = new Set<string>();

  walkSvelteNode(templateAst, (node: AstNode): void => {
    if (node.type !== 'RenderTag') {
      return;
    }

    const expression: AstNode | undefined = node.expression as AstNode | undefined;

    if (!expression) {
      return;
    }

    // {@render children()} — expression is CallExpression with Identifier callee
    if (expression.type === 'CallExpression') {
      const callee: AstNode | undefined = expression.callee as AstNode | undefined;

      if (callee?.type === 'Identifier') {
        rendered.add((callee as unknown as { name: string }).name);
      }
    }

    // {@render children?.()} — expression is ChainExpression > CallExpression
    if (expression.type === 'ChainExpression') {
      const inner: AstNode | undefined = expression.expression as AstNode | undefined;

      if (inner?.type === 'CallExpression') {
        const callee: AstNode | undefined = inner.callee as AstNode | undefined;

        if (callee?.type === 'Identifier') {
          rendered.add((callee as unknown as { name: string }).name);
        }
      }
    }
  });

  return rendered;
}

/**
 * Check if a prop name is typed as Snippet in the $props() type annotation.
 *
 * @param {AstNode} ast - TypeScript AST
 * @param {string} propName - The prop name to check
 * @returns {boolean} Whether the prop is typed as Snippet
 */
function isPropTypedAsSnippet(ast: AstNode, propName: string): boolean {
  let found: boolean = false;

  walkNode(ast, (node: AstNode): void => {
    if (node.type !== 'VariableDeclarator') {
      return;
    }

    const init: AstNode | undefined = node.init as AstNode | undefined;

    if (!init || !isRuneCall(init, '$props')) {
      return;
    }

    // Check for type annotation on the destructuring
    const id: AstNode | undefined = node.id as AstNode | undefined;

    if (!id) {
      return;
    }

    const typeAnnotation: AstNode | undefined = id.typeAnnotation as AstNode | undefined;

    if (!typeAnnotation) {
      return;
    }

    // Check if the type mentions 'Snippet' for this prop
    const typeText: string = JSON.stringify(typeAnnotation);

    if (typeText.includes('Snippet') && typeText.includes(propName)) {
      found = true;
    }
  });

  return found;
}

/** The require-snippet-typing lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/require-snippet-typing',
  description: 'Snippet props should be typed as Snippet or Snippet<[...]>',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      if (!context.templateAst) {
        return [];
      }

      // Only check TypeScript files — use originalContent to see the script tag
      const fileContent: string = context.originalContent ?? context.content;

      if (!isTypeScriptFile(fileContent)) {
        return [];
      }

      const renderedProps: Set<string> = collectRenderedProps(context.templateAst);

      if (renderedProps.size === 0) {
        return [];
      }

      const results: LintResult[] = [];

      for (const propName of renderedProps) {
        if (!isPropTypedAsSnippet(context.ast, propName)) {
          results.push({
            file: context.file,
            line: 1,
            column: 1,
            severity: 'warning',
            message: `Snippet prop '${propName}' should be typed as Snippet or Snippet<[...]>`,
            ruleId: rule.id,
            tip: `Import { Snippet } from 'svelte' and type as: ${propName}: Snippet`,
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
