/**
 * Rule: valibot/error-map-all-locales
 *
 * Error maps must include entries for all supported locales. When a variable
 * ends in "ErrorMap" or "Errors", its object literal must contain keys for
 * every expected locale to ensure complete i18n coverage.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Expected locale keys that every error map should contain. */
const REQUIRED_LOCALES: ReadonlySet<string> = new Set(['en', 'es', 'fr', 'de', 'ja']);

/** Pattern to detect error map variable names. */
const ERROR_MAP_PATTERN: RegExp = /(?:ErrorMap|Errors)$/;

/** The error-map-all-locales lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'i18n'],
  description: 'Error maps must include all supported locales',
  id: 'valibot/error-map-all-locales',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const declarations = node.declarations as AstNode[] | undefined;
      if (!declarations) {
        return results;
      }

      for (const decl of declarations) {
        const id = decl.id as AstNode | undefined;
        const init = decl.init as AstNode | undefined;
        if (!id || !init) {
          continue;
        }

        const name: string = (id.name as string) ?? '';
        if (!ERROR_MAP_PATTERN.test(name)) {
          continue;
        }

        // Check if init is an object expression
        if (init.type !== 'ObjectExpression') {
          continue;
        }

        const properties = init.properties as AstNode[] | undefined;
        if (!properties) {
          continue;
        }

        // Collect all keys in the object
        const keys: Set<string> = new Set();
        for (const prop of properties) {
          if (prop.type === 'SpreadElement') {
            continue;
          }
          const key = prop.key as AstNode | undefined;
          if (!key) {
            continue;
          }
          const keyName: string = (key.name as string) ?? (key as { value?: string }).value ?? '';
          if (keyName) {
            keys.add(keyName);
          }
        }

        // Check for missing locales
        const missingLocales: string[] = [];
        for (const locale of REQUIRED_LOCALES) {
          if (!keys.has(locale)) {
            missingLocales.push(locale);
          }
        }

        if (missingLocales.length > 0) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: 0, start: 0 }, text: '' },
            line: node.loc.start.line,
            message: `Error map '${name}' is missing locales: ${missingLocales.join(', ')}`,
            ruleId: 'valibot/error-map-all-locales',
            severity: 'warning',
            tip: `Add entries for: ${missingLocales.join(', ')}`,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
