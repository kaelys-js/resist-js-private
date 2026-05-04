/**
 * Rule: svelte5/no-inline-styles
 *
 * Catches `style=""` attributes with hardcoded values in templates.
 * Prefer CSS classes, CSS variables, or `style:` directives.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 16
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-inline-styles lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-inline-styles',
  description: 'Avoid inline styles - use CSS classes or style: directives',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    Attribute(node: AstNode, context: VisitorContext): LintResult[] {
      const attrName: string | undefined = (node as { name?: string }).name;

      if (attrName !== 'style') {
        return [];
      }

      // Check if the value is a literal string (hardcoded)
      const { value } = node;

      if (!Array.isArray(value)) {
        return [];
      }

      // If all value parts are Text nodes, it's a hardcoded style
      const allText: boolean = (value as AstNode[]).every(
        (v: AstNode): boolean => v.type === 'Text',
      );

      if (!allText) {
        return [];
      }

      /* Fix: convert style="prop: value; ..." to style:prop="value" directives */
      let fix = { range: { start: 0, end: 0 }, text: '' };
      const styleText: string = (value as AstNode[])
        .map((v: AstNode): string => (v as { data?: string }).data ?? '')
        .join('');
      const declarations: string[] = styleText
        .split(';')
        .map((s: string): string => s.trim())
        .filter(Boolean);

      if (declarations.length > 0) {
        const directives: string = declarations
          .map((decl: string): string => {
            const colonIdx: number = decl.indexOf(':');

            if (colonIdx === -1) {
              return '';
            }

            const prop: string = decl.slice(0, colonIdx).trim();
            const val: string = decl.slice(colonIdx + 1).trim();

            return `style:${prop}="${val}"`;
          })
          .filter(Boolean)
          .join(' ');

        if (directives) {
          fix = { range: { start: node.start, end: node.end }, text: directives };
        }
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'Avoid inline styles - use CSS classes or style: directives',
          ruleId: rule.id,
          tip: 'Extract to CSS class or use style:property={value} for dynamic values',
          fix,
        },
      ];
    },
  },
};

export default rule;
