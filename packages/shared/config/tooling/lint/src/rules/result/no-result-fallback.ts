/**
 * Rule: result/no-result-fallback
 *
 * Catches the anti-pattern of checking `.ok` and providing a fallback
 * value instead of propagating the error. This silently discards errors.
 *
 * Catches both if/else and ternary forms:
 *   - `const x = result.ok ? result.data : fallback`
 *   - `if (result.ok) { x = result.data } else { x = fallback }`
 *
 * The correct patterns are:
 *   - `if (!result.ok) return result;` (propagate)
 *   - `if (!result.ok) throw result.error;` (integration boundary)
 *
 * Exempts Svelte reactive contexts ($derived.by, $effect).
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Characters to look back for Svelte reactive context. */
const REACTIVE_LOOKBACK: number = 200;

/** Pattern for Svelte reactive contexts. */
const REACTIVE_CONTEXT_PATTERN: RegExp = /\$derived\.by|\$effect/;

/**
 * Check if a node is inside a Svelte reactive context.
 *
 * @param {AstNode} node - The AST node to check
 * @param {VisitorContext} context - Visitor context
 * @returns {boolean} Whether the node is in a reactive context
 */
function isInReactiveContext(node: AstNode, context: VisitorContext): boolean {
  const preceding: string = context.content.slice(
    Math.max(0, node.start - REACTIVE_LOOKBACK),
    node.start,
  );
  return REACTIVE_CONTEXT_PATTERN.test(preceding);
}

/**
 * Get the variable name from a `.ok` member access in a condition.
 *
 * @param {AstNode} node - The condition node
 * @returns {string | null} The variable name or null
 */
function getOkAccessVariable(node: AstNode): string | null {
  // Direct: result.ok
  if (node.type === 'MemberExpression' || node.type === 'StaticMemberExpression') {
    const property = node.property as AstNode | undefined;
    if ((property?.name as string) === 'ok') {
      const object = node.object as AstNode | undefined;
      return (object?.name as string) ?? null;
    }
  }

  // Negated: !result.ok
  if (node.type === 'UnaryExpression') {
    const operator = node.operator as string | undefined;
    if (operator === '!') {
      const argument = node.argument as AstNode | undefined;
      if (argument) {
        return getOkAccessVariable(argument);
      }
    }
  }

  return null;
}

/**
 * Check if an assignment or expression accesses `.data` on a specific variable.
 *
 * @param {AstNode} node - The node to check
 * @param {string} varName - The variable name to match
 * @returns {boolean} Whether it accesses varName.data
 */
function accessesData(node: AstNode, varName: string): boolean {
  if (node.type === 'MemberExpression' || node.type === 'StaticMemberExpression') {
    const property = node.property as AstNode | undefined;
    const object = node.object as AstNode | undefined;
    return (property?.name as string) === 'data' && (object?.name as string) === varName;
  }
  return false;
}

/**
 * Walk an AST subtree looking for a `.data` access on a variable.
 *
 * @param {AstNode} node - Root node to walk
 * @param {string} varName - Variable name to check
 * @returns {boolean} Whether .data access was found
 */
function containsDataAccess(node: AstNode, varName: string): boolean {
  if (accessesData(node, varName)) {
    return true;
  }

  for (const key of Object.keys(node)) {
    const value = node[key] as unknown;
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            if (containsDataAccess(item as AstNode, varName)) {
              return true;
            }
          }
        }
      } else if ('type' in (value as Record<string, unknown>)) {
        if (containsDataAccess(value as AstNode, varName)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if a node is a literal or non-Result fallback value.
 *
 * @param {AstNode} node - The node to check
 * @returns {boolean} Whether the node is a fallback value
 */
function isFallbackValue(node: AstNode): boolean {
  // String/number/boolean literals
  if (
    node.type === 'Literal' ||
    node.type === 'StringLiteral' ||
    node.type === 'NumericLiteral' ||
    node.type === 'BooleanLiteral'
  ) {
    return true;
  }
  // Object literal (fallback object)
  if (node.type === 'ObjectExpression') {
    return true;
  }
  // Array literal
  if (node.type === 'ArrayExpression') {
    return true;
  }
  // Template literal
  if (node.type === 'TemplateLiteral') {
    return true;
  }
  return false;
}

const rule: TypeScriptRule = {
  id: 'result/no-result-fallback',
  description: 'Do not silently discard Result errors with fallback values',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    /**
     * Catch if/else fallback pattern:
     *   if (result.ok) { x = result.data } else { x = fallback }
     */
    IfStatement(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Exempt Svelte reactive contexts
      if (isInReactiveContext(node, context)) {
        return results;
      }

      const test = node.test as AstNode | undefined;
      if (!test) {
        return results;
      }

      const varName: string | null = getOkAccessVariable(test);
      if (!varName) {
        return results;
      }

      const consequent = node.consequent as AstNode | undefined;
      const alternate = node.alternate as AstNode | undefined;
      if (!consequent || !alternate) {
        return results;
      }

      // Check if one branch uses .data and the other has a fallback
      const consequentHasData: boolean = containsDataAccess(consequent, varName);
      const alternateHasData: boolean = containsDataAccess(alternate, varName);

      // Pattern: if (result.ok) { x = result.data } else { x = fallback }
      if (consequentHasData && !alternateHasData) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Result error silently discarded — propagate with 'if (!${varName}.ok) return ${varName}' or 'if (!${varName}.ok) throw ${varName}.error'`,
          ruleId: 'result/no-result-fallback',
          tip: 'Do not provide fallback values for failed Results — propagate the error',
          fix: {
            range: { start: node.start, end: node.end },
            text: `if (!${varName}.ok) return ${varName};`,
          },
        });
      }

      // Pattern: if (!result.ok) { x = fallback } else { x = result.data }
      if (!consequentHasData && alternateHasData) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Result error silently discarded — propagate with 'if (!${varName}.ok) return ${varName}' or 'if (!${varName}.ok) throw ${varName}.error'`,
          ruleId: 'result/no-result-fallback',
          tip: 'Do not provide fallback values for failed Results — propagate the error',
          fix: {
            range: { start: node.start, end: node.end },
            text: `if (!${varName}.ok) return ${varName};`,
          },
        });
      }

      return results;
    },

    /**
     * Catch ternary fallback pattern:
     *   result.ok ? result.data : fallback
     *
     * Note: no-ternary-fallback already catches this for ternaries,
     * but this rule provides a more specific message about the anti-pattern.
     */
    ConditionalExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Exempt Svelte reactive contexts
      if (isInReactiveContext(node, context)) {
        return results;
      }

      const test = node.test as AstNode | undefined;
      if (!test) {
        return results;
      }

      const varName: string | null = getOkAccessVariable(test);
      if (!varName) {
        return results;
      }

      const consequent = node.consequent as AstNode | undefined;
      const alternate = node.alternate as AstNode | undefined;
      if (!consequent || !alternate) {
        return results;
      }

      // Check: result.ok ? result.data : fallback
      if (containsDataAccess(consequent, varName) && isFallbackValue(alternate)) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Result error silently discarded — propagate with 'if (!${varName}.ok) return ${varName}' or 'if (!${varName}.ok) throw ${varName}.error'`,
          ruleId: 'result/no-result-fallback',
          tip: 'Do not use ternary fallbacks with Result — check .ok and propagate the error',
          fix: {
            range: { start: node.start, end: node.end },
            text: `${varName}.data /* after: if (!${varName}.ok) return ${varName}; */`,
          },
        });
      }

      return results;
    },

    /**
     * Catch nullish coalescing on Result .data properties:
     *   result.data.field ?? fallback
     *
     * This silently replaces missing/null fields with hardcoded values
     * instead of validating the data or propagating an error.
     */
    LogicalExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Exempt Svelte reactive contexts
      if (isInReactiveContext(node, context)) {
        return results;
      }

      const operator = node.operator as string | undefined;
      if (operator !== '??') {
        return results;
      }

      const left = node.left as AstNode | undefined;
      const right = node.right as AstNode | undefined;
      if (!left || !right) {
        return results;
      }

      // Check if right side is a literal fallback
      if (!isFallbackValue(right)) {
        return results;
      }

      // Check if left is a chain containing .data (e.g., parsed.data.version)
      const leftText: string = context.content.slice(left.start, left.end);
      if (!leftText.includes('.data.') && !leftText.includes('.data)')) {
        return results;
      }

      // Extract the Result variable name (first identifier before .data)
      const dataMatch: RegExpMatchArray | null = leftText.match(/(\w+)\.data/);
      if (!dataMatch) {
        return results;
      }

      const varName: string = dataMatch[1];

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Nullish fallback on '${varName}.data' silently discards missing field — validate the field or propagate error`,
        ruleId: 'result/no-result-fallback',
        tip: 'Check the field exists and error if not, instead of providing a silent fallback',
        fix: {
          range: { start: node.start, end: node.end },
          text: leftText,
        },
      });

      return results;
    },
  },
};

export default rule;
