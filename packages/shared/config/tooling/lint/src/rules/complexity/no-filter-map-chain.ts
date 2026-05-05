/**
 * Rule: complexity/no-filter-map-chain
 *
 * Detects .filter().map() chains that traverse the array twice.
 * A single-pass .reduce() or for...of loop achieves the same result
 * with half the iterations.
 *
 * The auto-fix merges `.filter(pred).map(transform)` into a single `for...of`
 * loop when both callbacks are inline arrow expression functions.
 * Falls back to no-op for named functions, block bodies, or complex chains.
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
import { isCallTo } from './_utils.ts';

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
 * Extract the parameter name and expression body from an arrow function callback.
 *
 * @param {AstNode} callNode - A CallExpression node
 * @param {string} source - Full source text
 * @returns {{ param: string; body: string } | null} Param name and body expression
 */
function extractArrowCallback(
  callNode: AstNode,
  source: string,
): { param: string; body: string } | null {
  const args: AstNode[] = (callNode.arguments ?? []) as AstNode[];
  const firstArg: AstNode | undefined = args[0];

  if (!firstArg || firstArg.type !== 'ArrowFunctionExpression') {
    return null;
  }

  const bodyNode: AstNode | undefined = firstArg.body as AstNode | undefined;

  if (!bodyNode || bodyNode.type === 'FunctionBody') {
    /* Block body — too complex to merge safely */
    return null;
  }

  const params: AstNode[] = (firstArg.params ?? []) as AstNode[];
  const firstParam: AstNode | undefined = params[0];

  if (!firstParam) {
    return null;
  }

  let paramName: string;

  if (firstParam.type === 'Identifier') {
    paramName = firstParam.name as string;
  } else if (firstParam.type === 'FormalParameter') {
    const binding: AstNode | undefined = firstParam.pattern as AstNode | undefined;

    if (binding?.type === 'Identifier') {
      paramName = binding.name as string;
    } else {
      return null;
    }
  } else {
    return null;
  }

  return { param: paramName, body: nodeText(bodyNode, source) };
}

/**
 * Extract the source array from a `.filter()` call's callee.
 *
 * @param {AstNode} filterCall - The filter CallExpression
 * @param {string} source - Full source text
 * @returns {string | null} Source text of the array being filtered
 */
function extractFilterSource(filterCall: AstNode, source: string): string | null {
  const callee: AstNode | undefined = filterCall.callee as AstNode | undefined;

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
 * Build a fix that merges `.filter(pred).map(transform)` into a `for...of` loop.
 *
 * @param {AstNode} mapCall - The outer .map() CallExpression
 * @param {AstNode} filterCall - The inner .filter() CallExpression
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildFilterMapFix(
  mapCall: AstNode,
  filterCall: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;

  const filterCb: { param: string; body: string } | null = extractArrowCallback(filterCall, src);
  const mapCb: { param: string; body: string } | null = extractArrowCallback(mapCall, src);

  if (!filterCb || !mapCb) {
    return NO_FIX;
  }

  const arrText: string | null = extractFilterSource(filterCall, src);

  if (!arrText) {
    return NO_FIX;
  }

  const chainStart: number = mapCall.start as number;
  const chainEnd: number = mapCall.end as number;
  const indent: string = detectIndent(chainStart, src);

  /* Use the filter param as the loop variable. If the map callback uses a different
   * param name, inline-substitute it in the map body. */
  const loopVar: string = filterCb.param;
  let mapBody: string = mapCb.body;

  if (mapCb.param !== loopVar) {
    /* Simple textual substitution — works for identifier references */
    mapBody = mapBody.replaceAll(mapCb.param, loopVar);
  }

  const resultVar: string = '_result';
  const forLoop: string =
    `(() => {\n` +
    `${indent}  const ${resultVar}: Array<unknown> = [];\n` +
    `${indent}  for (const ${loopVar} of ${arrText}) {\n` +
    `${indent}    if (${filterCb.body}) {\n` +
    `${indent}      ${resultVar}.push(${mapBody});\n` +
    `${indent}    }\n` +
    `${indent}  }\n` +
    `${indent}  return ${resultVar};\n` +
    `${indent}})()`;

  return {
    range: { start: chainStart, end: chainEnd },
    text: forLoop,
  };
}

/** The no-filter-map-chain lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-filter-map-chain',
  description: 'Avoid .filter().map() chains — use a single-pass reduce or for...of',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    /**
     * Check if a CallExpression is a .map() call chained on a .filter() call.
     *
     * @param {AstNode} node - The CallExpression AST node
     * @param {VisitorContext} context - The visitor context
     * @returns {LintResult[]} Diagnostics if .filter().map() chain is found
     */
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (!isCallTo(node, 'map')) {
        return results;
      }

      const { callee } = node;

      if (callee === null || typeof callee !== 'object') {
        return results;
      }

      const calleeNode: AstNode = callee as AstNode;

      if (calleeNode.type !== 'StaticMemberExpression' && calleeNode.type !== 'MemberExpression') {
        return results;
      }

      const obj: unknown = calleeNode.object;

      if (obj === null || typeof obj !== 'object') {
        return results;
      }

      const objNode: AstNode = obj as AstNode;

      if (objNode.type !== 'CallExpression') {
        return results;
      }

      if (isCallTo(objNode, 'filter')) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message:
            '.filter().map() traverses the array twice — use .reduce() or for...of for a single pass',
          ruleId: 'complexity/no-filter-map-chain',
          tip: 'Use a single .reduce() or for...of loop to filter and transform in one pass',
          fix: buildFilterMapFix(node, objNode, context),
        });
      }

      return results;
    },
  },
};

export default rule;
