/**
 * Rule: naming/constant-screaming-case
 *
 * Top-level `const` declarations initialized with literals (string, number,
 * boolean, Set, Map, array of primitives) must use SCREAMING_SNAKE_CASE.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** AST node types that represent literal values (ESTree format from oxc-parser). */
const LITERAL_TYPES: ReadonlySet<string> = new Set(['Literal', 'TemplateLiteral']);

/** Pattern for valid SCREAMING_SNAKE_CASE identifiers. */
const SCREAMING_SNAKE_RE: RegExp = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

/**
 * Check if an initializer node is a "constant-like" value (literals, new Set/Map, arrays of literals).
 *
 * @param {AstNode} init - The initializer AST node
 * @returns {boolean} Whether the init represents a constant value
 */
function isConstantLikeInit(init: AstNode): boolean {
  if (LITERAL_TYPES.has(init.type)) {
    return true;
  }

  // Negative number literal: -42
  if (init.type === 'UnaryExpression') {
    const argument = init.argument as AstNode | undefined;
    if (argument && LITERAL_TYPES.has(argument.type)) {
      return true;
    }
  }

  // new Set(...) or new Map(...)
  if (init.type === 'NewExpression') {
    const callee = init.callee as AstNode | undefined;
    const calleeName: string = (callee?.name as string) ?? '';
    if (calleeName === 'Set' || calleeName === 'Map') {
      return true;
    }
  }

  // Array of literals: [1, 2, 3]
  if (init.type === 'ArrayExpression') {
    const elements = init.elements as AstNode[] | undefined;
    if (elements && elements.every((el: AstNode): boolean => LITERAL_TYPES.has(el.type))) {
      return true;
    }
  }

  return false;
}
/** The constant-screaming-case lint rule. */
const rule: TypeScriptRule = {
  id: 'naming/constant-screaming-case',
  description: 'Top-level const with literal init must use SCREAMING_SNAKE_CASE',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const body = node.body as AstNode[] | undefined;
      if (!body) {
        return results;
      }

      for (const stmt of body) {
        let varDecl: AstNode | null = null;

        if (stmt.type === 'VariableDeclaration' && stmt.kind === 'const') {
          varDecl = stmt;
        }
        if (stmt.type === 'ExportNamedDeclaration') {
          const declaration = stmt.declaration as AstNode | undefined;
          if (declaration?.type === 'VariableDeclaration' && declaration.kind === 'const') {
            varDecl = declaration;
          }
        }

        if (!varDecl) {
          continue;
        }

        const declarations = varDecl.declarations as AstNode[] | undefined;
        if (!declarations) {
          continue;
        }

        for (const decl of declarations) {
          const id = decl.id as AstNode | undefined;
          if (!id || id.type !== 'Identifier') {
            continue;
          }

          const name: string = (id.name as string) ?? '';
          if (!name) {
            continue;
          }

          const init = decl.init as AstNode | undefined;
          if (!init) {
            continue;
          }

          // Only flag constant-like initializers
          if (!isConstantLikeInit(init)) {
            continue;
          }

          if (!SCREAMING_SNAKE_RE.test(name)) {
            results.push({
              file: context.file,
              line: (stmt.type === 'ExportNamedDeclaration' ? stmt : varDecl).loc.start.line,
              column: id.loc.start.column + 1,
              severity: 'error',
              message: `Constant '${name}' should use SCREAMING_SNAKE_CASE`,
              ruleId: 'naming/constant-screaming-case',
              tip: 'Rename to SCREAMING_SNAKE_CASE (e.g., MAX_RETRIES, DEFAULT_PORT)',
              fix: {
                range: { start: id.start, end: id.end },
                text: name.replaceAll(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),
              },
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
