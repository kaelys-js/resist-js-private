/**
 * Shared helpers for Svelte 5 rune lint rules.
 *
 * Provides utilities for collecting reactive declarations, detecting rune
 * calls, analyzing $effect callback bodies, and locating module script blocks.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 *
 * @module
 */

import type { AstNode } from '@/lint/framework/types.ts';
import { walkNode } from '@/lint/framework/oxc-runner.ts';

// =============================================================================
// Rune Detection
// =============================================================================

/**
 * Check if an AST node is a call to a specific Svelte rune.
 *
 * Handles both simple calls (`$state(...)`) and member calls (`$derived.by(...)`).
 *
 * @param {AstNode} node - A CallExpression node
 * @param {string} name - Rune name (e.g. '$state', '$derived', '$effect', '$props')
 * @returns {boolean} Whether the node is a call to the specified rune
 */
export function isRuneCall(node: AstNode, name: string): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }

  const callee: AstNode = node.callee as AstNode;

  // Simple call: $state(), $effect(), $props()
  if (callee.type === 'Identifier' && (callee as { name?: string }).name === name) {
    return true;
  }

  // Member call: $derived.by() — oxc-parser may use MemberExpression or StaticMemberExpression
  const isMemberAccess: boolean =
    callee.type === 'StaticMemberExpression' ||
    (callee.type === 'MemberExpression' && !(callee as { computed?: boolean }).computed);

  if (
    isMemberAccess &&
    ((callee as { object?: AstNode }).object as { name?: string })?.name === name
  ) {
    return true;
  }

  return false;
}

// =============================================================================
// Reactive Variable Collection
// =============================================================================

/**
 * Collect all variable names declared with `$state()` in a TypeScript AST.
 *
 * Finds patterns like `let count = $state(0)` and returns a set of the variable names.
 *
 * @param {AstNode} ast - Root AST node (Program)
 * @returns {Set<string>} Set of $state variable names
 */
export function collectStateVariables(ast: AstNode): Set<string> {
  const stateVars: Set<string> = new Set<string>();

  walkNode(ast, (node: AstNode): void => {
    if (node.type !== 'VariableDeclarator') {
      return;
    }

    const init: AstNode | undefined = node.init as AstNode | undefined;
    if (!init || !isRuneCall(init, '$state')) {
      return;
    }

    const id: AstNode | undefined = node.id as AstNode | undefined;
    if (id?.type === 'Identifier') {
      stateVars.add((id as unknown as { name: string }).name);
    }
  });

  return stateVars;
}

/**
 * Collect all variable names declared with `$derived()` or `$derived.by()` in a TypeScript AST.
 *
 * @param {AstNode} ast - Root AST node (Program)
 * @returns {Set<string>} Set of $derived variable names
 */
export function collectDerivedVariables(ast: AstNode): Set<string> {
  const derivedVars: Set<string> = new Set<string>();

  walkNode(ast, (node: AstNode): void => {
    if (node.type !== 'VariableDeclarator') {
      return;
    }

    const init: AstNode | undefined = node.init as AstNode | undefined;
    if (!init || !isRuneCall(init, '$derived')) {
      return;
    }

    const id: AstNode | undefined = node.id as AstNode | undefined;
    if (id?.type === 'Identifier') {
      derivedVars.add((id as unknown as { name: string }).name);
    }
  });

  return derivedVars;
}

// =============================================================================
// Effect Analysis
// =============================================================================

/**
 * Get the callback body from a rune call (e.g., the arrow function in `$effect(() => { ... })`).
 *
 * @param {AstNode} callNode - A CallExpression node for a rune
 * @returns {AstNode | undefined} The callback body (BlockStatement or expression), or undefined
 */
export function getCallbackBody(callNode: AstNode): AstNode | undefined {
  const args: AstNode[] | undefined = callNode.arguments as AstNode[] | undefined;
  if (!args || args.length === 0) {
    return undefined;
  }

  const [callback] = args;
  if (!callback) {
    return undefined;
  }

  if (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') {
    return callback.body as AstNode | undefined;
  }

  return undefined;
}

/**
 * Check if a block statement contains a ReturnStatement.
 *
 * @param {AstNode} body - A BlockStatement or similar body node
 * @returns {boolean} Whether the body contains at least one return statement
 */
export function hasReturnStatement(body: AstNode): boolean {
  let found: boolean = false;

  walkNode(body, (node: AstNode): void => {
    if (node.type === 'ReturnStatement') {
      found = true;
    }
  });

  return found;
}

/**
 * Find all assignment targets in a block body.
 *
 * Returns variable names that are assigned to via `=`, `+=`, etc. or updated via `++`/`--`.
 *
 * @param {AstNode} body - A BlockStatement node
 *{Array<{ name: string; node: AstNode }>}: AstNode }>} Assignment targets with their AST nodes
 *{Array<{ name: string; node: AstNode }>}: AstNode }>} Description
 *{Array<{ name: string; node: AstNode }>}: AstNode }>} Description
 */
export function findAssignmentTargets(body: AstNode): Array<{ name: string; node: AstNode }> {
  const targets: Array<{ name: string; node: AstNode }> = [];

  walkNode(body, (node: AstNode): void => {
    if (node.type === 'AssignmentExpression') {
      const left: AstNode | undefined = node.left as AstNode | undefined;
      if (left?.type === 'Identifier') {
        targets.push({ name: (left as unknown as { name: string }).name, node });
      }
    } else if (node.type === 'UpdateExpression') {
      const argument: AstNode | undefined = node.argument as AstNode | undefined;
      if (argument?.type === 'Identifier') {
        targets.push({ name: (argument as unknown as { name: string }).name, node });
      }
    }
  });

  return targets;
}

/**
 * Check if an assignment node is guarded by an IfStatement ancestor within the given body.
 *
 * Walks the body to find IfStatement nodes that contain the assignment.
 *
 * @param {AstNode} assignmentNode - The assignment or update expression node
 * @param {AstNode} body - The enclosing block body
 * @returns {boolean} Whether the assignment is inside an if-statement
 */
export function isInsideConditional(assignmentNode: AstNode, body: AstNode): boolean {
  let found: boolean = false;

  walkNode(body, (node: AstNode): void => {
    if (node.type !== 'IfStatement') {
      return;
    }

    // Check if the assignment falls within this IfStatement's range
    if (assignmentNode.start >= node.start && assignmentNode.end <= node.end) {
      found = true;
    }
  });

  return found;
}

// =============================================================================
// Module Script Detection
// =============================================================================

/**
 * Get the line range of the `<script context="module">` or `<script module>` block.
 *
 * Returns the start and end line numbers (1-based) of the module script block,
 * or null if no module script exists.
 *
 * @param {string} content - Full .svelte file content
 *{{ startLine: number; endLine: number } | null}e: number } | null} Module script line range
 *{{ startLine: number; endLine: number } | null}e: number } | null} Description
 *{{ startLine: number; endLine: number } | null}e: number } | null} Description
 */
export function getModuleScriptRange(
  content: string,
): { startLine: number; endLine: number } | null {
  const lines: string[] = content.split('\n');
  let startLine: number = -1;

  for (let i: number = 0; i < lines.length; i++) {
    const trimmed: string = (lines[i] ?? '').trim();

    if (startLine === -1) {
      // Look for module script opening tag
      if (/^<script\s[^>]*(context\s*=\s*["']module["']|module(\s|>))/i.test(trimmed)) {
        startLine = i + 1; // 1-based
      }
    } else if (/^<\/script\s*>/i.test(trimmed)) {
      // Look for closing tag
      return { startLine, endLine: i + 1 };
    }
  }

  return null;
}

// =============================================================================
// Subscription Pattern Detection
// =============================================================================

/** Method names that create subscriptions requiring cleanup. */
export const SUBSCRIPTION_PATTERNS: ReadonlySet<string> = new Set([
  'addEventListener',
  'setInterval',
  'setTimeout',
  'subscribe',
  'on',
]);

/** Cleanup counterparts for subscription patterns. */
export const CLEANUP_COUNTERPARTS: ReadonlyMap<string, string> = new Map([
  ['addEventListener', 'removeEventListener'],
  ['setInterval', 'clearInterval'],
  ['setTimeout', 'clearTimeout'],
  ['subscribe', 'unsubscribe'],
  ['on', 'off'],
]);

/**
 * Find subscription-like calls in a block body.
 *
 * Detects calls to addEventListener, setInterval, setTimeout, subscribe, .on().
 *
 * @param {AstNode} body - A BlockStatement node
 * @returns {string[]} List of subscription pattern names found
 */
export function findSubscriptionPatterns(body: AstNode): string[] {
  const patterns: string[] = [];

  walkNode(body, (node: AstNode): void => {
    if (node.type !== 'CallExpression') {
      return;
    }

    const callee: AstNode = node.callee as AstNode;

    // Direct call: addEventListener(...), setInterval(...), subscribe(...)
    if (callee.type === 'Identifier') {
      const { name } = callee as unknown as { name: string };
      if (SUBSCRIPTION_PATTERNS.has(name)) {
        patterns.push(name);
      }
    }

    // Member call: window.addEventListener(...), store.subscribe(...), emitter.on(...)
    if (
      callee.type === 'StaticMemberExpression' ||
      (callee.type === 'MemberExpression' && !(callee as { computed?: boolean }).computed)
    ) {
      const { property } = callee as { property?: AstNode };
      if (property?.type === 'Identifier') {
        const { name } = property as unknown as { name: string };
        if (SUBSCRIPTION_PATTERNS.has(name)) {
          patterns.push(name);
        }
      }
    }
  });

  return patterns;
}

/**
 * Check if a return statement in the body contains cleanup calls.
 *
 * @param {AstNode} body - A BlockStatement node
 * @param {string[]} subscriptionPatterns - Subscription patterns to look for counterparts
 * @returns {boolean} Whether cleanup counterparts are found in return statements
 */
export function hasCleanupReturn(body: AstNode, subscriptionPatterns: string[]): boolean {
  let hasCleanup: boolean = false;

  walkNode(body, (node: AstNode): void => {
    if (node.type !== 'ReturnStatement') {
      return;
    }

    const argument: AstNode | undefined = node.argument as AstNode | undefined;
    if (!argument) {
      return;
    }

    // Check if the return value or its body contains cleanup calls
    const returnText: string = JSON.stringify(argument);
    for (const pattern of subscriptionPatterns) {
      const counterpart: string | undefined = CLEANUP_COUNTERPARTS.get(pattern);
      if (counterpart && returnText.includes(counterpart)) {
        hasCleanup = true;
      }
    }

    // Also check for returning a function (general cleanup pattern)
    if (
      argument.type === 'ArrowFunctionExpression' ||
      argument.type === 'FunctionExpression' ||
      argument.type === 'Identifier' // return unsub;
    ) {
      hasCleanup = true;
    }
  });

  return hasCleanup;
}
