/**
 * Shared utilities for complexity rules.
 *
 * Provides helpers to walk AST subtrees and detect patterns inside loop bodies.
 *
 * @module
 */

import type { AstNode } from '@/lint/framework/types.ts';

/** Node types that represent loops. */
const LOOP_TYPES: ReadonlySet<string> = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
]);

/**
 * Recursively walk an AST subtree, calling the callback for every node.
 * Stops descending into a branch if callback returns `true` (short-circuit).
 * @param {(child: AstNode) => boolean | void} callback - Description
 * @param {AstNode} node - Description
 */
export function walkBody(node: AstNode, callback: (child: AstNode) => boolean | void): void {
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'type' || key === 'start' || key === 'end') {
      continue;
    }
    const value: unknown = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && typeof item === 'object' && 'type' in item) {
          const child: AstNode = item as AstNode;
          const stop: boolean | void = callback(child);
          if (stop !== true) {
            walkBody(child, callback);
          }
        }
      }
    } else if (value !== null && typeof value === 'object' && 'type' in (value as object)) {
      const child: AstNode = value as AstNode;
      const stop: boolean | void = callback(child);
      if (stop !== true) {
        walkBody(child, callback);
      }
    }
  }
}

/**
 * Check if a node is a method call expression matching the given method name.
 * Matches both `obj.method()` (StaticMemberExpression) patterns.
 * @param {string} methodName - Description
 * @param {AstNode} node - Description
 * @returns Description
 */
export function isCallTo(node: AstNode, methodName: string): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const { callee } = node;
  if (callee === null || typeof callee !== 'object') {
    return false;
  }
  const calleeNode: AstNode = callee as AstNode;
  if (calleeNode.type === 'StaticMemberExpression' || calleeNode.type === 'MemberExpression') {
    const prop: unknown = calleeNode.property;
    if (prop !== null && typeof prop === 'object') {
      const propNode: AstNode = prop as AstNode;
      return (propNode.name as string) === methodName;
    }
  }
  return false;
}

/**
 * Check if a node is any loop type.
 * @param {AstNode} node - Description
 * @returns Description
 */
export function isLoopNode(node: AstNode): boolean {
  return LOOP_TYPES.has(node.type);
}

/**
 * Get the callee object name from a method call (e.g., `arr` from `arr.find()`).
 * Returns undefined if the callee is not a simple identifier.
 * @param {AstNode} node - Description
 * @returns Description
 */
export function getCalleeObjectName(node: AstNode): string | undefined {
  const { callee } = node;
  if (callee === null || typeof callee !== 'object') {
    return undefined;
  }
  const calleeNode: AstNode = callee as AstNode;
  if (calleeNode.type === 'StaticMemberExpression' || calleeNode.type === 'MemberExpression') {
    const obj: unknown = calleeNode.object;
    if (obj !== null && typeof obj === 'object') {
      const objNode: AstNode = obj as AstNode;
      if (objNode.type === 'Identifier') {
        return objNode.name as string;
      }
    }
  }
  return undefined;
}

/**
 * Check if a loop body contains a call to the given method name.
 * Returns the first matching CallExpression node, or undefined.
 * @param {string} methodName - Description
 * @param {AstNode} node - Description
 * @returns Description
 */
export function findCallInBody(node: AstNode, methodName: string): AstNode | undefined {
  let found: AstNode | undefined;
  walkBody(node, (child: AstNode): boolean | void => {
    if (isCallTo(child, methodName)) {
      found = child;
      return true;
    }
  });
  return found;
}

/**
 * Check if a loop body contains a node matching the given type.
 * Returns the first matching node, or undefined.
 * @param {string} nodeType - Description
 * @param {AstNode} node - Description
 * @returns Description
 */
export function findNodeInBody(node: AstNode, nodeType: string): AstNode | undefined {
  let found: AstNode | undefined;
  walkBody(node, (child: AstNode): boolean | void => {
    if (child.type === nodeType) {
      found = child;
      return true;
    }
  });
  return found;
}

/**
 * Check if a loop body contains a `new X()` expression with the given constructor name.
 * @param {string} constructorName - Description
 * @param {AstNode} node - Description
 * @returns Description
 */
export function findNewExprInBody(node: AstNode, constructorName: string): AstNode | undefined {
  let found: AstNode | undefined;
  walkBody(node, (child: AstNode): boolean | void => {
    if (child.type === 'NewExpression') {
      const { callee } = child;
      if (callee !== null && typeof callee === 'object') {
        const calleeNode: AstNode = callee as AstNode;
        if (calleeNode.type === 'Identifier' && (calleeNode.name as string) === constructorName) {
          found = child;
          return true;
        }
      }
    }
  });
  return found;
}

/**
 * Check if a loop body contains an assignment expression with += operator.
 * @param {AstNode} node - Description
 * @returns Description
 */
export function findPlusAssignInBody(node: AstNode): AstNode | undefined {
  let found: AstNode | undefined;
  walkBody(node, (child: AstNode): boolean | void => {
    if (child.type === 'AssignmentExpression' && (child.operator as string) === '+=') {
      found = child;
      return true;
    }
  });
  return found;
}

/**
 * Check if a loop body contains a static member access to a specific object and property.
 * E.g., `JSON.parse` → objectName="JSON", propertyName="parse"
 * @param {string} propertyName - Description
 * @param {string} objectName - Description
 * @param {AstNode} node - Description
 * @returns Description
 */
export function findStaticMemberCallInBody(
  node: AstNode,
  objectName: string,
  propertyName: string,
): AstNode | undefined {
  let found: AstNode | undefined;
  walkBody(node, (child: AstNode): boolean | void => {
    if (child.type === 'CallExpression') {
      const { callee } = child;
      if (callee !== null && typeof callee === 'object') {
        const calleeNode: AstNode = callee as AstNode;
        if (
          calleeNode.type === 'StaticMemberExpression' ||
          calleeNode.type === 'MemberExpression'
        ) {
          const obj: unknown = calleeNode.object;
          const prop: unknown = calleeNode.property;
          if (
            obj !== null &&
            typeof obj === 'object' &&
            (obj as AstNode).type === 'Identifier' &&
            ((obj as AstNode).name as string) === objectName &&
            prop !== null &&
            typeof prop === 'object' &&
            ((prop as AstNode).name as string) === propertyName
          ) {
            found = child;
            return true;
          }
        }
      }
    }
  });
  return found;
}

/**
 * Check if a loop body contains an AwaitExpression.
 * @param {AstNode} node - Description
 * @returns Description
 */
export function findAwaitInBody(node: AstNode): AstNode | undefined {
  return findNodeInBody(node, 'AwaitExpression');
}

/**
 * Check if a loop body contains a SpreadElement.
 * @param {AstNode} node - Description
 * @returns Description
 */
export function findSpreadInBody(node: AstNode): AstNode | undefined {
  return findNodeInBody(node, 'SpreadElement');
}
