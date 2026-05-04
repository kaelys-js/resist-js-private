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
  fixable: true,

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
            /* Fix: rewrite to safe static call */
            let fix = { range: { start: 0, end: 0 }, text: '' };
            const objRaw: unknown = callee.object;
            const objNode =
              objRaw !== null && typeof objRaw === 'object' ? (objRaw as AstNode) : undefined;
            const nodeArgs = node.arguments as AstNode[] | undefined;

            if (objNode && nodeArgs && nodeArgs.length > 0) {
              const objText: string = context.getNodeText(objNode);
              const argsText: string = nodeArgs
                .map((a: AstNode) => context.getNodeText(a))
                .join(', ');

              if (propName === 'hasOwnProperty') {
                /* obj.hasOwnProperty(key) → Object.hasOwn(obj, key) */
                fix = {
                  range: { start: node.start, end: node.end },
                  text: `Object.hasOwn(${objText}, ${argsText})`,
                };
              } else {
                /* propertyIsEnumerable / isPrototypeOf → Object.prototype.<method>.call(obj, args) */
                fix = {
                  range: { start: node.start, end: node.end },
                  text: `Object.prototype.${propName}.call(${objText}, ${argsText})`,
                };
              }
            }

            results.push({
              file: context.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'warning',
              message: `Use Object.hasOwn() instead of obj.${propName}()`,
              ruleId: 'primitives/no-object-prototype-access',
              tip: 'Use Object.hasOwn(obj, key) - works for all objects',
              fix,
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
