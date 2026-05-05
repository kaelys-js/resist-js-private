/**
 * Rule: typescript/no-module-side-effects
 *
 * Top-level code must not have side effects that run on import.
 * Specifically: top-level `throw` statements and top-level function calls
 * (outside of `const x = fn()` assignments) are flagged.
 *
 * Module-level throws crash the process on import. Module-level calls
 * execute before the consumer can handle errors via Result.
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
 * Check if a top-level statement contains a ThrowStatement anywhere in its subtree.
 *
 * @param {AstNode} statement - The top-level statement node
 * @returns {boolean} Whether it contains a throw
 */
function containsThrow(statement: AstNode): boolean {
  const source: string = JSON.stringify(statement);

  return source.includes('"type":"ThrowStatement"');
}

/**
 * Check if a top-level if-statement's throw is annotated with an integration boundary comment.
 *
 * Scans all lines spanned by the statement for `// integration boundary: ...`.
 *
 * @param {AstNode} statement - The IfStatement node
 * @param {VisitorContext} context - Visitor context
 * @returns {boolean} Whether the statement is an integration boundary
 */
function isIntegrationBoundaryIf(statement: AstNode, context: VisitorContext): boolean {
  const lines: string[] = context.content.split('\n');
  const startLine: number = statement.loc.start.line - 1;
  const endLine: number = statement.loc.end.line - 1;

  for (let i: number = startLine; i <= endLine && i < lines.length; i++) {
    const currentLine = lines[i] as string | undefined;

    if (currentLine && /\/\/.*integration boundary:\s*\S+/i.test(currentLine)) {
      return true;
    }
  }

  return false;
}
/** The no-module-side-effects lint rule. */
const rule: TypeScriptRule = {
  id: 'typescript/no-module-side-effects',
  description: 'Top-level code must not throw or execute side-effect calls on import',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript', 'safety'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const body = node.body as AstNode[] | undefined;

      if (!body) {
        return results;
      }

      for (const statement of body) {
        // Skip imports, exports, type declarations, variable/function/class declarations
        if (
          statement.type === 'ImportDeclaration' ||
          statement.type === 'ExportNamedDeclaration' ||
          statement.type === 'ExportDefaultDeclaration' ||
          statement.type === 'ExportAllDeclaration' ||
          statement.type === 'TSTypeAliasDeclaration' ||
          statement.type === 'TSInterfaceDeclaration' ||
          statement.type === 'TSEnumDeclaration' ||
          statement.type === 'FunctionDeclaration' ||
          statement.type === 'ClassDeclaration' ||
          statement.type === 'VariableDeclaration'
        ) {
          continue;
        }

        // Flag top-level ThrowStatement — wrap in exported function returning Result
        if (statement.type === 'ThrowStatement') {
          const stmtText: string = context.content.slice(statement.start, statement.end);
          const wrapped: string = `export function _validate(): void {\n  ${stmtText}\n}`;

          results.push({
            file: context.file,
            line: statement.loc.start.line,
            column: statement.loc.start.column + 1,
            severity: 'error',
            message:
              'Top-level throw crashes the process on import — wrap in a function returning Result',
            ruleId: 'typescript/no-module-side-effects',
            tip: 'Move this into an exported function that returns err() instead of throwing',
            fix: { range: { start: statement.start, end: statement.end }, text: wrapped },
          });
          continue;
        }

        // Flag top-level if-statements containing throws (unless integration boundary)
        if (
          statement.type === 'IfStatement' &&
          containsThrow(statement) &&
          !isIntegrationBoundaryIf(statement, context)
        ) {
          const stmtText: string = context.content.slice(statement.start, statement.end);
          const indented: string = stmtText
            .split('\n')
            .map((l: string): string => `  ${l}`)
            .join('\n');
          const wrapped: string = `export function _validateEnvironment(): void {\n${indented}\n}`;

          results.push({
            file: context.file,
            line: statement.loc.start.line,
            column: statement.loc.start.column + 1,
            severity: 'error',
            message:
              'Top-level conditional throw crashes the process on import — wrap in a function returning Result',
            ruleId: 'typescript/no-module-side-effects',
            tip: 'Move this validation into an exported function that returns err() instead of throwing',
            fix: { range: { start: statement.start, end: statement.end }, text: wrapped },
          });
          continue;
        }

        // Flag top-level ExpressionStatement with function calls (side effects)
        if (statement.type === 'ExpressionStatement') {
          const expr = statement.expression as AstNode | undefined;

          if (expr?.type === 'CallExpression' || expr?.type === 'AwaitExpression') {
            const stmtText: string = context.content.slice(statement.start, statement.end);
            const wrapped: string = `export function init(): void {\n  ${stmtText}\n}`;

            results.push({
              file: context.file,
              line: statement.loc.start.line,
              column: statement.loc.start.column + 1,
              severity: 'error',
              message:
                'Top-level function call executes on import — consider wrapping in an exported function',
              ruleId: 'typescript/no-module-side-effects',
              tip: 'Module-level calls run before consumers can handle errors',
              fix: { range: { start: statement.start, end: statement.end }, text: wrapped },
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
