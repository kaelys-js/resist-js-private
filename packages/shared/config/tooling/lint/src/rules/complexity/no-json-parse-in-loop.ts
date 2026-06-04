/**
 * Rule: complexity/no-json-parse-in-loop
 *
 * Detects JSON.parse() and JSON.stringify() calls inside loop bodies.
 * These operations are expensive and should be performed outside loops
 * when the input does not change between iterations.
 *
 * The auto-fix hoists the call before the loop ONLY when its argument is an
 * invariant literal (a string literal or zero-expression template), the call is
 * the loop's own body (no intervening nested loop / function), and it is the
 * loop's only JSON call. Every other shape falls back to no-op.
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
import { findStaticMemberCallInBody, walkBody } from './_utils.ts';

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

/** Node types that introduce a new loop or function scope boundary. */
const SCOPE_BOUNDARY_TYPES: ReadonlySet<string> = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

/**
 * Whether the call's argument is loop-invariant by construction: a string
 * `Literal` or a `TemplateLiteral` with zero `${}` expressions. Such a value is
 * identical on every iteration, so hoisting is always safe.
 *
 * @param {AstNode} argNode - The first argument node
 * @returns {boolean} True if the argument is an invariant literal
 */
function isInvariantLiteralArg(argNode: AstNode): boolean {
  if (
    (argNode.type === 'Literal' || argNode.type === 'StringLiteral') &&
    typeof argNode.value === 'string'
  ) {
    return true;
  }

  if (argNode.type === 'TemplateLiteral') {
    const expressions: AstNode[] = (argNode.expressions ?? []) as AstNode[];

    return expressions.length === 0;
  }

  return false;
}

/**
 * Whether `callNode` lives in the loop's OWN body — i.e. there is no nested
 * loop or function between the loop and the call. Verified by walking down from
 * the loop body and refusing to descend through any nested scope boundary.
 *
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {AstNode} callNode - The JSON call to locate
 * @returns {boolean} True if the call is directly in the loop's own body
 */
function isInOwnLoopBody(loopNode: AstNode, callNode: AstNode): boolean {
  const body: AstNode | undefined = loopNode.body as AstNode | undefined;

  if (!body) {
    return false;
  }

  const callStart: number = callNode.start as number;
  const callEnd: number = callNode.end as number;
  let found: boolean = false;

  const visit = (node: AstNode): void => {
    if ((node.start as number) === callStart && (node.end as number) === callEnd) {
      found = true;
      return;
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'type' || key === 'start' || key === 'end') {
        continue;
      }

      const value: unknown = node[key];
      const children: unknown[] = Array.isArray(value) ? value : [value];

      for (const item of children) {
        if (item === null || typeof item !== 'object' || !('type' in item)) {
          continue;
        }

        const child: AstNode = item as AstNode;

        /* Do not descend into a nested loop / function — a call inside one is
         * NOT part of this loop's own body. */
        if (SCOPE_BOUNDARY_TYPES.has(child.type)) {
          continue;
        }

        visit(child);

        if (found) {
          return;
        }
      }
    }
  };

  visit(body);
  return found;
}

/**
 * Count `JSON.parse(...)` and `JSON.stringify(...)` calls within a subtree.
 *
 * @param {AstNode} node - Root node of the subtree
 * @returns {number} Total number of JSON.parse / JSON.stringify calls
 */
function countJsonCalls(node: AstNode): number {
  let count: number = 0;

  walkBody(node, (child: AstNode): void => {
    if (child.type !== 'CallExpression') {
      return;
    }

    const callee: AstNode | undefined = child.callee as AstNode | undefined;

    if (
      !callee ||
      (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression')
    ) {
      return;
    }

    const obj: AstNode | undefined = callee.object as AstNode | undefined;
    const prop: AstNode | undefined = callee.property as AstNode | undefined;

    if (
      obj?.type === 'Identifier' &&
      (obj.name as string) === 'JSON' &&
      prop &&
      ((prop.name as string) === 'parse' || (prop.name as string) === 'stringify')
    ) {
      count++;
    }
  });

  return count;
}

/**
 * Build a fix that hoists a JSON.parse/stringify call before the loop.
 *
 * Fires ONLY when the first argument is an invariant literal (string literal or
 * zero-expression template), the call is the loop's own body (no intervening
 * loop / function), and it is the loop's only JSON call (a single fix range
 * cannot express two non-overlapping hoists). The hoist var name embeds the
 * call's start offset to stay unique within the file.
 *
 * @param {string} jsonMethod - "parse" or "stringify"
 * @param {AstNode} callNode - The CallExpression node
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildJsonFix(
  jsonMethod: string,
  callNode: AstNode,
  loopNode: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;
  const args: AstNode[] = (callNode.arguments ?? []) as AstNode[];
  const [firstArg] = args;

  if (!firstArg) {
    return NO_FIX;
  }

  /* The argument must be an invariant literal — a literal cannot depend on the
   * loop variable, so hoisting is unconditionally safe. Every non-literal
   * argument NO_OPs. */
  if (!isInvariantLiteralArg(firstArg)) {
    return NO_FIX;
  }

  /* Must be the loop's own body — not nested in an inner loop / function. */
  if (!isInOwnLoopBody(loopNode, callNode)) {
    return NO_FIX;
  }

  /* Only one JSON call in the loop: the single fix range below spans
   * [loopStart, loopEnd], so two such fixes would overlap and corrupt code. */
  if (countJsonCalls(loopNode) !== 1) {
    return NO_FIX;
  }

  const callText: string = nodeText(callNode, src);
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const callStart: number = callNode.start as number;
  const callEnd: number = callNode.end as number;
  const indent: string = detectIndent(loopStart, src);

  /* Uniquify by the call's start offset to avoid collisions across loops. */
  const prefix: string = jsonMethod === 'parse' ? '_cachedParsed' : '_cachedStringified';
  const varName: string = `${prefix}${callStart}`;
  const hoisted: string = `${indent}const ${varName} = ${callText};\n`;

  const beforeCall: string = src.slice(loopStart, callStart);
  const afterCall: string = src.slice(callEnd, loopEnd);

  return {
    range: { start: loopStart, end: loopEnd },
    text: hoisted + beforeCall + varName + afterCall,
  };
}

/**
 * Check a loop node for JSON.parse()/JSON.stringify() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any JSON serialization calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  const parseCall: AstNode | undefined = findStaticMemberCallInBody(node, 'JSON', 'parse');

  if (parseCall) {
    results.push({
      file: context.file,
      line: parseCall.loc.start.line,
      column: parseCall.loc.start.column + 1,
      severity: 'warning',
      message: 'JSON.parse()/JSON.stringify() inside loop is expensive — cache or restructure',
      ruleId: 'complexity/no-json-parse-in-loop',
      tip: 'Parse/stringify outside the loop when possible',
      fix: buildJsonFix('parse', parseCall, node, context),
    });
  }

  const stringifyCall: AstNode | undefined = findStaticMemberCallInBody(node, 'JSON', 'stringify');

  if (stringifyCall) {
    results.push({
      file: context.file,
      line: stringifyCall.loc.start.line,
      column: stringifyCall.loc.start.column + 1,
      severity: 'warning',
      message: 'JSON.parse()/JSON.stringify() inside loop is expensive — cache or restructure',
      ruleId: 'complexity/no-json-parse-in-loop',
      tip: 'Parse/stringify outside the loop when possible',
      fix: buildJsonFix('stringify', stringifyCall, node, context),
    });
  }

  return results;
};

/** The no-json-parse-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-json-parse-in-loop',
  description: 'Avoid JSON.parse()/JSON.stringify() inside loops',
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
