/**
 * Rule: complexity/no-json-parse-in-loop
 *
 * Detects JSON.parse() and JSON.stringify() calls inside loop bodies.
 * These operations are expensive and should be performed outside loops
 * when the input does not change between iterations.
 *
 * The auto-fix hoists the call before the loop when the argument is a simple
 * identifier that does NOT match the loop's iteration variable (i.e., the
 * argument is loop-invariant). Falls back to no-op when the argument depends
 * on the loop variable.
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
import { findStaticMemberCallInBody } from './_utils.ts';

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
 * For `for (const x of arr)` → "x"
 * For `for (let i = 0; ...)` → "i"
 * For `while (...)` → null (no iteration variable)
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

    /* VariableDeclaration with a single declarator */
    if (left.type === 'VariableDeclaration') {
      const declarations: AstNode[] = (left.declarations ?? []) as AstNode[];
      const [first] = declarations;

      if (first) {
        const id: AstNode | undefined = first.id as AstNode | undefined;

        if (id?.type === 'Identifier') {
          return id.name as string;
        }

        /* Destructured — return the full pattern text */
        if (id) {
          return nodeText(id, source);
        }
      }
    }

    /* Bare identifier assignment */
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
 * Check if an argument depends on the loop variable.
 *
 * Simple heuristic: if the argument source text contains the loop variable name
 * as a word boundary, it's loop-dependent.
 *
 * @param {AstNode} argNode - The argument node
 * @param {string | null} loopVarName - The loop variable name
 * @param {string} source - Source text
 * @returns {boolean} True if the argument depends on the loop variable
 */
function dependsOnLoopVar(argNode: AstNode, loopVarName: string | null, source: string): boolean {
  if (!loopVarName) {
    /* While loop — can't determine, assume dependent (unsafe to hoist) */
    return true;
  }

  const argText: string = nodeText(argNode, source);
  const wordBoundary: RegExp = new RegExp(
    `\\b${loopVarName.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\\b`,
  );

  return wordBoundary.test(argText);
}

/**
 * Build a fix that hoists a JSON.parse/stringify call before the loop.
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

  const loopVar: string | null = getLoopVar(loopNode, src);

  /* Only fix when argument is loop-invariant */
  if (dependsOnLoopVar(firstArg, loopVar, src)) {
    return NO_FIX;
  }

  const callText: string = nodeText(callNode, src);
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const callStart: number = callNode.start as number;
  const callEnd: number = callNode.end as number;
  const indent: string = detectIndent(loopStart, src);

  const varName: string = jsonMethod === 'parse' ? '_cachedParsed' : '_cachedStringified';
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
