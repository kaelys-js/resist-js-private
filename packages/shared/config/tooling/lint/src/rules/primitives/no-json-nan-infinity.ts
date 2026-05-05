/**
 * Rule: primitives/no-json-nan-infinity
 *
 * Detects JSON.stringify calls without a replacer function, which silently
 * converts NaN and Infinity values to null in the output.
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
  id: 'primitives/no-json-nan-infinity',
  description: 'JSON.stringify converts NaN/Infinity to null - validate or use replacer',
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

      /* Fix: add a replacer that converts NaN/Infinity to their string representations */
      let fix = NO_OP_FIX;

      if (args && args.length === 1) {
        const argText: string = context.getNodeText(args[0] as AstNode);
        const replacer: string =
          '(_, v) => typeof v === "number" && !Number.isFinite(v) ? String(v) : v';
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
        message: 'JSON.stringify converts NaN/Infinity to null - validate or use replacer',
        ruleId: 'primitives/no-json-nan-infinity',
        tip: 'Validate numbers before stringify or use replacer to handle special values',
        fix,
      });

      return results;
    },
  },
};

export default rule;
