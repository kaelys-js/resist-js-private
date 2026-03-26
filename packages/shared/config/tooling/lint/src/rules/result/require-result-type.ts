/**
 * Rule: result/require-result-type
 *
 * Exported functions that might fail (await, fetch, try/catch, parse calls)
 * must return `Result<T>` or `Promise<Result<T>>` for explicit error handling.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File paths exempt from this rule (test infrastructure, test files). */
const EXEMPT_PATHS: readonly RegExp[] = [/config\/test\//, /\.test\.ts$/, /\.spec\.ts$/];

/**
 * Check if a type annotation is a Result type.
 *
 * @param {AstNode} node - The type annotation node
 * @returns {boolean} Whether the type is Result or Ok | Err union
 */
function isResultType(node: AstNode): boolean {
  if (node.type === 'TSTypeReference') {
    const typeName = node.typeName as AstNode | undefined;
    if (!typeName) {
      return false;
    }

    const name: string = (typeName.name as string) ?? '';
    return name === 'Result' || name === 'Ok' || name === 'Err';
  }

  // Handle union types like Ok<T> | Err
  if (node.type === 'TSUnionType') {
    const types = node.types as AstNode[] | undefined;
    if (!types) {
      return false;
    }

    return types.some((t: AstNode): boolean => {
      if (t.type === 'TSTypeReference') {
        const typeName = t.typeName as AstNode | undefined;
        const name: string = (typeName?.name as string) ?? '';
        return name === 'Ok' || name === 'Err';
      }
      return false;
    });
  }

  return false;
}

/**
 * Check if a type annotation is Promise<Result<T>>.
 *
 * @param {AstNode} node - The type annotation node
 * @returns {boolean} Whether the type is Promise<Result<...>>
 */
function isPromiseOfResult(node: AstNode): boolean {
  if (node.type !== 'TSTypeReference') {
    return false;
  }

  const typeName = node.typeName as AstNode | undefined;
  if (!typeName) {
    return false;
  }

  const name: string = (typeName.name as string) ?? '';
  if (name !== 'Promise') {
    return false;
  }

  // oxc-parser uses `typeArguments` (not `typeParameters`) for generic args
  const typeArgs = (node.typeArguments ?? node.typeParameters) as AstNode | undefined;
  if (!typeArgs) {
    return false;
  }

  const params = typeArgs.params as AstNode[] | undefined;
  if (!params || params.length === 0) {
    return false;
  }

  const firstParam = params[0] as AstNode; // cast safe: length checked above
  return isResultType(firstParam);
}

/** Patterns for pure predicate functions exempt from Result requirement. */
const PREDICATE_PATTERNS: readonly RegExp[] = [
  /^is[A-Z]/,
  /^has[A-Z]/,
  /^can[A-Z]/,
  /^should[A-Z]/,
];

/**
 * Check a function and report if it should return Result but doesn't.
 *
 * @param {AstNode} node - The function node
 * @param {VisitorContext} context - The visitor context
 * @param {string} [funcName] - Optional function name override
 * @returns {LintResult | null} A lint result or null
 */
function checkFunctionReturnType(
  node: AstNode,
  context: VisitorContext,
  funcName: string | undefined,
): LintResult | null {
  const returnType = node.returnType as AstNode | undefined;
  if (!returnType) {
    return null;
  }

  const typeAnnotation = returnType.typeAnnotation as AstNode | undefined;
  if (!typeAnnotation) {
    return null;
  }

  const name: string = funcName ?? ((node.id as AstNode)?.name as string) ?? 'anonymous';

  if (isResultType(typeAnnotation)) {
    return null;
  }
  if (isPromiseOfResult(typeAnnotation)) {
    return null;
  }

  // Check if void/Promise<void> — these don't need Result
  const typeText: string = context.content.slice(typeAnnotation.start, typeAnnotation.end);
  if (typeText === 'void' || typeText === 'Promise<void>') {
    return null;
  }

  // Exempt schema factory return types — these create validators, not data
  if (/^(?:TemplateSchema|v\.GenericSchema|v\.BaseSchema)/.test(typeText)) {
    return null;
  }

  // Exempt specific schema introspection return types — null means "not found", not error
  if (typeText === 'NullableParamSchemas' || typeText === 'NullableSchemaEntries') {
    return null;
  }

  // Exempt boolean return types from pure predicate functions (is*, has*, can*, should*)
  const isPredicate: boolean = PREDICATE_PATTERNS.some((p: RegExp): boolean => p.test(name));
  if (isPredicate && (typeText === 'boolean' || typeText === 'Bool')) {
    return null;
  }

  // Exempt identity functions: single `return paramName;` body
  // But NOT if the function matches predicate patterns (is*, has*, etc.) —
  // predicates returning non-boolean should still be flagged.
  const body = node.body as AstNode | undefined;
  if (!isPredicate && body?.type === 'BlockStatement') {
    const statements = (body as AstNode).body as AstNode[] | undefined;
    const firstStatement = statements?.[0] as AstNode | undefined; // cast safe: optional access
    if (statements && statements.length === 1 && firstStatement?.type === 'ReturnStatement') {
      const returnArg = firstStatement.argument as AstNode | undefined;
      if (returnArg?.type === 'Identifier') {
        const params = node.params as AstNode[] | undefined;
        const paramNames: string[] = (params ?? [])
          .map((p: AstNode): string => (p.name as string) ?? '')
          .filter(Boolean);
        if (paramNames.includes(returnArg.name as string)) {
          return null; // Identity function — cannot fail
        }
      }
    }
  }

  // Exempt integration boundary functions: contain `// integration boundary` comment.
  // These functions interface with external APIs (Vite, etc.) that don't understand Result.
  // The comment can appear with a throw (error propagation) or standalone (pure factory).
  if (body?.type === 'BlockStatement') {
    const bodySource: string = context.content.slice(body.start, body.end);
    if (/\/\/.*integration boundary:\s*\S+/i.test(bodySource)) {
      return null;
    }
  }

  return {
    file: context.file,
    line: node.loc.start.line,
    column: node.loc.start.column + 1,
    severity: 'error',
    message: `Function '${name}' should return Result<T> for explicit error handling`,
    ruleId: 'result/require-result-type',
    tip: 'Use Result type to make errors explicit in the return type',
    fix: {
      range: { start: typeAnnotation.start, end: typeAnnotation.end },
      text: `Result<${typeText}>`,
    },
  };
}
/** The require-result-type lint rule. */
const rule: TypeScriptRule = {
  id: 'result/require-result-type',
  description: 'Exported functions that might fail should return Result<T>',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (EXEMPT_PATHS.some((p: RegExp): boolean => p.test(context.file))) {
        return results;
      }

      const declaration = node.declaration as AstNode | undefined;
      if (!declaration) {
        return results;
      }

      if (declaration.type === 'FunctionDeclaration') {
        const result: LintResult | null = checkFunctionReturnType(declaration, context, undefined);
        if (result) {
          results.push(result);
        }
      }

      if (declaration.type === 'VariableDeclaration') {
        const declarations = declaration.declarations as AstNode[] | undefined;
        if (!declarations) {
          return results;
        }

        for (const decl of declarations) {
          const init = decl.init as AstNode | undefined;
          if (
            init &&
            (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
          ) {
            const funcName: string = ((decl.id as AstNode)?.name as string) ?? '';
            const result: LintResult | null = checkFunctionReturnType(init, context, funcName);
            if (result) {
              results.push(result);
            }
          }
        }
      }

      return results;
    },

    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (EXEMPT_PATHS.some((p: RegExp): boolean => p.test(context.file))) {
        return results;
      }

      // Skip exported functions — handled by ExportNamedDeclaration/ExportDefaultDeclaration
      const beforeFunc: string = context.content
        .slice(Math.max(0, node.start - 20), node.start)
        .trim();
      if (beforeFunc.endsWith('export') || beforeFunc.endsWith('default')) {
        return results;
      }

      const result: LintResult | null = checkFunctionReturnType(node, context, undefined);
      if (result) {
        results.push(result);
      }
      return results;
    },

    ExportDefaultDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (EXEMPT_PATHS.some((p: RegExp): boolean => p.test(context.file))) {
        return results;
      }

      const declaration = node.declaration as AstNode | undefined;
      if (!declaration) {
        return results;
      }

      if (
        declaration.type === 'FunctionDeclaration' ||
        declaration.type === 'ArrowFunctionExpression' ||
        declaration.type === 'FunctionExpression'
      ) {
        const result: LintResult | null = checkFunctionReturnType(declaration, context, undefined);
        if (result) {
          results.push(result);
        }
      }

      return results;
    },
  },
};

export default rule;
