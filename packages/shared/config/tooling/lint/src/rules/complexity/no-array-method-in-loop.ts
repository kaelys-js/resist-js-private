/**
 * Rule: complexity/no-array-method-in-loop
 *
 * Detects array methods (.find, .filter, .includes, .some, .every) used inside
 * loop bodies, which creates O(n²) complexity. Suggests pre-computing with a
 * Map or Set before the loop.
 *
 * The auto-fix handles the common pattern where the array method is in a
 * `const`/`let` variable declaration or a bare expression statement. It
 * extracts the callback's parameter and body, generates a plain for-loop,
 * and inserts it before the enclosing loop.
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
import { walkBody, isCallTo } from './_utils.ts';

/**
 * Array methods that indicate O(n) scans when used inside loops.
 *
 * `.includes()` is excluded because it exists on both String and Array prototypes,
 * and without type information we cannot distinguish string searches (O(n), acceptable)
 * from array searches (O(n²), problematic). The remaining methods are array-only.
 */
const ARRAY_METHODS: readonly string[] = ['find', 'filter', 'some', 'every'];

/** No-op fix sentinel for cases where auto-fix is not possible. */
const NO_FIX: LintFix = NO_OP_FIX;

// =============================================================================
// Fix Generation Helpers
// =============================================================================

/**
 * Extract the source text for a given AST node using its byte offsets.
 *
 * @param {AstNode} astNode - AST node with start/end byte offsets
 * @param {string} source - The full source text
 * @returns {string} The source text of the node
 */
function nodeText(astNode: AstNode, source: string): string {
  return source.slice(astNode.start as number, astNode.end as number);
}

/**
 * Detect the indentation of a line at the given byte offset.
 *
 * @param {number} offset - Byte offset in the source
 * @param {string} source - Full source text
 * @returns {string} The whitespace prefix of the line
 */
function detectIndent(offset: number, source: string): string {
  /* Walk backward to find the start of the line */
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
 * Extract the callback parameter name and body source from an arrow function
 * or function expression that is the first argument of a CallExpression.
 *
 * @param {AstNode} callNode - The CallExpression node
 * @param {string} source - Full source text
 * @returns {{ param: string; body: string; isExpression: boolean } | null}
 */
function extractCallback(
  callNode: AstNode,
  source: string,
): { param: string; body: string; isExpression: boolean } | null {
  const args: AstNode[] = (callNode.arguments ?? []) as AstNode[];
  const firstArg: AstNode | undefined = args[0];

  if (!firstArg) {
    return null;
  }

  if (firstArg.type !== 'ArrowFunctionExpression' && firstArg.type !== 'FunctionExpression') {
    return null;
  }

  const params: AstNode[] = (firstArg.params ?? []) as AstNode[];
  const firstParam: AstNode | undefined = params[0];

  if (!firstParam || firstParam.type !== 'FormalParameter') {
    /* Try direct Identifier (some parsers skip FormalParameter wrapper) */
    if (firstParam?.type === 'Identifier') {
      const bodyNode: AstNode | undefined = firstArg.body as AstNode | undefined;

      if (!bodyNode) {
        return null;
      }

      const isExpression: boolean = bodyNode.type !== 'FunctionBody';

      return {
        param: firstParam.name as string,
        body: nodeText(bodyNode, source),
        isExpression,
      };
    }

    return null;
  }

  /* FormalParameter → binding (Identifier or BindingPattern) */
  const binding: AstNode | undefined = firstParam.pattern as AstNode | undefined;

  if (!binding) {
    return null;
  }

  const paramText: string =
    binding.type === 'Identifier' ? (binding.name as string) : nodeText(binding, source);

  const bodyNode: AstNode | undefined = firstArg.body as AstNode | undefined;

  if (!bodyNode) {
    return null;
  }

  const isExpression: boolean = bodyNode.type !== 'FunctionBody';

  return { param: paramText, body: nodeText(bodyNode, source), isExpression };
}

/**
 * Extract the callee object source text (the array being called on).
 *
 * @param {AstNode} callNode - The CallExpression node
 * @param {string} source - Full source text
 * @returns {string | null} The source text of the array, or null
 */
function extractCalleeObject(callNode: AstNode, source: string): string | null {
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
 * Build a fix that hoists a `.filter()`, `.some()`, `.find()`, or `.every()`
 * call out of a loop body into a plain `for` loop before the enclosing loop.
 *
 * Only handles cases where the callback is an inline arrow/function expression
 * with a single parameter. Returns NO_FIX for complex cases.
 *
 * @param {string} method - The array method name
 * @param {AstNode} callNode - The CallExpression AST node
 * @param {AstNode} loopNode - The enclosing loop AST node
 * @param {VisitorContext} context - Visitor context with source
 * @returns {LintFix} The fix, or NO_FIX if not auto-fixable
 */
function buildFix(
  method: string,
  callNode: AstNode,
  loopNode: AstNode,
  context: VisitorContext,
): LintFix {
  const src: string = context.content;
  const cb: { param: string; body: string; isExpression: boolean } | null = extractCallback(
    callNode,
    src,
  );

  if (!cb) {
    return NO_FIX;
  }

  const arrText: string | null = extractCalleeObject(callNode, src);

  if (!arrText) {
    return NO_FIX;
  }

  /* Detect indentation of the loop to match the hoisted code */
  const loopStart: number = loopNode.start as number;
  const indent: string = detectIndent(loopStart, src);

  /* Build the condition expression from the callback body.
   * For expression bodies we use directly; for block bodies we cannot
   * safely extract the condition — bail out. */
  if (!cb.isExpression) {
    return NO_FIX;
  }

  const condition: string = cb.body;
  const {param} = cb;

  /* Generate the replacement for-loop + variable name.
   * We use a deterministic name based on the array and method to avoid collisions. */
  const safeArr: string = arrText.replaceAll(/[^a-zA-Z0-9]/g, '_');
  let hoisted: string;

  if (method === 'filter') {
    const varName: string = `_${safeArr}Filtered`;

    hoisted =
      `${indent}const ${varName}: typeof ${arrText} = [];\n` +
      `${indent}for (const ${param} of ${arrText}) {\n` +
      `${indent}  if (${condition}) {\n` +
      `${indent}    ${varName}.push(${param});\n` +
      `${indent}  }\n` +
      `${indent}}\n`;

    /* Replace the call expression text with the variable name */
    const callStart: number = callNode.start as number;
    const callEnd: number = callNode.end as number;

    /* We need TWO edits: insert before the loop AND replace the call.
     * Since the fix system only supports one range per result, we combine
     * by replacing from loop start to call end, inserting the hoisted code
     * + the original loop source up to the call, + the variable name + rest. */
    const beforeCall: string = src.slice(loopStart, callStart);
    const afterCall: string = src.slice(callEnd, loopNode.end as number);

    return {
      range: { start: loopStart, end: loopNode.end as number },
      text: hoisted + beforeCall + varName + afterCall,
    };
  }

  if (method === 'some') {
    const varName: string = `_${safeArr}HasMatch`;

    hoisted =
      `${indent}let ${varName}: boolean = false;\n` +
      `${indent}for (const ${param} of ${arrText}) {\n` +
      `${indent}  if (${condition}) {\n` +
      `${indent}    ${varName} = true;\n` +
      `${indent}    break;\n` +
      `${indent}  }\n` +
      `${indent}}\n`;

    const callStart: number = callNode.start as number;
    const callEnd: number = callNode.end as number;
    const beforeCall: string = src.slice(loopStart, callStart);
    const afterCall: string = src.slice(callEnd, loopNode.end as number);

    return {
      range: { start: loopStart, end: loopNode.end as number },
      text: hoisted + beforeCall + varName + afterCall,
    };
  }

  if (method === 'every') {
    const varName: string = `_${safeArr}AllMatch`;

    hoisted =
      `${indent}let ${varName}: boolean = true;\n` +
      `${indent}for (const ${param} of ${arrText}) {\n` +
      `${indent}  if (!(${condition})) {\n` +
      `${indent}    ${varName} = false;\n` +
      `${indent}    break;\n` +
      `${indent}  }\n` +
      `${indent}}\n`;

    const callStart: number = callNode.start as number;
    const callEnd: number = callNode.end as number;
    const beforeCall: string = src.slice(loopStart, callStart);
    const afterCall: string = src.slice(callEnd, loopNode.end as number);

    return {
      range: { start: loopStart, end: loopNode.end as number },
      text: hoisted + beforeCall + varName + afterCall,
    };
  }

  if (method === 'find') {
    const varName: string = `_${safeArr}Match`;

    hoisted =
      `${indent}let ${varName}: (typeof ${arrText})[number] | undefined;\n` +
      `${indent}for (const ${param} of ${arrText}) {\n` +
      `${indent}  if (${condition}) {\n` +
      `${indent}    ${varName} = ${param};\n` +
      `${indent}    break;\n` +
      `${indent}  }\n` +
      `${indent}}\n`;

    const callStart: number = callNode.start as number;
    const callEnd: number = callNode.end as number;
    const beforeCall: string = src.slice(loopStart, callStart);
    const afterCall: string = src.slice(callEnd, loopNode.end as number);

    return {
      range: { start: loopStart, end: loopNode.end as number },
      text: hoisted + beforeCall + varName + afterCall,
    };
  }

  return NO_FIX;
}

// =============================================================================
// Rule Implementation
// =============================================================================

/**
 * Check a loop node for array method calls in its body.
 *
 * @param {AstNode} node - The loop AST node
 * @param {VisitorContext} context - The visitor context
 * @returns {LintResult[]} Diagnostics for any array method calls found
 */
const checkLoop = (node: AstNode, context: VisitorContext): LintResult[] => {
  const results: LintResult[] = [];

  walkBody(node, (child: AstNode): boolean | void => {
    if (child.type !== 'CallExpression') {
      return;
    }

    for (const method of ARRAY_METHODS) {
      if (isCallTo(child, method)) {
        results.push({
          file: context.file,
          line: child.loc.start.line,
          column: child.loc.start.column + 1,
          severity: 'warning',
          message: `Array method ".${method}()" inside loop body creates O(n²) complexity`,
          ruleId: 'complexity/no-array-method-in-loop',
          tip: 'Pre-compute with a Map or Set before the loop',
          fix: buildFix(method, child, node, context),
        });
        return true;
      }
    }
  });

  return results;
};

/** The no-array-method-in-loop lint rule. */
const rule: TypeScriptRule = {
  id: 'complexity/no-array-method-in-loop',
  description: 'Avoid array methods (.find, .filter, .includes, .some, .every) inside loops',
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
