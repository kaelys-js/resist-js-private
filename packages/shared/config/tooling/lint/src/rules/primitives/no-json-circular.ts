/**
 * Rule: primitives/no-json-circular
 *
 * Detects JSON.stringify calls without a replacer function that could handle
 * circular references, which would cause a runtime TypeError.
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
  id: 'primitives/no-json-circular',
  description:
    'JSON.stringify may throw on circular structure - use safe-stringify or handle cycles',
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

      const objectRaw: unknown = callee.object;
      const objectNode =
        objectRaw !== null && typeof objectRaw === 'object' ? (objectRaw as AstNode) : undefined;
      const propertyRaw: unknown = callee.property;
      const propertyNode =
        propertyRaw !== null && typeof propertyRaw === 'object'
          ? (propertyRaw as AstNode)
          : undefined;

      if (
        objectNode?.type !== 'Identifier' ||
        (objectNode.name as string) !== 'JSON' ||
        propertyNode?.type !== 'Identifier' ||
        (propertyNode.name as string) !== 'stringify'
      ) {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;
      if (args && args.length > 1) {
        return results;
      }

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'warning',
        message:
          'JSON.stringify may throw on circular structure - use safe-stringify or handle cycles',
        ruleId: 'primitives/no-json-circular',
        tip: 'Use safe-stable-stringify library or implement circular reference handling',
        fix: { range: { start: 0, end: 0 }, text: '' },
      });

      return results;
    },
  },
};

export default rule;
