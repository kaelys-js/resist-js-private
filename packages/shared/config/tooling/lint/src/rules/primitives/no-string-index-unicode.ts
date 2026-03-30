/**
 * Rule: primitives/no-string-index-unicode
 *
 * Flags charAt() usage which operates on UTF-16 code units and may split
 * multi-byte Unicode characters like emoji or CJK characters.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

const rule: TypeScriptRule = {
  id: 'primitives/no-string-index-unicode',
  description: 'String indexing may split unicode characters - use [...str] or for...of',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const calleeRaw: unknown = node.callee;
      const calleeNode =
        calleeRaw !== null && typeof calleeRaw === 'object' ? (calleeRaw as AstNode) : undefined;
      const calleePropRaw: unknown = calleeNode?.property;
      const calleePropNode =
        calleePropRaw !== null && typeof calleePropRaw === 'object'
          ? (calleePropRaw as AstNode)
          : undefined;
      const calleePropName = calleePropNode?.name as string | undefined;

      if (
        calleeNode &&
        calleeNode.type === 'MemberExpression' &&
        calleePropNode &&
        calleePropName === 'charAt'
      ) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'String indexing may split unicode characters - use [...str] or for...of',
          ruleId: 'primitives/no-string-index-unicode',
          tip: 'Use [...str][i] for character access or for...of for iteration',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
