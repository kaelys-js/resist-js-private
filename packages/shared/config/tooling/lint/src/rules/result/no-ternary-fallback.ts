/**
 * Rule: result/no-ternary-fallback
 *
 * Forbids the pattern `result.ok ? result.data : fallback` which silently
 * swallows errors. Use `if (!result.ok) return result;` instead.
 *
 * Exception: Svelte reactive contexts ($derived.by, $effect) are exempt
 * when errors are logged, per the UI Boundary Exception in CLAUDE.md.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Pattern matching Svelte reactive context markers that exempt ternary fallback usage. */
const REACTIVE_CONTEXT_PATTERN: RegExp = /\$derived\.by|\$effect/;

/**
 * Check if a node is a member expression accessing `.ok` on some object.
 *
 * @param {AstNode} node - The AST node to check
 * @returns {string | null} The object name if it's `x.ok`, or null
 */
function getOkAccessObject(node: AstNode): string | null {
  if (node.type !== 'StaticMemberExpression' && node.type !== 'MemberExpression') {
    return null;
  }

  const property = node.property as AstNode | undefined;
  const propName: string = (property?.name as string) ?? '';
  if (propName !== 'ok') {
    return null;
  }

  const object = node.object as AstNode | undefined;
  if (!object) {
    return null;
  }

  if (object.type === 'Identifier') {
    return (object.name as string) ?? null;
  }

  return null;
}

/**
 * Check if a node accesses `.data` on a given object name.
 *
 * @param {AstNode} node - The AST node to check
 * @param {string} objectName - The expected object name
 * @returns {boolean} Whether the node is `objectName.data`
 */
function isDataAccess(node: AstNode, objectName: string): boolean {
  if (node.type !== 'StaticMemberExpression' && node.type !== 'MemberExpression') {
    return false;
  }

  const property = node.property as AstNode | undefined;
  const propName: string = (property?.name as string) ?? '';
  if (propName !== 'data') {
    return false;
  }

  const object = node.object as AstNode | undefined;
  if (!object || object.type !== 'Identifier') {
    return false;
  }

  return (object.name as string) === objectName;
}

/**
 * Recursively check if a node contains a .data access on the given object.
 *
 * @param {AstNode} node - The AST node to search
 * @param {string} objectName - The expected object name
 * @returns {boolean} Whether a .data access was found
 */
function containsDataAccess(node: AstNode, objectName: string): boolean {
  if (isDataAccess(node, objectName)) {
    return true;
  }

  // Check all child nodes
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') {
      continue;
    }
    const child = node[key];
    if (
      child &&
      typeof child === 'object' &&
      'type' in (child as object) &&
      containsDataAccess(child as AstNode, objectName)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a node position falls within a Svelte reactive context.
 *
 * @param {string} content - The full source content
 * @param {number} position - The byte position of the node
 * @returns {boolean} Whether the position is inside a reactive context
 */
function isInReactiveContext(content: string, position: number): boolean {
  return REACTIVE_CONTEXT_PATTERN.test(content.slice(Math.max(0, position - 200), position));
}

const rule: TypeScriptRule = {
  id: 'result/no-ternary-fallback',
  description: 'Forbids result.ok ? result.data : fallback — use if (!result.ok) return result',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    ConditionalExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const test = node.test as AstNode | undefined;
      if (!test) {
        return results;
      }

      // Check if test is `x.ok`
      const objectName: string | null = getOkAccessObject(test);
      if (!objectName) {
        return results;
      }

      // Check if consequent accesses `x.data`
      const consequent = node.consequent as AstNode | undefined;
      if (!consequent) {
        return results;
      }

      if (!containsDataAccess(consequent, objectName)) {
        return results;
      }

      // Check for Svelte reactive context exemption ($derived.by / $effect)
      if (isInReactiveContext(context.content, node.start)) {
        return results;
      }

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Ternary fallback '${objectName}.ok ? ${objectName}.data : ...' silently swallows errors`,
        ruleId: 'result/no-ternary-fallback',
        tip: `Use 'if (!${objectName}.ok) return ${objectName};' to propagate errors`,
        fix: { range: { start: node.start, end: node.start }, text: '' },
      });

      return results;
    },
  },
};

export default rule;
