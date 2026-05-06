/**
 * Rule: complexity/no-sort-in-loop
 *
 * Detects .sort() calls inside loop bodies. Sorting inside a loop creates
 * O(n² log n) complexity since each iteration sorts the array again.
 * The sort should be performed once before or after the loop.
 *
 * The auto-fix hoists the `.sort()` call before the loop when the callee
 * array is a simple identifier that does not depend on the loop variable.
 * Falls back to no-op for dynamic or loop-dependent arrays.
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
import { findCallInBody } from './_utils.ts';

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
 * Extract the loop iteration variable name from a loop node.
 *
 * @param {AstNode} loopNode - The loop AST node
 * @param {string} source - Source text
 * @returns {string | null} The loop variable name or null
 */
function getLoopVar(loopNode: AstNode, source: string): string | null {
  if (loopNode.type === 'ForOfStatement' || loopNode.type === 'ForInStatement') {
    const left: AstNode | undefined = loopNode.left as AstNode | undefined;

    if (!left) {
      return null;
    }

    if (left.type === 'VariableDeclaration') {
      const declarations: AstNode[] = (left.declarations ?? []) as AstNode[];
      const [first] = declarations;

      if (first) {
        const id: AstNode | undefined = first.id as AstNode | undefined;

        if (id?.type === 'Identifier') {
          return id.name as string;
        }

        if (id) {
          return nodeText(id, source);
        }
      }
    }

    if (left.type === 'Identifier') {
      return left.name as string;
    }
  }

  if (loopNode.type === 'ForStatement') {
    const init: AstNode | undefined = loopNode.init as AstNode | undefined;

    if (init?.type === 'VariableDeclaration') {
      const declarations: AstNode[] = (init.declarations ?? []) as AstNode[];
      const [first] = declarations;

      if (first) {
        const id: AstNode | undefined = first.id as AstNode | undefined;

        if (id?.type === 'Identifier') {
          return id.name as string;
        }
      }
    }
  }

  return null;
}

/**
 * Get the callee object text from a .sort() call.
 *
 * @param {AstNode} callNode - The CallExpression node
 * @param {string} source - Full source text
 * @returns {string | null} Source text of the array being sorted
 */
function getCalleeArrayText(callNode: AstNode, source: string): string | null {
  const callee: AstNode | undefined = callNode.callee as AstNode | undefined;

  if (!callee) {
    return null;
  }

  if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
    const obj: AstNode | undefined = callee.object as AstNode | undefined;

    if (obj) {
      return nodeText(obj, source);
    }
  }

  return null;
}

/**
 * Build a fix that hoists a .sort() call before the loop.
 *
 * @param {AstNode} sortCall - The .sort() CallExpression node
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildSortFix(sortCall: AstNode, loopNode: AstNode, context: VisitorContext): LintFix {
  const src: string = context.content;
  const arrText: string | null = getCalleeArrayText(sortCall, src);

  if (!arrText) {
    return NO_FIX;
  }

  /* Check if the array depends on the loop variable */
  const loopVar: string | null = getLoopVar(loopNode, src);

  if (loopVar) {
    const wordBoundary: RegExp = new RegExp(
      `\\b${loopVar.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\b`,
    );

    if (wordBoundary.test(arrText)) {
      return NO_FIX;
    }
  } else {
    /* While loop — can't determine loop variable, unsafe to hoist */
    return NO_FIX;
  }

  const callText: string = nodeText(sortCall, src);
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const callStart: number = sortCall.start as number;
  const callEnd: number = sortCall.end as number;
  const indent: string = detectIndent(loopStart, src);

  /* Hoist the sort call as a statement before the loop, replace inline usage
   * with just the array name (since .sort() returns the same array) */
  const hoisted: string = `${indent}${callText};\n`;

  const beforeCall: string = src.slice(loopStart, callStart);
  const afterCall: string = src.slice(callEnd, loopEnd);

  return {
    range: { start: loopStart, end: loopEnd },
    text: hoisted + beforeCall + arrText + afterCall,
  };
}

/**
 * Check a loop node for .sort() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any sort calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  const found: AstNode | undefined = findCallInBody(node, 'sort');

  if (found) {
    results.push({
      file: context.file,
      line: found.loc.start.line,
      column: found.loc.start.column + 1,
      severity: 'warning',
      message: '.sort() inside loop creates O(n² log n) complexity',
      ruleId: 'complexity/no-sort-in-loop',
      tip: 'Sort the array once before or after the loop',
      fix: buildSortFix(found, node, context),
    });
  }

  return results;
};

/** The no-sort-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-sort-in-loop',
  description: 'Avoid .sort() inside loops — O(n² log n) complexity',
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
