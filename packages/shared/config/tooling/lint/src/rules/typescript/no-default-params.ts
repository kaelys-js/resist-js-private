/**
 * Rule: typescript/no-default-params
 *
 * Function parameters must not have default values or optional markers.
 * Defaults and optionality belong in Valibot schemas via v.optional().
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Check function parameters for defaults and optionals.
 *
 * @param {AstNode} funcNode - The function AST node
 * @param {VisitorContext} context - Visitor context
 * @param {number} _reportLine - Line to report errors on
 * @param {number} _reportCol - Column to report errors on
 * @returns {LintResult[]} Lint results
 */
function checkParams(
  funcNode: AstNode,
  context: VisitorContext,
  _reportLine: number,
  _reportCol: number,
): LintResult[] {
  const results: LintResult[] = [];
  const params = funcNode.params as AstNode[] | undefined;

  if (!params) {
    return results;
  }

  for (const param of params) {
    // Check for default values (AssignmentPattern: param = value)
    if (param.type === 'AssignmentPattern') {
      const left = param.left as AstNode | undefined;
      const paramName: string = getParamName(left ?? param);
      results.push({
        file: context.file,
        line: param.loc.start.line,
        column: param.loc.start.column + 1,
        severity: 'error',
        message: `Parameter '${paramName}' has a default value — defaults belong in Valibot schemas via v.optional(schema, default)`,
        ruleId: 'typescript/no-default-params',
        tip: 'Move the default value into the Valibot schema and remove it from the function signature',
        fix: {
          range: { start: param.start, end: param.end },
          text: context.getNodeText(left ?? param),
        },
      });
    }

    // Check for optional marker (param?: Type)
    if (param.optional === true) {
      const paramName: string = getParamName(param);
      /* Find the '?' character in the param source to strip it */
      const paramText: string = context.content.slice(param.start, param.end);
      const qIdx: number = paramText.indexOf('?');
      const fixStart: number = qIdx !== -1 ? param.start + qIdx : param.start;
      const fixEnd: number = qIdx !== -1 ? param.start + qIdx + 1 : param.start;

      results.push({
        file: context.file,
        line: param.loc.start.line,
        column: param.loc.start.column + 1,
        severity: 'error',
        message: `Parameter '${paramName}' is optional (?) — optionality belongs in Valibot schemas via v.optional()`,
        ruleId: 'typescript/no-default-params',
        tip: 'Use v.optional() in the schema instead of ? on the parameter',
        fix: { range: { start: fixStart, end: fixEnd }, text: '' },
      });
    }

    // Check destructured params with defaults inside
    if (param.type === 'ObjectPattern') {
      const properties = param.properties as AstNode[] | undefined;

      if (properties) {
        for (const prop of properties) {
          const value = prop.value as AstNode | undefined;

          if (value?.type === 'AssignmentPattern') {
            const key = prop.key as AstNode | undefined;
            const propName: string = (key?.name as string) ?? '<unknown>';
            /* Fix: strip the `= defaultValue` part, keeping just the key */
            const left = value.left as AstNode | undefined;
            const keyText: string = left ? context.content.slice(left.start, left.end) : propName;

            results.push({
              file: context.file,
              line: prop.loc.start.line,
              column: prop.loc.start.column + 1,
              severity: 'error',
              message: `Destructured parameter '${propName}' has a default value — defaults belong in Valibot schemas`,
              ruleId: 'typescript/no-default-params',
              tip: 'Move the default into v.optional(schema, default) in the schema',
              fix: { range: { start: prop.start, end: prop.end }, text: keyText },
            });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Extract parameter name from AST node.
 *
 * @param {AstNode} node - Parameter node
 * @returns {string} The parameter name
 */
function getParamName(node: AstNode): string {
  if (node.type === 'Identifier') {
    return (node.name as string) ?? '<unknown>';
  }
  if (node.type === 'ObjectPattern') {
    return '<destructured>';
  }
  if (node.type === 'ArrayPattern') {
    return '<destructured>';
  }
  return '<unknown>';
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'typescript/no-default-params',
  description:
    'Function parameters must not have defaults or optional markers — use Valibot schemas',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript', 'valibot'],
  stages: ['lint'],
  fixable: true,

  visitor: {
    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      return checkParams(node, context, node.loc.start.line, node.loc.start.column + 1);
    },

    ArrowFunctionExpression(node: AstNode, context: VisitorContext): LintResult[] {
      return checkParams(node, context, node.loc.start.line, node.loc.start.column + 1);
    },
  },
};

export default rule;
