/**
 * Rule: primitives/no-json-undefined
 *
 * Detects JSON.stringify calls without a replacer function, which silently
 * omits properties with undefined values from the output.
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
  id: 'primitives/no-json-undefined',
  description: 'JSON.stringify omits undefined values - use null or replacer function',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

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

      /* Fix: add a replacer that converts undefined to null */
      let fix = { range: { start: 0, end: 0 }, text: '' };

      if (args && args.length === 1) {
        const argText: string = context.getNodeText(args[0] as AstNode);
        const replacer: string = '(_, v) => v === undefined ? null : v';
        fix = {
          range: { start: node.start, end: node.end },
          text: `JSON.stringify(${argText}, ${replacer})`,
        };
      }

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'warning',
        message: 'JSON.stringify omits undefined values - use null or replacer function',
        ruleId: 'primitives/no-json-undefined',
        tip: 'Use null instead of undefined, or provide replacer to convert undefined',
        fix,
      });

      return results;
    },
  },
};

export default rule;
