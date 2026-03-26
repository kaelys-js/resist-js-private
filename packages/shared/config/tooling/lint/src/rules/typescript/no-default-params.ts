/**
 * Rule: typescript/no-default-params
 *
 * Function parameters must not have default values or optional markers.
 * Defaults and optionality belong in Valibot schemas via v.optional().
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [/config\/test\//, /\.test\.ts$/, /\.spec\.ts$/];

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
      results.push({
        file: context.file,
        line: param.loc.start.line,
        column: param.loc.start.column + 1,
        severity: 'error',
        message: `Parameter '${paramName}' is optional (?) — optionality belongs in Valibot schemas via v.optional()`,
        ruleId: 'typescript/no-default-params',
        tip: 'Use v.optional() in the schema instead of ? on the parameter',
        fix: { range: { start: param.start, end: param.end }, text: '' },
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
            results.push({
              file: context.file,
              line: prop.loc.start.line,
              column: prop.loc.start.column + 1,
              severity: 'error',
              message: `Destructured parameter '${propName}' has a default value — defaults belong in Valibot schemas`,
              ruleId: 'typescript/no-default-params',
              tip: 'Move the default into v.optional(schema, default) in the schema',
              fix: { range: { start: prop.start, end: prop.end }, text: '' },
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

  visitor: {
    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      if (EXEMPT_PATTERNS.some((p: RegExp) => p.test(context.file))) {
        return [];
      }
      return checkParams(node, context, node.loc.start.line, node.loc.start.column + 1);
    },

    ArrowFunctionExpression(node: AstNode, context: VisitorContext): LintResult[] {
      if (EXEMPT_PATTERNS.some((p: RegExp) => p.test(context.file))) {
        return [];
      }
      return checkParams(node, context, node.loc.start.line, node.loc.start.column + 1);
    },
  },
};

export default rule;
