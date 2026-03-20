/**
 * Rule: naming/camel-case-vars
 *
 * Variable declarations (`let`, `var`) and function declarations must use
 * camelCase. Top-level `const` with non-literal initializer (objects,
 * functions, classes) must also use camelCase.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Pattern for valid camelCase identifiers. */
const CAMEL_CASE_RE: RegExp = /^[a-z][a-zA-Z0-9]*$/;

/** Pattern for SCREAMING_SNAKE_CASE (handled by constant-screaming-case). */
const SCREAMING_SNAKE_RE: RegExp = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

/** Names to always allow (common conventions). */
const ALLOWED_NAMES: ReadonlySet<string> = new Set(['_', '__', '$']);

const rule: TypeScriptRule = {
  id: 'naming/camel-case-vars',
  description: 'Variables and functions must use camelCase',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const kind: string = (node.kind as string) ?? '';

      // Skip top-level const — handled by constant-screaming-case rule
      // We only check let/var, and non-top-level const
      const declarations = node.declarations as AstNode[] | undefined;
      if (!declarations) return results;

      for (const decl of declarations) {
        const id = decl.id as AstNode | undefined;
        if (!id || id.type !== 'Identifier') continue;

        const name: string = (id.name as string) ?? '';
        if (!name || ALLOWED_NAMES.has(name)) continue;

        // Allow SCREAMING_SNAKE for top-level const (handled by other rule)
        if (kind === 'const' && SCREAMING_SNAKE_RE.test(name)) continue;

        if (!CAMEL_CASE_RE.test(name)) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: id.loc.start.column + 1,
            severity: 'error',
            message: `Variable '${name}' should use camelCase`,
            ruleId: 'naming/camel-case-vars',
            tip: 'Rename to camelCase (e.g., myVariable, itemCount)',
            fix: {
              range: { start: id.start, end: id.end },
              text: name,
            },
          });
        }
      }

      return results;
    },

    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const id = node.id as AstNode | undefined;
      if (!id || id.type !== 'Identifier') return results;

      const name: string = (id.name as string) ?? '';
      if (!name || ALLOWED_NAMES.has(name)) return results;

      if (!CAMEL_CASE_RE.test(name)) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: id.loc.start.column + 1,
          severity: 'error',
          message: `Function '${name}' should use camelCase`,
          ruleId: 'naming/camel-case-vars',
          tip: 'Rename to camelCase (e.g., loadScene, processData)',
          fix: {
            range: { start: id.start, end: id.end },
            text: name,
          },
        });
      }

      return results;
    },
  },
};

export default rule;
