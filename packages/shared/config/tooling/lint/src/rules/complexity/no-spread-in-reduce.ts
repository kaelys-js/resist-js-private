/**
 * Rule: complexity/no-spread-in-reduce
 *
 * Detects spread operators inside .reduce() callbacks. Each spread creates
 * a full copy of the accumulator, resulting in O(n²) total allocations.
 * Suggests mutating the accumulator directly instead.
 *
 * The auto-fix handles the common pattern where the callback returns
 * `{ ...acc, [key]: value }` and replaces it with `acc[key] = value; return acc;`.
 * Only handles arrow functions with expression bodies returning a single-spread
 * object literal. Falls back to no-op for complex patterns.
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
import { isCallTo, findSpreadInBody } from './_utils.ts';

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
 * Build a fix for the common `{ ...acc, [key]: value }` pattern in .reduce().
 *
 * Detects when the callback is an arrow expression returning an ObjectExpression
 * with a SpreadElement as the first property and exactly one additional property.
 * Replaces with `{ acc[key] = value; return acc; }`.
 *
 * @param {AstNode} reduceCall - The .reduce() CallExpression
 * @param {AstNode} spreadNode - The SpreadElement node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintFix} The fix or NO_FIX
 */
function buildSpreadFix(
  reduceCall: AstNode,
  spreadNode: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;
  const args: AstNode[] = (reduceCall.arguments ?? []) as AstNode[];
  const callback: AstNode | undefined = args[0];

  if (!callback) {
    return NO_FIX;
  }

  /* Only handle arrow function expressions with expression body */
  if (callback.type !== 'ArrowFunctionExpression') {
    return NO_FIX;
  }

  const bodyNode: AstNode | undefined = callback.body as AstNode | undefined;

  if (!bodyNode || bodyNode.type === 'FunctionBody') {
    return NO_FIX;
  }

  /* Body must be an ObjectExpression (the parenthesized `({ ...acc, key: val })` form) */
  if (bodyNode.type !== 'ObjectExpression') {
    return NO_FIX;
  }

  const properties: AstNode[] = (bodyNode.properties ?? []) as AstNode[];

  /* Need at least 2 properties: the spread + at least one assignment */
  if (properties.length < 2) {
    return NO_FIX;
  }

  /* First property must be a SpreadElement matching our detected spread */
  const firstProp: AstNode | undefined = properties[0];

  if (!firstProp || firstProp.type !== 'SpreadElement') {
    return NO_FIX;
  }

  /* Get the accumulator name from the spread argument */
  const spreadArg: AstNode | undefined = firstProp.argument as AstNode | undefined;

  if (!spreadArg || spreadArg.type !== 'Identifier') {
    return NO_FIX;
  }

  const accName: string = spreadArg.name as string;

  /* Extract the callback parameters to verify acc name matches */
  const params: AstNode[] = (callback.params ?? []) as AstNode[];
  const firstParam: AstNode | undefined = params[0];
  let paramName: string | undefined;

  if (firstParam?.type === 'Identifier') {
    paramName = firstParam.name as string;
  } else if (firstParam?.type === 'FormalParameter') {
    const binding: AstNode | undefined = firstParam.pattern as AstNode | undefined;

    if (binding?.type === 'Identifier') {
      paramName = binding.name as string;
    }
  }

  if (paramName !== accName) {
    return NO_FIX;
  }

  /* Build assignment statements for each non-spread property */
  const assignments: string[] = [];

  for (let i: number = 1; i < properties.length; i++) {
    const prop: AstNode | undefined = properties[i];

    if (!prop) {
      continue;
    }

    /* Handle Property nodes */
    if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') {
      return NO_FIX;
    }

    const key: AstNode | undefined = prop.key as AstNode | undefined;
    const value: AstNode | undefined = prop.value as AstNode | undefined;

    if (!key || !value) {
      return NO_FIX;
    }

    const valueText: string = nodeText(value, src);
    const computed: boolean = (prop.computed as boolean) ?? false;

    if (computed) {
      const keyText: string = nodeText(key, src);
      assignments.push(`${accName}[${keyText}] = ${valueText}`);
    } else if (key.type === 'Identifier') {
      const keyName: string = key.name as string;
      assignments.push(`${accName}.${keyName} = ${valueText}`);
    } else {
      const keyText: string = nodeText(key, src);
      assignments.push(`${accName}[${keyText}] = ${valueText}`);
    }
  }

  if (assignments.length === 0) {
    return NO_FIX;
  }

  /* Replace the expression body with a block body:
   * `(acc, item) => ({ ...acc, [key]: val })` →
   * `(acc, item) => { acc[key] = val; return acc; }` */
  const bodyStart: number = bodyNode.start as number;
  const bodyEnd: number = bodyNode.end as number;
  const indent: string = detectIndent(callback.start as number, src);

  const blockBody: string =
    `{\n` +
    assignments.map((a: string): string => `${indent}    ${a};`).join('\n') +
    `\n${indent}    return ${accName};\n` +
    `${indent}  }`;

  /* Check if the expression body is wrapped in parentheses — if so, replace
   * from the opening paren to closing paren */
  let replaceStart: number = bodyStart;
  let replaceEnd: number = bodyEnd;

  /* Look for wrapping parens: `=> (expr)` — the paren is before bodyStart */
  const beforeBody: string = src.slice(callback.start as number, bodyStart);
  const parenIdx: number = beforeBody.lastIndexOf('(');

  if (parenIdx !== -1) {
    replaceStart = (callback.start as number) + parenIdx;
    /* Find matching closing paren after body */
    const afterBody: string = src.slice(bodyEnd);
    const closeIdx: number = afterBody.indexOf(')');

    if (closeIdx !== -1) {
      replaceEnd = bodyEnd + closeIdx + 1;
    }
  }

  const beforeExpr: string = src.slice(reduceCall.start as number, replaceStart);
  const afterExpr: string = src.slice(replaceEnd, reduceCall.end as number);

  return {
    range: { start: reduceCall.start as number, end: reduceCall.end as number },
    text: beforeExpr + blockBody + afterExpr,
  };
}

/** The no-spread-in-reduce lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-spread-in-reduce',
  description: 'Avoid object/array spread inside .reduce() — creates O(n²) copies',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['complexity', 'performance'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    /**
     * Check if a CallExpression is a .reduce() call with spread in its callback.
     *
     * @param {AstNode} node - The CallExpression AST node
     * @param {VisitorContext} context - The visitor context
     * @returns {LintResult[]} Diagnostics if spread is found inside .reduce()
     */
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      if (!isCallTo(node, 'reduce')) {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;

      if (!args || args.length === 0) {
        return results;
      }

      const callback: AstNode = args[0] as AstNode;

      if (!callback) {
        return results;
      }

      const spread: AstNode | undefined = findSpreadInBody(callback);

      if (spread) {
        results.push({
          file: context.file,
          line: spread.loc.start.line,
          column: spread.loc.start.column + 1,
          severity: 'warning',
          message: 'Spread operator inside .reduce() creates O(n²) copies',
          ruleId: 'complexity/no-spread-in-reduce',
          tip: 'Mutate the accumulator directly instead of spreading: acc[key] = value',
          fix: buildSpreadFix(node, spread, context),
        });
      }

      return results;
    },
  },
};

export default rule;
