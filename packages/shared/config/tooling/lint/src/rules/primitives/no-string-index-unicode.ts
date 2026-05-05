/**
 * Rule: primitives/no-string-index-unicode
 *
 * Flags charAt() usage which operates on UTF-16 code units and may split
 * multi-byte Unicode characters like emoji or CJK characters.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

const rule: TypeScriptRule = {
  id: 'primitives/no-string-index-unicode',
  description: 'String indexing may split unicode characters - use [...str] or for...of',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

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
        /* Fix: str.charAt(i) → [...str][i] */
        let fix = NO_OP_FIX;
        const objRaw: unknown = calleeNode.object;
        const objNode =
          objRaw !== null && typeof objRaw === 'object' ? (objRaw as AstNode) : undefined;

        if (objNode) {
          const objText: string = context.getNodeText(objNode);
          const nodeArgs = node.arguments as AstNode[] | undefined;
          const idxText: string =
            nodeArgs && nodeArgs.length > 0 ? context.getNodeText(nodeArgs[0] as AstNode) : '0';
          fix = {
            range: { start: node.start, end: node.end },
            text: `[...${objText}][${idxText}]`,
          };
        }

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: 'String indexing may split unicode characters - use [...str] or for...of',
          ruleId: 'primitives/no-string-index-unicode',
          tip: 'Use [...str][i] for character access or for...of for iteration',
          fix,
        });
      }

      return results;
    },
  },
};

export default rule;
