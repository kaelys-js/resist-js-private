/**
 * Rule: complexity/no-index-of-in-loop
 *
 * Detects .indexOf() calls inside loop bodies. Array .indexOf() is O(n)
 * per call, so using it inside a loop creates O(n²) complexity.
 * Suggests using a Map or Set for O(1) lookups.
 *
 * The auto-fix pre-computes a Set from the array before the loop and replaces
 * common `.indexOf()` comparison patterns with `.has()`:
 *   - `arr.indexOf(x) !== -1` → `_arrSet.has(x)`
 *   - `arr.indexOf(x) === -1` → `!_arrSet.has(x)`
 *   - `arr.indexOf(x) >= 0`  → `_arrSet.has(x)`
 *   - `arr.indexOf(x) < 0`   → `!_arrSet.has(x)`
 *
 * Falls back to no-op for bare `.indexOf()` calls used for the index value itself.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  LintFix,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { walkBody, isCallTo } from './_utils.ts';

/** No-op fix sentinel. */
const NO_FIX: LintFix = { range: { start: 0, end: 0 }, text: '' };

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
 * Get the callee object source text from an indexOf call.
 *
 * @param {AstNode} callNode - The CallExpression node
 * @param {string} source - Full source text
 * @returns {string | null} Source text of the array
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
 * Find the parent BinaryExpression comparing an indexOf result to -1 or 0.
 * Walks the body looking for a BinaryExpression where one side is the indexOf call.
 *
 * @param {AstNode} loopNode - The loop node
 * @param {AstNode} indexOfCall - The indexOf CallExpression
 * @param {string} source - Source text
 * @returns {{ node: AstNode; negated: boolean } | null} The binary expression and whether the check is negated
 */
function findIndexOfComparison(
  loopNode: AstNode,
  indexOfCall: AstNode,
  source: string,
): { node: AstNode; negated: boolean } | null {
  const callStart: number = indexOfCall.start as number;
  const callEnd: number = indexOfCall.end as number;
  let result: { node: AstNode; negated: boolean } | null = null;

  walkBody(loopNode, (child: AstNode): boolean | void => {
    if (child.type !== 'BinaryExpression') {
      return;
    }

    const left: AstNode | undefined = child.left as AstNode | undefined;
    const right: AstNode | undefined = child.right as AstNode | undefined;
    const op: string = child.operator as string;

    if (!left || !right) {
      return;
    }

    /* Check if one side is the indexOf call */
    const leftIsCall: boolean =
      (left.start as number) === callStart && (left.end as number) === callEnd;
    const rightIsCall: boolean =
      (right.start as number) === callStart && (right.end as number) === callEnd;

    if (!leftIsCall && !rightIsCall) {
      return;
    }

    const otherSide: AstNode = leftIsCall ? right : left;
    const otherText: string = nodeText(otherSide, source).trim();

    /* Determine if the comparison means "found" or "not found" */
    if (leftIsCall) {
      /* indexOf(x) !== -1 → found */
      if ((op === '!==' || op === '!=') && otherText === '-1') {
        result = { node: child, negated: false };
        return true;
      }
      /* indexOf(x) === -1 → not found */
      if ((op === '===' || op === '==') && otherText === '-1') {
        result = { node: child, negated: true };
        return true;
      }
      /* indexOf(x) >= 0 → found */
      if (op === '>=' && otherText === '0') {
        result = { node: child, negated: false };
        return true;
      }
      /* indexOf(x) > -1 → found */
      if (op === '>' && otherText === '-1') {
        result = { node: child, negated: false };
        return true;
      }
      /* indexOf(x) < 0 → not found */
      if (op === '<' && otherText === '0') {
        result = { node: child, negated: true };
        return true;
      }
    }

    if (rightIsCall) {
      /* -1 !== indexOf(x) → found */
      if ((op === '!==' || op === '!=') && otherText === '-1') {
        result = { node: child, negated: false };
        return true;
      }
      /* -1 === indexOf(x) → not found */
      if ((op === '===' || op === '==') && otherText === '-1') {
        result = { node: child, negated: true };
        return true;
      }
    }
  });

  return result;
}

/**
 * Build a fix for .indexOf() in a loop.
 *
 * @param {AstNode} indexOfCall - The indexOf CallExpression
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildIndexOfFix(
  indexOfCall: AstNode,
  loopNode: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;
  const arrText: string | null = getCalleeArrayText(indexOfCall, src);

  if (!arrText) {
    return NO_FIX;
  }

  /* Find if indexOf is used in a comparison pattern */
  const comparison: { node: AstNode; negated: boolean } | null = findIndexOfComparison(
    loopNode,
    indexOfCall,
    src,
  );

  if (!comparison) {
    /* Bare indexOf call — used for the index value, can't replace with Set */
    return NO_FIX;
  }

  /* Get the search argument */
  const args: AstNode[] = (indexOfCall.arguments ?? []) as AstNode[];
  const searchArg: AstNode | undefined = args[0];

  if (!searchArg) {
    return NO_FIX;
  }

  const searchText: string = nodeText(searchArg, src);
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const indent: string = detectIndent(loopStart, src);

  /* Generate set variable */
  const safeArr: string = arrText.replace(/[^a-zA-Z0-9]/g, '_');
  const setVar: string = `_${safeArr}Set`;
  const hoisted: string = `${indent}const ${setVar}: ReadonlySet<unknown> = new Set(${arrText});\n`;

  /* Replace the comparison with .has() */
  const compStart: number = comparison.node.start as number;
  const compEnd: number = comparison.node.end as number;
  const hasExpr: string = comparison.negated
    ? `!${setVar}.has(${searchText})`
    : `${setVar}.has(${searchText})`;

  const beforeComp: string = src.slice(loopStart, compStart);
  const afterComp: string = src.slice(compEnd, loopEnd);

  return {
    range: { start: loopStart, end: loopEnd },
    text: hoisted + beforeComp + hasExpr + afterComp,
  };
}

/**
 * Check a loop node for .indexOf() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any .indexOf() calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];
  let found: AstNode | undefined;

  walkBody(node, (child: AstNode): boolean | void => {
    if (isCallTo(child, 'indexOf')) {
      found = child;
      return true;
    }
  });

  if (found) {
    results.push({
      file: context.file,
      line: found.loc.start.line,
      column: found.loc.start.column + 1,
      severity: 'warning',
      message: '.indexOf() inside loop creates O(n²) complexity',
      ruleId: 'complexity/no-index-of-in-loop',
      tip: 'Use a Set or Map for O(1) lookups instead of .indexOf()',
      fix: buildIndexOfFix(found, node, context),
    });
  }

  return results;
};

/** The no-index-of-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-index-of-in-loop',
  description: 'Avoid .indexOf() inside loops — use Map or Set instead',
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
