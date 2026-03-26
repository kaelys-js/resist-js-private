/**
 * Rule: naming/pascal-case-types
 *
 * Type aliases, interface declarations, and enum declarations must
 * use PascalCase naming.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern for valid PascalCase identifiers. */
const PASCAL_CASE_RE: RegExp = /^[A-Z][a-zA-Z0-9]*$/;

/**
 * Create a lint result for a non-PascalCase type name.
 *
 * @param {AstNode} node - The declaration node
 * @param {AstNode} id - The identifier node
 * @param {string} kind - The kind of declaration (type, interface, enum)
 * @param {VisitorContext} context - Visitor context
 * @returns {LintResult} The lint result
 */
function createResult(
  node: AstNode,
  id: AstNode,
  kind: string,
  context: VisitorContext,
): LintResult {
  const name: string = (id.name as string) ?? '';
  return {
    file: context.file,
    line: node.loc.start.line,
    column: id.loc.start.column + 1,
    severity: 'error',
    message: `${kind} '${name}' should use PascalCase`,
    ruleId: 'naming/pascal-case-types',
    tip: 'Rename to PascalCase (e.g., SceneConfig, LintResult)',
    fix: {
      range: { start: id.start, end: id.end },
      text: name,
    },
  };
}
/** The pascal-case-types lint rule. */
const rule: TypeScriptRule = {
  id: 'naming/pascal-case-types',
  description: 'Types, interfaces, and enums must use PascalCase',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    TSTypeAliasDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const id = node.id as AstNode | undefined;
      if (!id || id.type !== 'Identifier') {
        return results;
      }

      const name: string = (id.name as string) ?? '';
      if (!name || PASCAL_CASE_RE.test(name)) {
        return results;
      }

      results.push(createResult(node, id, 'Type', context));
      return results;
    },

    TSInterfaceDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const id = node.id as AstNode | undefined;
      if (!id || id.type !== 'Identifier') {
        return results;
      }

      const name: string = (id.name as string) ?? '';
      if (!name || PASCAL_CASE_RE.test(name)) {
        return results;
      }

      results.push(createResult(node, id, 'Interface', context));
      return results;
    },

    TSEnumDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const id = node.id as AstNode | undefined;
      if (!id || id.type !== 'Identifier') {
        return results;
      }

      const name: string = (id.name as string) ?? '';
      if (!name || PASCAL_CASE_RE.test(name)) {
        return results;
      }

      results.push(createResult(node, id, 'Enum', context));
      return results;
    },
  },
};

export default rule;
