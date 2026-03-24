/**
 * Rule: typescript/require-type-annotation
 *
 * Every `const`/`let` declaration and function parameter must have an
 * explicit type annotation. No implicit `any` or inferred types.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/**
 * Check whether a variable declarator has a type annotation.
 *
 * @param decl - VariableDeclarator AST node
 * @returns Whether a type annotation is present
 */
function hasTypeAnnotation(decl: AstNode): boolean {
  return Boolean(decl.typeAnnotation || (decl.id as AstNode | undefined)?.typeAnnotation);
}

const rule: TypeScriptRule = {
  id: 'typescript/require-type-annotation',
  description: 'Every const/let declaration and function parameter must have a type annotation',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Skip `declare` statements
      if (node.declare) return results;

      const declarations = node.declarations as AstNode[] | undefined;
      if (!declarations) return results;

      for (const decl of declarations) {
        const id = decl.id as AstNode | undefined;
        if (!id) continue;

        if (id.type === 'ArrayPattern' || id.type === 'ObjectPattern') {
          if (!id.typeAnnotation) {
            const kind: string = id.type === 'ArrayPattern' ? 'array' : 'object';
            results.push({
              file: context.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'error',
              message: `Destructured ${kind} declaration is missing a type annotation`,
              ruleId: 'typescript/require-type-annotation',
              tip: `Add a type annotation after the destructuring pattern`,
              fix: { range: { start: id.end, end: id.end }, text: ': TYPE' },
            });
          }
          continue;
        }

        // Only check simple Identifier bindings (skip other patterns)
        if (id.type !== 'Identifier') continue;

        const name: string = (id.name as string) ?? '';

        // Skip if it has a type annotation
        if (hasTypeAnnotation(decl)) continue;

        // Skip if the init is a type assertion (as X) — the type is explicit
        const init = decl.init as AstNode | undefined;
        if (init?.type === 'TSAsExpression' || init?.type === 'TSSatisfiesExpression') continue;

        // Allow Valibot schema declarations — complex inferred types (codebase convention)
        if (name.endsWith('Schema') && init?.type === 'CallExpression') continue;

        // Insert `: TYPE` after the identifier name
        const insertPos: number = id.end;
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Missing type annotation on '${name}'`,
          ruleId: 'typescript/require-type-annotation',
          tip: 'Add an explicit type: const name: Type = ...',
          example: `const ${name}: Type = value;`,
          fix: { range: { start: insertPos, end: insertPos }, text: ': TYPE' },
        });
      }

      return results;
    },

    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const params = node.params as AstNode[] | undefined;
      if (!params) return results;

      const funcName: string = ((node.id as AstNode | undefined)?.name as string) ?? '<anonymous>';

      for (const param of params) {
        let paramName: string | null = null;
        let hasType: boolean = false;
        let insertPos: number = param.end;

        if (param.type === 'Identifier') {
          paramName = (param.name as string) ?? null;
          hasType = Boolean(param.typeAnnotation);
          insertPos = param.end;
        } else if (param.type === 'AssignmentPattern') {
          const left = param.left as AstNode | undefined;
          if (left?.type === 'Identifier') {
            paramName = (left.name as string) ?? null;
            hasType = Boolean(left.typeAnnotation);
            insertPos = left.end;
          }
        } else if (param.type === 'RestElement') {
          const arg = param.argument as AstNode | undefined;
          if (arg?.type === 'Identifier') {
            paramName = (arg.name as string) ?? null;
            hasType = Boolean(arg.typeAnnotation);
            insertPos = arg.end;
          }
        } else if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
          hasType = Boolean(param.typeAnnotation);
          paramName = '<destructured>';
          insertPos = param.end;
        }

        if (paramName && !hasType) {
          results.push({
            file: context.file,
            line: param.loc.start.line,
            column: param.loc.start.column + 1,
            severity: 'error',
            message: `Missing type annotation on parameter '${paramName}' in function '${funcName}'`,
            ruleId: 'typescript/require-type-annotation',
            tip: 'Add a type annotation to the parameter',
            fix: { range: { start: insertPos, end: insertPos }, text: ': TYPE' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
