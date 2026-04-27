/**
 * Rule: primitives/no-array-hole
 *
 * Detects array holes (sparse arrays) from literal elisions, Array.from({ length: n }),
 * and delete on array indices. Array holes behave differently from undefined
 * and cause subtle bugs.
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
  id: 'primitives/no-array-hole',
  description:
    'Array holes behave differently from undefined - use explicit undefined or remove element',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    ArrayExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const elements = node.elements as (AstNode | null)[] | undefined;
      if (!elements || !Array.isArray(elements)) {
        return results;
      }

      for (const element of elements) {
        if (element === null) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message:
              'Array holes behave differently from undefined - use explicit undefined or remove element',
            ruleId: 'primitives/no-array-hole',
            tip: 'Use explicit undefined values or Array.from/fill to avoid holes',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
          break;
        }
      }

      return results;
    },

    NewExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const calleeRaw: unknown = node.callee;
      if (calleeRaw === null || typeof calleeRaw !== 'object') {
        return results;
      }
      const calleeNode = calleeRaw as AstNode;
      if (calleeNode.type !== 'Identifier' || (calleeNode.name as string) !== 'Array') {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;
      if (args && args.length === 1) {
        const firstArg = args[0] as AstNode;
        if (firstArg.type === 'Literal' && typeof (firstArg.value as unknown) === 'number') {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message: 'Array.from({ length: n }) creates sparse array with holes - use Array.from or fill',
            ruleId: 'primitives/no-array-hole',
            tip: 'Use explicit undefined values or Array.from/fill to avoid holes',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },

    UnaryExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const operator = node.operator as string;
      if (operator !== 'delete') {
        return results;
      }

      const argRaw: unknown = node.argument;
      if (argRaw !== null && typeof argRaw === 'object') {
        const argNode = argRaw as AstNode;
        if (
          (argNode.type === 'MemberExpression' || argNode.type === 'StaticMemberExpression') &&
          (argNode.computed as unknown) === true
        ) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message: 'delete on array creates hole - use splice to remove elements',
            ruleId: 'primitives/no-array-hole',
            tip: 'Use explicit undefined values or Array.from/fill to avoid holes',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
