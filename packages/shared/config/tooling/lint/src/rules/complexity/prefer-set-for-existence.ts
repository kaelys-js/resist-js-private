/**
 * Rule: complexity/prefer-set-for-existence
 *
 * Detects .includes() calls inside loop bodies. Array .includes() is O(n)
 * per call, so using it inside a loop creates O(n²) complexity.
 * Suggests converting to a Set for O(1) lookups.
 *
 * The auto-fix pre-computes a Set from the callee array before the loop and
 * replaces `arr.includes(x)` with `_arrSet.has(x)`.
 * Falls back to no-op when the callee is not a simple identifier.
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
import { findCallInBody } from './_utils.ts';

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
 * Get the callee object source text from an .includes() call.
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
 * Build a fix that pre-computes a Set and replaces .includes() with .has().
 *
 * @param {AstNode} includesCall - The .includes() CallExpression node
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildIncludesFix(
  includesCall: AstNode,
  loopNode: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;
  const arrText: string | null = getCalleeArrayText(includesCall, src);

  if (!arrText) {
    return NO_FIX;
  }

  /* Get the search argument */
  const args: AstNode[] = (includesCall.arguments ?? []) as AstNode[];
  const searchArg: AstNode | undefined = args[0];

  if (!searchArg) {
    return NO_FIX;
  }

  const searchText: string = nodeText(searchArg, src);
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const callStart: number = includesCall.start as number;
  const callEnd: number = includesCall.end as number;
  const indent: string = detectIndent(loopStart, src);

  /* Generate set variable */
  const safeArr: string = arrText.replace(/[^a-zA-Z0-9]/g, '_');
  const setVar: string = `_${safeArr}Set`;
  const hoisted: string = `${indent}const ${setVar}: ReadonlySet<unknown> = new Set(${arrText});\n`;

  /* Replace the .includes() call with .has() */
  const hasExpr: string = `${setVar}.has(${searchText})`;

  const beforeCall: string = src.slice(loopStart, callStart);
  const afterCall: string = src.slice(callEnd, loopEnd);

  return {
    range: { start: loopStart, end: loopEnd },
    text: hoisted + beforeCall + hasExpr + afterCall,
  };
}

/**
 * Check a loop node for .includes() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any .includes() calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];
  const found: AstNode | undefined = findCallInBody(node, 'includes');

  if (found) {
    results.push({
      file: context.file,
      line: found.loc.start.line,
      column: found.loc.start.column + 1,
      severity: 'warning',
      message: '.includes() inside loop is O(n) per iteration — use a Set for O(1) lookups',
      ruleId: 'complexity/prefer-set-for-existence',
      tip: 'Convert the array to a Set before the loop: new Set(array)',
      fix: buildIncludesFix(found, node, context),
    });
  }

  return results;
};

/** The prefer-set-for-existence lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/prefer-set-for-existence',
  description: 'Use Set for existence checks instead of .includes() in loops',
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
