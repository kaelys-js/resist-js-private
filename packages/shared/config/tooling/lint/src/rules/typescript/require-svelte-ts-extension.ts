/**
 * Rule: typescript/require-svelte-ts-extension
 *
 * Files using Svelte runes ($state, $derived, $effect, $props, $bindable)
 * must use the .svelte.ts extension.
 *
 * @module
 */
import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Svelte 5 rune identifiers that require `.svelte.ts` file extension. */
const SVELTE_RUNES: ReadonlySet<string> = new Set([
  '$state',
  '$derived',
  '$effect',
  '$props',
  '$bindable',
  '$inspect',
  '$host',
]);

function findRuneCall(node: AstNode): AstNode | null {
  if (node.type === 'CallExpression') {
    const callee = node.callee as AstNode | undefined;
    if (callee?.type === 'Identifier') {
      const name = (callee.name as string) ?? '';
      if (SVELTE_RUNES.has(name)) return node;
    }
  }
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const val = node[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'object' && 'type' in item) {
          const found = findRuneCall(item as AstNode);
          if (found) return found;
        }
      }
    } else if (val && typeof val === 'object' && 'type' in val) {
      const found = findRuneCall(val as AstNode);
      if (found) return found;
    }
  }
  return null;
}

/** The require-svelte-ts-extension lint rule. */
const rule: TypeScriptRule = {
  id: 'typescript/require-svelte-ts-extension',
  description: 'Files using Svelte runes must use .svelte.ts extension',
  patterns: ['**/*.ts'],
  categories: ['typescript', 'naming'],
  stages: ['lint', 'ci'],
  fixable: false,
  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      if (context.file.endsWith('.svelte.ts')) return [];
      const runeCall = findRuneCall(node);
      if (!runeCall) return [];
      const callee = runeCall.callee as AstNode;
      const name = (callee.name as string) ?? '$state';
      return [
        {
          file: context.file,
          line: runeCall.loc.start.line,
          column: runeCall.loc.start.column + 1,
          severity: 'error',
          message: `Svelte rune '${name}()' requires .svelte.ts extension`,
          ruleId: 'typescript/require-svelte-ts-extension',
          tip: 'Rename this file from .ts to .svelte.ts',
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    },
  },
};
export default rule;
