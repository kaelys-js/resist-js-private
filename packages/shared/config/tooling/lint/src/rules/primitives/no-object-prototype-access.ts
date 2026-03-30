/**
 * Rule: primitives/no-object-prototype-access
 *
 * Detects direct calls to Object.prototype methods like hasOwnProperty,
 * propertyIsEnumerable, and isPrototypeOf on object instances. These fail
 * on objects created with Object.create(null) or those that shadow the methods.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

const PROTOTYPE_METHODS = new Set(['hasOwnProperty', 'propertyIsEnumerable', 'isPrototypeOf']);

const rule: TypeScriptRule = {
  id: 'primitives/no-object-prototype-access',
  description: 'Use Object.hasOwn() instead of obj.hasOwnProperty()',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const calleeRaw: unknown = node.callee;

      if (!calleeRaw || typeof calleeRaw !== 'object') {
        return results;
      }

      const callee = calleeRaw as AstNode;

      if (callee.type === 'MemberExpression' || callee.type === 'StaticMemberExpression') {
        const propRaw: unknown = callee.property;
        if (propRaw !== null && typeof propRaw === 'object') {
          const propNode = propRaw as AstNode;
          const propName = propNode.name as string;
          if (propNode.type === 'Identifier' && PROTOTYPE_METHODS.has(propName)) {
            results.push({
              file: context.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'warning',
              message: `Use Object.hasOwn() instead of obj.${propName}()`,
              ruleId: 'primitives/no-object-prototype-access',
              tip: 'Use Object.hasOwn(obj, key) - works for all objects',
              fix: { range: { start: 0, end: 0 }, text: '' },
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
