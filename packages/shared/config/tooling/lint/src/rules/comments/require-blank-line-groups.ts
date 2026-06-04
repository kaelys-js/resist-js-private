/**
 * Rule: comments/require-blank-line-groups
 *
 * Enforces blank lines between statement groups for readability.
 * A blank line must appear between:
 * - A variable declaration and a following control flow statement (if/for/while/switch/return)
 * - A control flow block (if/for/while/switch/try) and a following declaration or return
 * - A return statement and any following statement (dead code, but still readable)
 *
 * @module
 */

import {
  createFixableResult,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/** Statement types that are "declarations" (const/let/var). */
const DECLARATION_TYPES: ReadonlySet<string> = new Set([
  'VariableDeclaration',
  'TSTypeAliasDeclaration',
]);

/** Statement types that are "control flow". */
const CONTROL_FLOW_TYPES: ReadonlySet<string> = new Set([
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'SwitchStatement',
  'TryStatement',
  'ReturnStatement',
  'ThrowStatement',
]);

/**
 * Classify a statement into a group.
 *
 * @param {AstNode} node - AST statement node
 * @returns {'declaration' | 'control' | 'expression' | 'other'} The group
 */
function classifyStatement(node: AstNode): 'declaration' | 'control' | 'expression' | 'other' {
  if (DECLARATION_TYPES.has(node.type)) {
    return 'declaration';
  }
  if (CONTROL_FLOW_TYPES.has(node.type)) {
    return 'control';
  }
  if (node.type === 'ExpressionStatement') {
    return 'expression';
  }
  return 'other';
}

/**
 * Check if there is a blank line between two positions in the source.
 *
 * @param {string} content - Full source text
 * @param {number} endOfFirst - End position of first statement
 * @param {number} startOfSecond - Start position of second statement
 * @returns {boolean} Whether a blank line exists between them
 */
function hasBlankLineBetween(content: string, endOfFirst: number, startOfSecond: number): boolean {
  const between: string = content.slice(endOfFirst, startOfSecond);

  return /\n\s*\n/.test(between);
}

/**
 * Check if two consecutive statements are both single-line Result guards.
 * Pattern: `if (!x.ok) { return x; }` followed by another guard or declaration.
 * These are allowed to be adjacent.
 *
 * @param {AstNode} first - First statement
 * @param {AstNode} second - Second statement
 * @returns {boolean} Whether both are single-line guards
 */
function areBothGuardClauses(first: AstNode, second: AstNode): boolean {
  // Both must be on a single line
  if (first.loc.start.line !== first.loc.end.line) {
    return false;
  }
  if (second.loc.start.line !== second.loc.end.line) {
    return false;
  }
  // Both must be if statements or declarations (guard + next guard, or guard + next const)

  const firstIsGuard: boolean = first.type === 'IfStatement';
  const secondIsGuardOrDecl: boolean =
    second.type === 'IfStatement' || second.type === 'VariableDeclaration';

  return firstIsGuard && secondIsGuardOrDecl;
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'comments/require-blank-line-groups',
  description: 'Require blank lines between declaration and control flow statement groups',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['comments', 'style'],
  fixable: true,
  stages: ['lint'],

  visitor: {
    BlockStatement(node: AstNode, context: VisitorContext): LintResult[] {
      const body = node.body as AstNode[] | undefined;

      if (!body || body.length < 2) {
        return [];
      }

      const results: LintResult[] = [];

      for (let i: number = 0; i < body.length - 1; i++) {
        const current = body[i] as AstNode | undefined;
        const next = body[i + 1] as AstNode | undefined;

        if (!current || !next) {
          continue;
        }

        const currentGroup: string = classifyStatement(current);
        const nextGroup: string = classifyStatement(next);

        // Only enforce between different groups: declaration ↔ control
        if (currentGroup === nextGroup) {
          continue;
        }
        if (currentGroup === 'other' || nextGroup === 'other') {
          continue;
        }
        if (currentGroup === 'expression' || nextGroup === 'expression') {
          continue;
        }

        // Skip adjacent single-line guard clauses (common Result pattern)
        if (areBothGuardClauses(current, next)) {
          continue;
        }

        if (!hasBlankLineBetween(context.content, current.end, next.start)) {
          /* Count newlines already separating the two statements. A blank line
           * requires TWO newlines; insert only the missing ones. Anchoring the
           * insertion at current.end (rather than next.start) places the newline(s)
           * before next's indentation, so the inserted line is truly blank and the
           * fix is idempotent (re-running finds 2 newlines and inserts nothing). */
          const between: string = context.content.slice(current.end, next.start);
          const newlines: number = (between.match(/\n/g) ?? []).length;

          results.push(
            createFixableResult(
              'comments/require-blank-line-groups',
              context.file,
              next.loc.start.line,
              1,
              'error',
              `Add a blank line between ${currentGroup} and ${nextGroup} statements for readability`,
              {
                tip: 'Add an empty line between variable declarations and control flow (if/for/return)',
                fix: {
                  range: { start: current.end, end: current.end },
                  text: '\n'.repeat(Math.max(1, 2 - newlines)),
                },
              },
            ),
          );
        }
      }

      return results;
    },

    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const body = node.body as AstNode[] | undefined;

      if (!body || body.length < 2) {
        return [];
      }

      const results: LintResult[] = [];

      for (let i: number = 0; i < body.length - 1; i++) {
        const current = body[i] as AstNode | undefined;
        const next = body[i + 1] as AstNode | undefined;

        if (!current || !next) {
          continue;
        }

        // Skip imports, exports, type declarations at module level — these have their own spacing rules
        if (
          current.type === 'ImportDeclaration' ||
          current.type === 'ExportNamedDeclaration' ||
          current.type === 'ExportDefaultDeclaration'
        ) {
          continue;
        }

        const currentGroup: string = classifyStatement(current);
        const nextGroup: string = classifyStatement(next);

        if (currentGroup === nextGroup) {
          continue;
        }
        if (currentGroup === 'other' || nextGroup === 'other') {
          continue;
        }
        if (currentGroup === 'expression' || nextGroup === 'expression') {
          continue;
        }

        if (areBothGuardClauses(current, next)) {
          continue;
        }

        if (!hasBlankLineBetween(context.content, current.end, next.start)) {
          /* Same idempotent blank-line insertion as the BlockStatement visitor:
           * insert only the missing newline(s), anchored at current.end. */
          const between: string = context.content.slice(current.end, next.start);
          const newlines: number = (between.match(/\n/g) ?? []).length;

          results.push(
            createFixableResult(
              'comments/require-blank-line-groups',
              context.file,
              next.loc.start.line,
              1,
              'error',
              `Add a blank line between ${currentGroup} and ${nextGroup} statements for readability`,
              {
                tip: 'Add an empty line between variable declarations and control flow (if/for/return)',
                fix: {
                  range: { start: current.end, end: current.end },
                  text: '\n'.repeat(Math.max(1, 2 - newlines)),
                },
              },
            ),
          );
        }
      }

      return results;
    },
  },
};

export default rule;
