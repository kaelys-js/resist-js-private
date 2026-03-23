/**
 * Rule: result/validate-function-input
 *
 * Exported functions and handler functions with parameters must validate
 * EVERY input parameter using `safeParse()` at the start of the function body.
 * Each parameter name must appear as an argument to a safeParse/parse call.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Function names that indicate handler/entry points. */
const HANDLER_PATTERNS: readonly RegExp[] = [
  /^handle/i,
  /^on[A-Z]/,
  /handler$/i,
  /controller$/i,
  /^(get|post|put|patch|delete|create|update|remove)/i,
  /^process/i,
  /^validate/i,
  /^parse/i,
  /action$/i,
  /endpoint$/i,
  /api$/i,
];

/**
 * Extract parameter name from a parameter AST node.
 *
 * @param {AstNode} param - The parameter node
 * @returns {string | null} The parameter name or null for patterns/callbacks
 */
function getParamName(param: AstNode): string | null {
  if (param.type === 'Identifier') {
    return (param.name as string) ?? null;
  }
  // AssignmentPattern: param = defaultValue — extract left side
  if (param.type === 'AssignmentPattern') {
    const left = param.left as AstNode | undefined;
    if (left?.type === 'Identifier') {
      return (left.name as string) ?? null;
    }
  }
  return null;
}

/** Pattern matching substrings that indicate a callback parameter type. */
const CALLBACK_PATTERN: RegExp = /Function|=>/;

/**
 * Check if a parameter's type annotation indicates a callback function.
 *
 * @param {AstNode} param - The parameter node
 * @param {VisitorContext} context - The visitor context
 * @returns {boolean} Whether the param is a callback
 */
function isCallbackParam(param: AstNode, context: VisitorContext): boolean {
  const typeAnnotation = (param.typeAnnotation as AstNode | undefined)?.typeAnnotation as
    | AstNode
    | undefined;
  if (!typeAnnotation) return false;

  return CALLBACK_PATTERN.test(context.content.slice(typeAnnotation.start, typeAnnotation.end));
}

/**
 * Check if a parameter is validated in the function body via safeParse.
 *
 * @param {string} paramName - The parameter name
 * @param {string} bodyText - The function body text
 * @returns {boolean} Whether a safeParse call includes this parameter
 */
function isParamValidated(paramName: string, bodyText: string): boolean {
  // Match safeParse(SomeSchema, paramName) or .safeParse(paramName) or .parse(paramName)
  const patterns: RegExp[] = [
    new RegExp(`safeParse\\s*\\([^,]+,\\s*${paramName}\\s*[),]`),
    new RegExp(`\\.safeParse\\s*\\(\\s*${paramName}\\s*[),]`),
    new RegExp(`\\.parse\\s*\\(\\s*${paramName}\\s*[),]`),
  ];
  return patterns.some((p: RegExp): boolean => p.test(bodyText));
}

/**
 * Check a function for missing per-parameter validation.
 *
 * @param {AstNode} node - The function node
 * @param {string} name - The function name
 * @param {VisitorContext} context - The visitor context
 * @param {boolean} isExported - Whether the function is exported
 * @returns {LintResult[]} Any lint violations
 */
function checkFunction(
  node: AstNode,
  name: string,
  context: VisitorContext,
  isExported: boolean,
): LintResult[] {
  const results: LintResult[] = [];

  // Only check exported functions and handler-pattern functions
  const isHandler: boolean = HANDLER_PATTERNS.some((p: RegExp): boolean => p.test(name));
  if (!isHandler && !isExported) return results;

  const params = node.params as AstNode[] | undefined;
  if (!params || params.length === 0) return results;

  const body = node.body as AstNode | undefined;
  if (!body) return results;

  const bodyText: string = context.content.slice(body.start, body.end);

  // Check each parameter individually
  for (const param of params) {
    // Skip destructured params (ObjectPattern, ArrayPattern) — check the whole call
    if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') continue;

    // Skip callback parameters (type annotation contains =>)
    if (isCallbackParam(param, context)) continue;

    const paramName: string | null = getParamName(param);
    if (!paramName) continue;

    if (!isParamValidated(paramName, bodyText)) {
      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'warning',
        message: `Function '${name}' does not validate parameter '${paramName}'`,
        ruleId: 'result/validate-function-input',
        tip: `Validate with: const ${paramName}Result = safeParse(${paramName[0].toUpperCase() + paramName.slice(1)}Schema, ${paramName})`,
        fix: {
          range: { start: body.start + 1, end: body.start + 1 },
          text: `\n  const ${paramName}Result = safeParse(${paramName[0].toUpperCase() + paramName.slice(1)}Schema, ${paramName});\n  if (!${paramName}Result.ok) return ${paramName}Result;\n`,
        },
      });
    }
  }

  return results;
}

const rule: TypeScriptRule = {
  id: 'result/validate-function-input',
  description: 'Exported/handler functions should validate input with safeParse()',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const declaration = node.declaration as AstNode | undefined;
      if (!declaration) return results;

      if (declaration.type === 'FunctionDeclaration') {
        const name: string = ((declaration.id as AstNode)?.name as string) ?? '';
        results.push(...checkFunction(declaration, name, context, true));
      }

      if (declaration.type === 'VariableDeclaration') {
        const declarations = declaration.declarations as AstNode[] | undefined;
        if (!declarations) return results;

        for (const decl of declarations) {
          const init = decl.init as AstNode | undefined;
          if (
            init &&
            (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
          ) {
            const name: string = ((decl.id as AstNode)?.name as string) ?? '';
            results.push(...checkFunction(init, name, context, true));
          }
        }
      }

      return results;
    },

    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const name: string = ((node.id as AstNode)?.name as string) ?? '';
      if (!name) return [];

      // Skip if this function is inside an export — already handled by ExportNamedDeclaration
      const before: string = context.content.slice(Math.max(0, node.start - 20), node.start);
      if (/export\s+(default\s+)?$/.test(before)) return [];

      return checkFunction(node, name, context, false);
    },

    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const declarations = node.declarations as AstNode[] | undefined;
      if (!declarations) return results;

      for (const declarator of declarations) {
        const init = declarator.init as AstNode | undefined;
        if (!init) continue;

        if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
          const name: string = ((declarator.id as AstNode)?.name as string) ?? '';
          if (name && HANDLER_PATTERNS.some((p: RegExp): boolean => p.test(name))) {
            results.push(...checkFunction(init, name, context, false));
          }
        }
      }

      return results;
    },
  },
};

export default rule;
