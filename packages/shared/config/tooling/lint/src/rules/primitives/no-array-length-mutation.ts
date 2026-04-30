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
  fixable: false,

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
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message: 'Direct .length mutation can lose data or create holes - use slice/splice',
            ruleId: 'primitives/no-array-length-mutation',
            tip: 'Use slice() for immutable truncation, splice() for in-place, or reassign for clear',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
