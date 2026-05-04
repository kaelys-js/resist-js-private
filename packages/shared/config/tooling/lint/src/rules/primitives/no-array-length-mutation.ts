/**
 * Rule: primitives/no-array-length-mutation
 *
 * Detects direct assignment to .length on arrays, which can silently
 * truncate data or create sparse holes.
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
  id: 'primitives/no-array-length-mutation',
  description: 'Direct .length mutation can lose data or create holes - use slice/splice',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    AssignmentExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const leftRaw: unknown = node.left;

      if (!leftRaw || typeof leftRaw !== 'object') {
        return results;
      }

      const left = leftRaw as AstNode;

      if (left.type === 'MemberExpression' || left.type === 'StaticMemberExpression') {
        const propRaw: unknown = left.property;
        const propNode =
          propRaw !== null && typeof propRaw === 'object' ? (propRaw as AstNode) : undefined;

        if (propNode && propNode.type === 'Identifier' && (propNode.name as string) === 'length') {
          /* Build fix for arr.length = 0 → arr.splice(0) */
          const rightRaw: unknown = node.right;
          const rightNode =
            rightRaw !== null && typeof rightRaw === 'object' ? (rightRaw as AstNode) : undefined;
          const isZero: boolean =
            rightNode?.type === 'Literal' && (rightNode.value as unknown) === 0;

          let fix = { range: { start: 0, end: 0 }, text: '' };

          if (isZero) {
            const objRaw: unknown = left.object;
            const objNode =
              objRaw !== null && typeof objRaw === 'object' ? (objRaw as AstNode) : undefined;

            if (objNode) {
              const objText: string = context.getNodeText(objNode);
              fix = { range: { start: node.start, end: node.end }, text: `${objText}.splice(0)` };
            }
          }

          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message: 'Direct .length mutation can lose data or create holes - use slice/splice',
            ruleId: 'primitives/no-array-length-mutation',
            tip: 'Use slice() for immutable truncation, splice() for in-place, or reassign for clear',
            fix,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
