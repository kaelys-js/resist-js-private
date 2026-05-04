/**
 * Rule: complexity/no-regex-in-loop
 *
 * Detects new RegExp() calls inside loop bodies. Creating a regex inside a loop
 * recompiles the pattern on every iteration, wasting CPU. The regex should be
 * declared once before the loop and reused.
 *
 * The auto-fix hoists the `new RegExp(...)` call before the loop when all
 * constructor arguments are literals (loop-invariant). Falls back to no-op
 * when arguments depend on the loop variable.
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
import { findNewExprInBody } from './_utils.ts';

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
      const first: AstNode | undefined = declarations[0];

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
      const first: AstNode | undefined = declarations[0];

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
 * @param {AstNode} argNode - The argument node
 * @param {string | null} loopVarName - The loop variable name
 * @param {string} source - Source text
 * @returns {boolean} True if the argument depends on the loop variable
 */
function dependsOnLoopVar(argNode: AstNode, loopVarName: string | null, source: string): boolean {
  if (!loopVarName) {
    return true;
  }

  const argText: string = nodeText(argNode, source);
  const wordBoundary: RegExp = new RegExp(
    `\\b${loopVarName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
  );

  return wordBoundary.test(argText);
}

/**
 * Build a fix that hoists a new RegExp() call before the loop.
 *
 * @param {AstNode} newExprNode - The NewExpression node
 * @param {AstNode} loopNode - The enclosing loop node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildRegexFix(newExprNode: AstNode, loopNode: AstNode, context: VisitorContext): LintFix {
  const src: string = context.content;
  const args: AstNode[] = (newExprNode.arguments ?? []) as AstNode[];

  if (args.length === 0) {
    return NO_FIX;
  }

  const loopVar: string | null = getLoopVar(loopNode, src);

  /* Check if any argument depends on the loop variable */
  for (const arg of args) {
    if (dependsOnLoopVar(arg, loopVar, src)) {
      return NO_FIX;
    }
  }

  const callText: string = nodeText(newExprNode, src);
  const loopStart: number = loopNode.start as number;
  const loopEnd: number = loopNode.end as number;
  const callStart: number = newExprNode.start as number;
  const callEnd: number = newExprNode.end as number;
  const indent: string = detectIndent(loopStart, src);

  const varName: string = '_cachedRegex';
  const hoisted: string = `${indent}const ${varName} = ${callText};\n`;

  const beforeCall: string = src.slice(loopStart, callStart);
  const afterCall: string = src.slice(callEnd, loopEnd);

  return {
    range: { start: loopStart, end: loopEnd },
    text: hoisted + beforeCall + varName + afterCall,
  };
}

/**
 * Check a loop node for new RegExp() calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any RegExp construction found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  const found: AstNode | undefined = findNewExprInBody(node, 'RegExp');

  if (found) {
    results.push({
      file: context.file,
      line: found.loc.start.line,
      column: found.loc.start.column + 1,
      severity: 'warning',
      message: 'new RegExp() inside loop recompiles on every iteration',
      ruleId: 'complexity/no-regex-in-loop',
      tip: 'Declare the RegExp before the loop: const re = new RegExp(...)',
      fix: buildRegexFix(found, node, context),
    });
  }

  return results;
};

/** The no-regex-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-regex-in-loop',
  description: 'Compile regex outside loops — avoid new RegExp() in loop body',
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
