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
  const [firstArg] = args;

  if (!firstArg) {
    return null;
  }

  if (firstArg.type !== 'ArrowFunctionExpression' && firstArg.type !== 'FunctionExpression') {
    return null;
  }

  const params: AstNode[] = (firstArg.params ?? []) as AstNode[];
  const [firstParam] = params;

  if (!firstParam || firstParam.type !== 'FormalParameter') {
    /* Try direct Identifier (some parsers skip FormalParameter wrapper) */
    if (firstParam?.type === 'Identifier') {
      const bodyNode: AstNode | undefined = firstArg.body as AstNode | undefined;

      if (!bodyNode) {
        return null;
      }

      const isExpression: boolean = bodyNode.type !== 'BlockStatement';

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

  const isExpression: boolean = bodyNode.type !== 'BlockStatement';

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
 * Recursively collect the names of every `Identifier` referenced in a subtree.
 *
 * Used to detect whether a hoisted callback body or callee object references
 * a binding that only exists inside the enclosing loop (which would be
 * out-of-scope once the code is moved before the loop).
 *
 * @param {AstNode} node - Root node of the subtree to scan
 * @param {Set<string>} out - Accumulator set of identifier names
 */
function collectIdentifiers(node: AstNode, out: Set<string>): void {
  if (node.type === 'Identifier' && typeof node.name === 'string') {
    out.add(node.name);
  }

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'type' || key === 'start' || key === 'end') {
      continue;
    }

    const value: unknown = node[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && typeof item === 'object' && 'type' in item) {
          collectIdentifiers(item as AstNode, out);
        }
      }
    } else if (value !== null && typeof value === 'object' && 'type' in (value as object)) {
      collectIdentifiers(value as AstNode, out);
    }
  }
}

/**
 * Collect the names bound by the enclosing loop: the loop header declarator
 * (for-of/for-in `left`, classic-for `init`) plus every `VariableDeclaration`
 * declarator id inside the loop body. These bindings do not exist at the hoist
 * site (before the loop), so referencing any of them makes a hoist unsafe.
 *
 * @param {AstNode} loopNode - The enclosing loop AST node
 * @returns {Set<string>} The set of loop-bound identifier names
 */
function collectLoopBoundIdents(loopNode: AstNode): Set<string> {
  const bound: Set<string> = new Set<string>();

  /* Loop header binding */
  const header: AstNode | undefined =
    (loopNode.left as AstNode | undefined) ?? (loopNode.init as AstNode | undefined);

  if (header && header.type === 'VariableDeclaration') {
    collectDeclaredIds(header, bound);
  }

  /* VariableDeclarations inside the loop body */
  const body: AstNode | undefined = loopNode.body as AstNode | undefined;

  if (body) {
    walkBody(body, (child: AstNode): void => {
      if (child.type === 'VariableDeclaration') {
        collectDeclaredIds(child, bound);
      }
    });
  }

  return bound;
}

/**
 * Collect declared identifier names from a VariableDeclaration's declarator ids.
 * Handles plain identifiers and (conservatively) any nested binding patterns.
 *
 * @param {AstNode} decl - The VariableDeclaration node
 * @param {Set<string>} out - Accumulator set of declared identifier names
 */
function collectDeclaredIds(decl: AstNode, out: Set<string>): void {
  const declarations: AstNode[] = (decl.declarations ?? []) as AstNode[];

  for (const d of declarations) {
    const id: AstNode | undefined = d.id as AstNode | undefined;

    if (id) {
      collectIdentifiers(id, out);
    }
  }
}

/**
 * Find the immediate parent of `target` within the `root` subtree.
 *
 * The visitor receives no parent pointer, so we re-walk the loop subtree
 * tracking the parent of each node (matched by byte offsets) to recover it.
 *
 * @param {AstNode} root - The subtree to search within
 * @param {AstNode} target - The node whose parent we want
 * @returns {AstNode | null} The parent node, or null if not found
 */
function findParent(root: AstNode, target: AstNode): AstNode | null {
  let parent: AstNode | null = null;
  const targetStart: number = target.start as number;
  const targetEnd: number = target.end as number;

  const visit = (node: AstNode): boolean => {
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

        if ((child.start as number) === targetStart && (child.end as number) === targetEnd) {
          parent = node;
          return true;
        }

        if (visit(child)) {
          return true;
        }
      }
    }

    return false;
  };

  visit(root);
  return parent;
}

/**
 * Whether the matched call sits directly in a `const x = <call>` declarator
 * initializer or a bare `<call>;` expression statement. Any other position
 * (nested in a larger expression, an argument, a return, etc.) makes the
 * statement-level hoist unsafe.
 *
 * @param {AstNode} loopNode - The enclosing loop (search root)
 * @param {AstNode} callNode - The matched CallExpression
 * @returns {boolean} True if the call's parent is a safe statement position
 */
function isHoistableCallPosition(loopNode: AstNode, callNode: AstNode): boolean {
  const parent: AstNode | null = findParent(loopNode, callNode);

  if (!parent) {
    return false;
  }

  if (parent.type === 'VariableDeclarator') {
    const init: AstNode | undefined = parent.init as AstNode | undefined;

    return Boolean(
      init &&
        (init.start as number) === (callNode.start as number) &&
        (init.end as number) === (callNode.end as number),
    );
  }

  if (parent.type === 'ExpressionStatement') {
    const expr: AstNode | undefined = parent.expression as AstNode | undefined;

    return Boolean(
      expr &&
        (expr.start as number) === (callNode.start as number) &&
        (expr.end as number) === (callNode.end as number),
    );
  }

  return false;
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

  /* The matched call must be a direct `const x = <call>` or bare `<call>;`
   * statement — otherwise replacing [loopStart, loopEnd] would corrupt the
   * surrounding expression. */
  if (!isHoistableCallPosition(loopNode, callNode)) {
    return NO_FIX;
  }

  /* Hoisting moves the callback + callee-object before the loop. If either
   * references a binding introduced by the loop (the iteration variable or a
   * `const`/`let` declared in the body), the hoisted code would reference an
   * out-of-scope name. Bail in that case. */
  const loopBound: Set<string> = collectLoopBoundIdents(loopNode);

  if (loopBound.size > 0) {
    const referenced: Set<string> = new Set<string>();
    const [cbArg] = (callNode.arguments ?? []) as AstNode[];
    const cbBody: AstNode | undefined = cbArg?.body as AstNode | undefined;

    if (cbBody) {
      collectIdentifiers(cbBody, referenced);
    }

    const calleeObj: AstNode | undefined = (callNode.callee as AstNode | undefined)?.object as
      | AstNode
      | undefined;

    if (calleeObj) {
      collectIdentifiers(calleeObj, referenced);
    }

    for (const name of loopBound) {
      if (referenced.has(name)) {
        return NO_FIX;
      }
    }
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
  const { param } = cb;

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
