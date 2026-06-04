/**
 * Rule: complexity/no-concat-in-loop
 *
 * Detects string concatenation (+=) or .concat() calls inside loop bodies.
 * String concatenation in loops creates O(n²) complexity because strings are
 * immutable and each concatenation copies the entire string.
 * Suggests collecting parts in an array and joining after the loop.
 *
 * The auto-fix fires only for the provably-safe shape: a plain `let acc = ''`
 * declared immediately before the loop, written exactly once via `acc += expr`
 * as a direct statement of the loop body and never read elsewhere in it. It
 * replaces BOTH the declaration and the loop — `const _accParts: string[] = [];`
 * before, `acc += expr` → `_accParts.push(expr)` inside, and
 * `const acc = _accParts.join('')` after. Falls back to no-op for `.concat()`,
 * numeric `+=`, compound LHS, conditional/nested/multiple `+=`, or a missing
 * `let acc = ''` immediately before the loop.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type LintFix,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';
import { findPlusAssignInBody, findCallInBody, walkBody } from './_utils.ts';

/** No-op fix sentinel. */
const NO_FIX: LintFix = NO_OP_FIX;

/**
 * Extract source text for an AST node.
 *
 * @param {AstNode} astNode - Node with start/end byte offsets
 * @param {string} source - Full source text
 * @returns {string} The node's source text
 */
function nodeText(astNode: AstNode, source: string): string {
  return source.slice(astNode.start as number, astNode.end as number);
}

/**
 * Detect indentation at a byte offset.
 *
 * @param {number} offset - Byte offset
 * @param {string} source - Full source text
 * @returns {string} Whitespace prefix of the line
 */
function detectIndent(offset: number, source: string): string {
  let lineStart: number = offset;

  while (lineStart > 0 && source[lineStart - 1] !== '\n') {
    lineStart--;
  }

  let end: number = lineStart;

  while (end < source.length && (source[end] === ' ' || source[end] === '\t')) {
    end++;
  }

  return source.slice(lineStart, end);
}

/**
 * Count occurrences of a given identifier name within a subtree.
 *
 * @param {AstNode} node - Root node of the subtree
 * @param {string} name - Identifier name to count
 * @returns {number} Number of `Identifier` nodes with that name
 */
function countIdentifier(node: AstNode, name: string): number {
  let count: number = 0;

  walkBody(node, (child: AstNode): void => {
    if (child.type === 'Identifier' && (child.name as string) === name) {
      count++;
    }
  });

  /* walkBody visits children but not the root; include the root itself */
  if (node.type === 'Identifier' && (node.name as string) === name) {
    count++;
  }

  return count;
}

/**
 * Count `+=` assignment expressions in a subtree whose LHS is the named identifier.
 *
 * @param {AstNode} node - Root node of the subtree
 * @param {string} name - The accumulator identifier name
 * @returns {number} Number of matching `+=` assignments
 */
function countPlusAssignTo(node: AstNode, name: string): number {
  let count: number = 0;

  walkBody(node, (child: AstNode): void => {
    if (child.type === 'AssignmentExpression' && (child.operator as string) === '+=') {
      const left: AstNode | undefined = child.left as AstNode | undefined;

      if (left && left.type === 'Identifier' && (left.name as string) === name) {
        count++;
      }
    }
  });

  return count;
}

/**
 * Find the loop body's direct statement list (a BlockStatement's `body`, or a
 * single unbraced statement wrapped in a one-element array).
 *
 * @param {AstNode} loopNode - The loop node
 * @returns {AstNode[]} The loop body's direct child statements
 */
function loopBodyStatements(loopNode: AstNode): AstNode[] {
  const body: AstNode | undefined = loopNode.body as AstNode | undefined;

  if (!body) {
    return [];
  }

  if (body.type === 'BlockStatement') {
    return (body.body ?? []) as AstNode[];
  }

  /* Unbraced single-statement body (e.g. `for (...) acc += x;`) */
  return [body];
}

/**
 * Find the statement immediately preceding `loopNode` in whatever statement
 * list contains it (Program body, a BlockStatement, etc.).
 *
 * @param {AstNode} root - The full-program AST root to search
 * @param {AstNode} loopNode - The loop whose predecessor we want
 * @returns {AstNode | null} The immediately-preceding statement, or null
 */
function findPrecedingStatement(root: AstNode, loopNode: AstNode): AstNode | null {
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  let found: AstNode | null = null;

  const visit = (node: AstNode): boolean => {
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'type' || key === 'start' || key === 'end') {
        continue;
      }

      const value: unknown = node[key];

      if (Array.isArray(value)) {
        for (let i: number = 0; i < value.length; i++) {
          const item: unknown = value[i];

          if (item === null || typeof item !== 'object' || !('type' in item)) {
            continue;
          }

          const child: AstNode = item as AstNode;

          if ((child.start as number) === loopStart && (child.end as number) === loopEnd) {
            const prev: unknown = value[i - 1];

            if (prev !== null && typeof prev === 'object' && 'type' in (prev as object)) {
              found = prev as AstNode;
            }
            return true;
          }

          if (visit(child)) {
            return true;
          }
        }
      } else if (
        value !== null &&
        typeof value === 'object' &&
        'type' in (value as object) &&
        visit(value as AstNode)
      ) {
        return true;
      }
    }

    return false;
  };

  visit(root);
  return found;
}

/**
 * Generate an array variable name based on the accumulator name, uniquified by
 * scanning the source so it does not collide with an existing identifier.
 *
 * @param {string} accName - The accumulator identifier name
 * @param {string} source - Full source text
 * @returns {string} A unique `string[]` parts variable name
 */
function uniqueArrayVar(accName: string, source: string): string {
  const base: string = `_${accName}Parts`;

  if (!new RegExp(`\\b${base.replaceAll(/[^a-zA-Z0-9_]/g, '_')}\\b`).test(source)) {
    return base;
  }

  let n: number = 2;

  while (new RegExp(`\\b${base}${n}\\b`).test(source)) {
    n++;
  }

  return `${base}${n}`;
}

/**
 * Build a fix for `acc += expr` string concatenation inside a loop.
 *
 * Only fires for the provably-safe shape: `acc` is a plain identifier declared
 * `let acc = ''` in the statement immediately before the loop, written exactly
 * once via `+=` as a direct statement child of the loop body, and never read
 * elsewhere in the body. The fix replaces the declaration AND the loop:
 *   `const _accParts: string[] = [];` + loop with `acc += e` → `_accParts.push(e)`
 *   + `const acc = _accParts.join('');` after the loop.
 *
 * Returns NO_FIX for numeric `+=`, compound LHS, conditional/nested `+=`,
 * multiple `+=`, reads of `acc`, or a missing `let acc = ''` just before.
 *
 * @param {AstNode} assignNode - The AssignmentExpression node
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildPlusAssignFix(
  assignNode: AstNode,
  loopNode: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;

  /* LHS must be a plain identifier (e.g. `result += ...`); a member LHS such as
   * `obj.s += x` is a compound target and is not rewritable. */
  const left: AstNode | undefined = assignNode.left as AstNode | undefined;

  if (!left || left.type !== 'Identifier') {
    return NO_FIX;
  }

  const accName: string = left.name as string;

  const right: AstNode | undefined = assignNode.right as AstNode | undefined;

  if (!right) {
    return NO_FIX;
  }

  /* The `+=` must be a DIRECT ExpressionStatement child of the loop body —
   * not nested in an `if`/inner block (which would make the rewrite wrong). */
  const directChild: boolean = loopBodyStatements(loopNode).some(
    (stmt: AstNode): boolean =>
      stmt.type === 'ExpressionStatement' &&
      ((stmt.expression as AstNode | undefined)?.start as number) ===
        (assignNode.start as number) &&
      ((stmt.expression as AstNode | undefined)?.end as number) === (assignNode.end as number),
  );

  if (!directChild) {
    return NO_FIX;
  }

  /* Exactly one `+=` to acc, and acc read nowhere else in the body. The single
   * `acc` identifier occurrence is the LHS of our matched assignment. */
  if (countPlusAssignTo(loopNode, accName) !== 1) {
    return NO_FIX;
  }

  const body: AstNode | undefined = loopNode.body as AstNode | undefined;

  if (!body || countIdentifier(body, accName) !== 1) {
    return NO_FIX;
  }

  /* acc must be declared `let acc = ''` (empty string literal) in the statement
   * IMMEDIATELY before the loop. */
  const prev: AstNode | null = findPrecedingStatement(context.ast, loopNode);

  if (!prev || prev.type !== 'VariableDeclaration' || (prev.kind as string) !== 'let') {
    return NO_FIX;
  }

  const declarations: AstNode[] = (prev.declarations ?? []) as AstNode[];

  if (declarations.length !== 1) {
    return NO_FIX;
  }

  const [declarator] = declarations;
  const declId: AstNode | undefined = declarator?.id as AstNode | undefined;
  const declInit: AstNode | undefined = declarator?.init as AstNode | undefined;

  if (
    !declId ||
    declId.type !== 'Identifier' ||
    (declId.name as string) !== accName ||
    !declInit ||
    declInit.type !== 'Literal' ||
    typeof declInit.value !== 'string' ||
    declInit.value !== ''
  ) {
    return NO_FIX;
  }

  /* Build the combined declaration+loop replacement. */
  const rhsText: string = nodeText(right, src);
  const declStart: number = prev.start as number;
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const assignStart: number = assignNode.start as number;
  const assignEnd: number = assignNode.end as number;
  const indent: string = detectIndent(loopStart, src);

  const partsVar: string = uniqueArrayVar(accName, src);
  const pushCall: string = `${partsVar}.push(${rhsText})`;

  /* Source between the loop start and the assignment, and between the
   * assignment and the loop end — preserves the loop header + body framing. */
  const beforeAssign: string = src.slice(loopStart, assignStart);
  const afterAssign: string = src.slice(assignEnd, loopEnd);

  /* The replacement spans [declStart, loopEnd]. The indentation that precedes
   * `declStart` is OUTSIDE the range and stays put — it indents the first
   * emitted line (the array decl). We re-supply `indent` before the loop and
   * before the trailing join. The original whitespace between the decl and the
   * loop is inside the range and is dropped. */
  const arrayDecl: string = `const ${partsVar}: string[] = [];`;
  const joined: string = `\n${indent}const ${accName} = ${partsVar}.join('');`;

  return {
    range: { start: declStart, end: loopEnd },
    text: `${arrayDecl}\n${indent}${beforeAssign}${pushCall}${afterAssign}${joined}`,
  };
}

/**
 * Check a loop node for string concatenation patterns in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any concatenation patterns found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  const plusAssign: AstNode | undefined = findPlusAssignInBody(node);

  if (plusAssign) {
    results.push({
      file: context.file,
      line: plusAssign.loc.start.line,
      column: plusAssign.loc.start.column + 1,
      severity: 'warning',
      message:
        'String concatenation inside loop creates O(n²) complexity — use array.join() or template literals',
      ruleId: 'complexity/no-concat-in-loop',
      tip: 'Collect parts in an array and call .join() after the loop',
      fix: buildPlusAssignFix(plusAssign, node, context),
    });
  }

  const concatCall: AstNode | undefined = findCallInBody(node, 'concat');

  if (concatCall) {
    results.push({
      file: context.file,
      line: concatCall.loc.start.line,
      column: concatCall.loc.start.column + 1,
      severity: 'warning',
      message:
        'String concatenation inside loop creates O(n²) complexity — use array.join() or template literals',
      ruleId: 'complexity/no-concat-in-loop',
      tip: 'Collect parts in an array and call .join() after the loop',
      fix: NO_FIX,
    });
  }

  return results;
};

/** The no-concat-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-concat-in-loop',
  description: 'Avoid string concatenation (+=) or .concat() inside loops',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    ForStatement: checkLoop,
    ForOfStatement: checkLoop,
    WhileStatement: checkLoop,
  },
};

export default rule;
