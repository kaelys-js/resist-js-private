/**
 * Rule: typescript/require-type-annotation
 *
 * Every `const`/`let` declaration and function parameter must have an
 * explicit type annotation. No implicit `any` or inferred types.
 *
 * @module
 */

import {
  createFixableResult,
  createResult,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Check whether a variable declarator has a type annotation.
 *
 * @param decl - VariableDeclarator AST node
 * @returns Whether a type annotation is present
 */
function hasTypeAnnotation(decl: AstNode): boolean {
  return Boolean(decl.typeAnnotation || (decl.id as AstNode | undefined)?.typeAnnotation);
}

/**
 * Infer a WIDENED keyword type from a syntactically-unambiguous initializer.
 *
 * Returns the keyword (`number`, `string`, `boolean`, `bigint`, `RegExp`) for
 * cases the oxc syntactic AST proves, or null when a type checker would be
 * required (calls, identifiers, member access, objects, arrays, …). Always the
 * widened keyword — never a literal type like `42` — so it is correct for `let`.
 *
 * @param node - The initializer / default-value AST node (or undefined)
 * @returns The inferred widened keyword, or null when not safely inferable
 */
function inferLiteralType(node: AstNode | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node.type === 'Literal') {
    const { value } = node;

    if (value === null) {
      return null; // `null` literal — skip (conservative).
    }
    if (value instanceof RegExp) {
      return 'RegExp';
    }

    const kind: string = typeof value;

    if (kind === 'number' || kind === 'string' || kind === 'boolean' || kind === 'bigint') {
      return kind;
    }

    return null;
  }

  // Any template literal (even interpolated) is a string. Tagged templates are
  // a distinct node type and are NOT matched here.
  if (node.type === 'TemplateLiteral') {
    return 'string';
  }

  // Unary `-`/`+` over a numeric literal is unambiguously `number`. Never fire
  // on `void`/`typeof`/`!`/`~` or non-literal arguments.
  if (node.type === 'UnaryExpression') {
    const { operator } = node;
    const argument = node.argument as AstNode | undefined;

    if (
      (operator === '-' || operator === '+') &&
      argument?.type === 'Literal' &&
      typeof argument.value === 'number'
    ) {
      return 'number';
    }
  }

  return null;
}

/**
 * Check function parameters for missing type annotations.
 *
 * @param params - Array of parameter AST nodes
 * @param funcName - Function name for error messages
 * @param context - Visitor context
 * @returns Array of lint results for untyped parameters
 */
function checkParams(params: AstNode[], funcName: string, context: VisitorContext): LintResult[] {
  const results: LintResult[] = [];

  for (const param of params) {
    let paramName: string | null = null;
    let hasType: boolean = false;
    let insertPos: number = param.end;
    // Only a defaulted param with a literal default carries a syntactic type signal.
    let inferred: string | null = null;

    if (param.type === 'Identifier') {
      paramName = (param.name as string) ?? null; // cast safe: AST name property
      hasType = Boolean(param.typeAnnotation);
      insertPos = param.end;
    } else if (param.type === 'AssignmentPattern') {
      const left = param.left as AstNode | undefined; // cast safe: AST left property

      if (left?.type === 'Identifier') {
        paramName = (left.name as string) ?? null; // cast safe: AST name property
        hasType = Boolean(left.typeAnnotation);
        insertPos = left.end;
        inferred = inferLiteralType(param.right as AstNode | undefined);
      }
    } else if (param.type === 'RestElement') {
      const arg = param.argument as AstNode | undefined; // cast safe: AST argument property

      if (arg?.type === 'Identifier') {
        paramName = (arg.name as string) ?? null; // cast safe: AST name property
        hasType = Boolean(param.typeAnnotation || arg.typeAnnotation);
        insertPos = arg.end;
      }
    } else if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
      hasType = Boolean(param.typeAnnotation);
      paramName = '<destructured>';
      insertPos = param.end;
    }

    if (paramName && !hasType) {
      const message = `Missing type annotation on parameter '${paramName}' in function '${funcName}'`;
      const tip = 'Add a type annotation to the parameter';

      if (inferred) {
        results.push(
          createFixableResult(
            'typescript/require-type-annotation',
            context.file,
            param.loc.start.line,
            param.loc.start.column + 1,
            'error',
            message,
            { fix: { range: { start: insertPos, end: insertPos }, text: `: ${inferred}` }, tip },
          ),
        );
      } else {
        results.push(
          createResult(
            'typescript/require-type-annotation',
            context.file,
            param.loc.start.line,
            param.loc.start.column + 1,
            'error',
            message,
            { tip },
          ),
        );
      }
    }
  }

  return results;
}
/** The require-type-annotation lint rule. */
const rule: TypeScriptRule = {
  id: 'typescript/require-type-annotation',
  description: 'Every const/let declaration and function parameter must have a type annotation',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Skip `declare` statements
      if (node.declare) {
        return results;
      }

      const declarations = node.declarations as AstNode[] | undefined;

      if (!declarations) {
        return results;
      }

      for (const decl of declarations) {
        const id = decl.id as AstNode | undefined;

        if (!id) {
          continue;
        }

        if (id.type === 'ArrayPattern' || id.type === 'ObjectPattern') {
          if (!id.typeAnnotation) {
            // Skip for-of destructuring when the iterable is a typed variable
            // e.g. `for (const [a, b] of typedArray)` — types flow from the iterable
            const beforeDecl: string = context.content
              .slice(Math.max(0, node.start - 20), node.start)
              .trimEnd();
            const isForOf: boolean = /for\s*(?:await\s*)?\(\s*$/.test(beforeDecl);

            if (!isForOf) {
              const kind: string = id.type === 'ArrayPattern' ? 'array' : 'object';
              // Synthesizing the structural/tuple type for a destructuring
              // pattern is unsafe (rest/holes/nested) — emit a detect-only NO_OP.
              results.push(
                createResult(
                  'typescript/require-type-annotation',
                  context.file,
                  node.loc.start.line,
                  node.loc.start.column + 1,
                  'error',
                  `Destructured ${kind} declaration is missing a type annotation`,
                  { tip: `Add a type annotation after the destructuring pattern` },
                ),
              );
            }
          }
          continue;
        }

        // Only check simple Identifier bindings (skip other patterns)
        if (id.type !== 'Identifier') {
          continue;
        }

        const name: string = (id.name as string) ?? '';

        // Skip if it has a type annotation
        if (hasTypeAnnotation(decl)) {
          continue;
        }

        // Skip for-of loop variables — types flow from the iterable
        const beforeDecl: string = context.content
          .slice(Math.max(0, node.start - 20), node.start)
          .trimEnd();

        if (/for\s*(?:await\s*)?\(\s*$/.test(beforeDecl)) {
          continue;
        }

        // Skip if the init is a type assertion (as X) — the type is explicit
        const init = decl.init as AstNode | undefined;

        if (init?.type === 'TSAsExpression' || init?.type === 'TSSatisfiesExpression') {
          continue;
        }

        // Allow Valibot schema declarations — complex inferred types (codebase convention)
        if (name.endsWith('Schema') && init?.type === 'CallExpression') {
          continue;
        }

        // Insert `: <inferred>` after the identifier when the initializer is a
        // syntactically-unambiguous literal; otherwise emit a detect-only NO_OP
        // (a type checker would be required, and `: TYPE` is not valid TS).
        const insertPos: number = id.end;
        const inferred: string | null = inferLiteralType(init);

        if (inferred) {
          results.push(
            createFixableResult(
              'typescript/require-type-annotation',
              context.file,
              node.loc.start.line,
              node.loc.start.column + 1,
              'error',
              `Missing type annotation on '${name}'`,
              {
                fix: { range: { start: insertPos, end: insertPos }, text: `: ${inferred}` },
                tip: 'Add an explicit type: const name: Type = ...',
                example: `const ${name}: ${inferred} = value;`,
              },
            ),
          );
        } else {
          results.push(
            createResult(
              'typescript/require-type-annotation',
              context.file,
              node.loc.start.line,
              node.loc.start.column + 1,
              'error',
              `Missing type annotation on '${name}'`,
              {
                tip: 'Add an explicit type: const name: Type = ...',
                example: `const ${name}: Type = value;`,
              },
            ),
          );
        }
      }

      return results;
    },

    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const params = node.params as AstNode[] | undefined; // cast safe: AST params property

      if (!params) {
        return [];
      }

      const funcName: string = ((node.id as AstNode | undefined)?.name as string) ?? '<anonymous>'; // cast safe: AST id/name

      return checkParams(params, funcName, context);
    },

    FunctionExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const params = node.params as AstNode[] | undefined; // cast safe: AST params property

      if (!params) {
        return [];
      }
      // Derive name from parent property key if this is a method in an object literal

      const funcName: string = ((node.id as AstNode | undefined)?.name as string) ?? '<method>'; // cast safe: AST id/name

      return checkParams(params, funcName, context);
    },
  },
};

export default rule;
