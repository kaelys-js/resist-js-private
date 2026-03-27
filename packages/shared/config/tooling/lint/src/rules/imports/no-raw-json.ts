/**
 * Rule: imports/no-raw-json
 *
 * Forbids direct use of `JSON.stringify` and `JSON.parse`. Use the shared
 * type-safe, Result-returning alternatives instead:
 * - `JSON.stringify` → `safeStringify` from `@/utils/core/object`
 * - `JSON.parse` → `parseJsonWithComments` from `@/utils/core/fs`
 *
 * Exempts test files, the linter itself, test infrastructure, and the
 * utility layer that implements the safe wrappers.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Map of JSON methods to their safe alternatives. */
const ALTERNATIVES: Record<string, string> = {
  stringify: 'safeStringify from @/utils/core/object',
  parse: 'parseJsonWithComments from @/utils/core/fs',
};

/**
 * Check a member expression for JSON.stringify or JSON.parse usage.
 *
 * @param {AstNode} node - The member expression node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintResult[]} Array of lint results
 */
function checkJsonAccess(node: AstNode, context: VisitorContext): LintResult[] {
  const results: LintResult[] = [];

  const object = node.object as AstNode | undefined;
  const property = node.property as AstNode | undefined;
  if (!object || !property) {
    return results;
  }

  const objectName: string = (object.name as string) ?? '';
  const propertyName: string = (property.name as string) ?? '';

  if (objectName !== 'JSON') {
    return results;
  }
  if (propertyName !== 'stringify' && propertyName !== 'parse') {
    return results;
  }

  const alternative: string = ALTERNATIVES[propertyName] ?? '';

  results.push({
    file: context.file,
    line: node.loc.start.line,
    column: node.loc.start.column + 1,
    severity: 'error',
    message: `Direct JSON.${propertyName}() — use ${alternative} instead`,
    ruleId: 'imports/no-raw-json',
    tip: `JSON.${propertyName} can throw on invalid input. Use the type-safe, Result-returning alternative`,
    fix: { range: { start: node.start, end: node.end }, text: '' },
  });

  return results;
}
/** The no-raw-json lint rule. */
const rule: TypeScriptRule = {
  id: 'imports/no-raw-json',
  description: 'Use safeStringify/parseJsonWithComments instead of JSON.stringify/parse',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['imports', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    MemberExpression(node: AstNode, context: VisitorContext): LintResult[] {
      return checkJsonAccess(node, context);
    },

    StaticMemberExpression(node: AstNode, context: VisitorContext): LintResult[] {
      return checkJsonAccess(node, context);
    },
  },
};

export default rule;
