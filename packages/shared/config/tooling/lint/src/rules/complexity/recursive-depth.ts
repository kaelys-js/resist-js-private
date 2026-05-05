/**
 * Rule: complexity/recursive-depth
 *
 * Detects recursive functions that lack a depth or limit parameter.
 * Unbounded recursion can overflow the call stack. A depth parameter with
 * a default value ensures the recursion terminates.
 *
 * The auto-fix adds a `depth: number = 0` parameter, inserts an
 * `if (depth > 10) { return; }` guard at the top of the function body,
 * and appends `depth + 1` to each recursive call inside the function.
 * Falls back to no-op when the function body or recursive calls cannot
 * be safely modified.
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
import { walkBody } from './_utils.ts';

/** No-op fix sentinel. */
const NO_FIX: LintFix = NO_OP_FIX;

/** Parameter names that indicate a depth/limit guard. */
const DEPTH_PARAM_NAMES: ReadonlySet<string> = new Set([
  'depth',
  'limit',
  'maxDepth',
  'level',
  'max',
]);

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
 * Extract the name from a parameter node, handling both Identifier and
 * AssignmentPattern (default value) forms.
 *
 * @param {AstNode} param - The parameter AST node
 * @returns {string | undefined} The parameter name, or undefined if not extractable
 */
function getParamName(param: AstNode): string | undefined {
  if (param.type === 'Identifier') {
    return param.name as string;
  }

  if (param.type === 'FormalParameter') {
    const binding: AstNode | undefined = param.pattern as AstNode | undefined;

    if (binding?.type === 'Identifier') {
      return binding.name as string;
    }

    if (binding?.type === 'AssignmentPattern') {
      const { left } = binding;

      if (left !== null && typeof left === 'object') {
        const leftNode: AstNode = left as AstNode;

        if (leftNode.type === 'Identifier') {
          return leftNode.name as string;
        }
      }
    }
  }

  if (param.type === 'AssignmentPattern') {
    const { left } = param;

    if (left !== null && typeof left === 'object') {
      const leftNode: AstNode = left as AstNode;

      if (leftNode.type === 'Identifier') {
        return leftNode.name as string;
      }
    }
  }

  return undefined;
}

/**
 * Build a fix that adds a depth parameter, guard, and increments recursive calls.
 *
 * @param {AstNode} funcNode - The FunctionDeclaration node
 * @param {string} funcName - The function name
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildRecursiveDepthFix(
  funcNode: AstNode,
  funcName: string,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;
  const funcStart: number = funcNode.start as number;
  const funcEnd: number = funcNode.end as number;
  let funcText: string = src.slice(funcStart, funcEnd);

  /* Find the opening paren of the parameter list to insert the depth param */
  const bodyNode: AstNode | undefined = funcNode.body as AstNode | undefined;

  if (!bodyNode) {
    return NO_FIX;
  }

  const params: AstNode[] = (funcNode.params ?? []) as AstNode[];

  /* Determine where to insert the depth parameter.
   * If there are existing params, insert after the last one with a comma.
   * If no params, insert between the parens. */
  let paramInsertOffset: number;
  let paramPrefix: string;

  if (params.length > 0) {
    const lastParam: AstNode = params[params.length - 1] as AstNode;
    paramInsertOffset = (lastParam.end as number) - funcStart;
    paramPrefix = ', ';
  } else {
    /* Find the opening paren — it's between the function name and the body */
    const nameEnd: number = (funcNode.id as AstNode).end as number;
    const relNameEnd: number = nameEnd - funcStart;
    const parenIdx: number = funcText.indexOf('(', relNameEnd);

    if (parenIdx === -1) {
      return NO_FIX;
    }

    paramInsertOffset = parenIdx + 1;
    paramPrefix = '';
  }

  /* Insert the depth parameter */
  funcText =
    funcText.slice(0, paramInsertOffset) +
    paramPrefix +
    'depth: number = 0' +
    funcText.slice(paramInsertOffset);

  /* Find the opening brace of the function body to insert the guard */
  const bodyStart: number = (bodyNode.start as number) - funcStart;
  /* Adjust for the parameter insertion */
  const paramInsertLen: number = (paramPrefix + 'depth: number = 0').length;
  const adjustedBodyStart: number = bodyStart + paramInsertLen;

  /* Find the first `{` at or after adjustedBodyStart */
  const braceIdx: number = funcText.indexOf('{', adjustedBodyStart);

  if (braceIdx === -1) {
    return NO_FIX;
  }

  const indent: string = detectIndent(funcStart, src);
  const guard: string = `\n${indent}  if (depth > 10) { return; }\n`;

  funcText = funcText.slice(0, braceIdx + 1) + guard + funcText.slice(braceIdx + 1);

  /* Now find and update all recursive calls — add depth + 1 as last argument.
   * We do this with a simple regex since the text has been modified. */
  const callPattern: RegExp = new RegExp(
    `${funcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`,
    'g',
  );
  let match: RegExpExecArray | null = callPattern.exec(funcText);
  const callPositions: number[] = [];

  while (match !== null) {
    /* Skip the function declaration itself (starts at index 0 area) */
    if (match.index > braceIdx + guard.length) {
      callPositions.push(match.index + match[0].length);
    }
    match = callPattern.exec(funcText);
  }

  /* Process call positions in reverse order to maintain offsets */
  for (let i: number = callPositions.length - 1; i >= 0; i--) {
    const pos: number = callPositions[i] as number;
    /* Find the matching closing paren */
    let parenDepth: number = 1;
    let j: number = pos;

    while (j < funcText.length && parenDepth > 0) {
      if (funcText[j] === '(') {
        parenDepth++;
      }
      if (funcText[j] === ')') {
        parenDepth--;
      }
      j++;
    }

    const closeParenPos: number = j - 1;
    /* Check if there are existing arguments */
    const argsText: string = funcText.slice(pos, closeParenPos).trim();
    const depthArg: string = argsText.length > 0 ? ', depth + 1' : 'depth + 1';

    funcText = funcText.slice(0, closeParenPos) + depthArg + funcText.slice(closeParenPos);
  }

  return {
    range: { start: funcStart, end: funcEnd },
    text: funcText,
  };
}

/** The recursive-depth lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/recursive-depth',
  description: 'Recursive functions should include a depth/limit parameter',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    /**
     * Check if a FunctionDeclaration is recursive and lacks a depth parameter.
     *
     * @param {AstNode} node - The FunctionDeclaration AST node
     * @param {VisitorContext} context - The visitor context
     * @returns {LintResult[]} Diagnostics if recursive function lacks depth guard
     */
    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const { id } = node;

      if (id === null || typeof id !== 'object') {
        return results;
      }

      const idNode: AstNode = id as AstNode;
      const funcName: string | undefined = idNode.name as string | undefined;

      if (!funcName) {
        return results;
      }

      let isRecursive: boolean = false;
      walkBody(node, (child: AstNode): boolean | void => {
        if (child.type === 'CallExpression') {
          const { callee } = child;

          if (callee !== null && typeof callee === 'object') {
            const calleeNode: AstNode = callee as AstNode;

            if (calleeNode.type === 'Identifier' && (calleeNode.name as string) === funcName) {
              isRecursive = true;
              return true;
            }
          }
        }
      });

      if (!isRecursive) {
        return results;
      }

      const params: AstNode[] = (node.params as AstNode[]) ?? [];
      const hasDepthParam: boolean = params.some((param: AstNode): boolean => {
        const name: string | undefined = getParamName(param);

        return name !== undefined && DEPTH_PARAM_NAMES.has(name);
      });

      if (!hasDepthParam) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: `Recursive function "${funcName}" has no depth limit parameter`,
          ruleId: 'complexity/recursive-depth',
          tip: `Add a depth parameter with a default value: function ${funcName}(depth = 0) { if (depth > MAX) return; ... ${funcName}(depth + 1); }`,
          fix: buildRecursiveDepthFix(node, funcName, context),
        });
      }

      return results;
    },
  },
};

export default rule;
