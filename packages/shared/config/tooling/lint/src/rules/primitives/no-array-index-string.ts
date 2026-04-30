/**
 * Rule: primitives/no-array-index-string
 *
 * Detects string indexing on arrays (e.g. arr["foo"] = 1), which creates
 * an object property rather than an array element, leading to length
 * discrepancies and iteration bugs.
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
  id: 'primitives/no-array-index-string',
  description: 'String index on array creates object property, not array element',
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

      if (
        (left.type === 'MemberExpression' || left.type === 'StaticMemberExpression') &&
        (left.computed as unknown) === true
      ) {
        const propRaw: unknown = left.property;

        if (propRaw !== null && typeof propRaw === 'object') {
          const propNode = propRaw as AstNode;

          if (propNode.type === 'Literal' && typeof (propNode.value as unknown) === 'string') {
            const value = propNode.value as string;
            const isValidInteger = /^\d+$/.test(value);

            if (!isValidInteger) {
              results.push({
                file: context.file,
                line: node.loc.start.line,
                column: node.loc.start.column + 1,
                severity: 'warning',
                message: 'String index on array creates object property, not array element',
                ruleId: 'primitives/no-array-index-string',
                tip: 'Use numeric indices for arrays, or use object/Map for string keys',
                fix: { range: { start: 0, end: 0 }, text: '' },
              });
            }
          }
        }
      }

      return results;
    },
  },
};

export default rule;
