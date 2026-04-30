/**
 * Rule: primitives/no-date-mutation
 *
 * Detects usage of Date mutation methods (setFullYear, setMonth, etc.) which
 * are error-prone and can cause subtle bugs with month overflow.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

const DATE_MUTATION_METHODS = new Set([
  'setFullYear',
  'setMonth',
  'setDate',
  'setHours',
  'setMinutes',
  'setSeconds',
  'setMilliseconds',
  'setTime',
]);

const rule: TypeScriptRule = {
  id: 'primitives/no-date-mutation',
  description: 'Date mutation methods are error-prone - create new Date or use date-fns',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const calleeRaw: unknown = node.callee;

      if (calleeRaw === null || typeof calleeRaw !== 'object') {
        return results;
      }

      const callee = calleeRaw as AstNode;

      if (callee.type !== 'MemberExpression' && callee.type !== 'StaticMemberExpression') {
        return results;
      }

      const propertyRaw: unknown = callee.property;
      const propertyNode =
        propertyRaw !== null && typeof propertyRaw === 'object'
          ? (propertyRaw as AstNode)
          : undefined;
      let propertyName: string | undefined;

      if (propertyNode?.type === 'Identifier') {
        propertyName = propertyNode.name as string;
      } else if (propertyNode?.type === 'Literal') {
        propertyName = String(propertyNode.value as unknown);
      }

      if (!propertyName || !DATE_MUTATION_METHODS.has(propertyName)) {
        return results;
      }

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'warning',
        message: 'Date mutation methods are error-prone - create new Date or use date-fns',
        ruleId: 'primitives/no-date-mutation',
        tip: 'Use date-fns functions like addMonths() which return new instances',
        fix: { range: { start: 0, end: 0 }, text: '' },
      });

      return results;
    },
  },
};

export default rule;
