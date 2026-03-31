/**
 * Rule: svelte5-config/env-prefix-consistency
 *
 * Flags dangerous or inconsistent environment variable prefix configuration.
 * Empty `publicPrefix` exposes ALL env vars to the client.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import {
  getDefaultExportObject,
  getNestedValue,
  isStringLiteral,
  getStringValue,
} from './_config-ast.ts';

/** Non-standard prefixes from other frameworks that are likely mistakes. */
const WRONG_FRAMEWORK_PREFIXES: ReadonlySet<string> = new Set([
  'NEXT_PUBLIC_',
  'REACT_APP_',
  'NUXT_PUBLIC_',
  'GATSBY_',
]);

/** The env-prefix-consistency lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/env-prefix-consistency',
  description: 'Environment variable prefix configuration issue',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);
      if (!configObj) {
        return [];
      }

      const envObj: AstNode | undefined = getNestedValue(configObj, 'kit.env');
      if (!envObj || envObj.type !== 'ObjectExpression') {
        return [];
      }

      const results: LintResult[] = [];

      // Check for empty publicPrefix
      const publicPrefixValue: AstNode | undefined = getNestedValue(envObj, 'publicPrefix');
      if (publicPrefixValue && isStringLiteral(publicPrefixValue, '')) {
        results.push({
          file: context.file,
          line: publicPrefixValue.loc.start.line,
          column: publicPrefixValue.loc.start.column + 1,
          severity: 'error',
          message: 'Empty publicPrefix exposes all environment variables to the client',
          ruleId: rule.id,
          tip: 'Use the default PUBLIC_ prefix or set a non-empty publicPrefix',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      // Check for wrong-framework prefixes
      if (publicPrefixValue) {
        const prefixStr: string | undefined = getStringValue(publicPrefixValue);
        if (prefixStr && WRONG_FRAMEWORK_PREFIXES.has(prefixStr)) {
          results.push({
            file: context.file,
            line: publicPrefixValue.loc.start.line,
            column: publicPrefixValue.loc.start.column + 1,
            severity: 'error',
            message: `Non-standard publicPrefix '${prefixStr}' — SvelteKit uses 'PUBLIC_' by default`,
            ruleId: rule.id,
            tip: "Use 'PUBLIC_' prefix or a custom prefix matching your project's convention",
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      // Check for matching public/private prefix
      const privatePrefixValue: AstNode | undefined = getNestedValue(envObj, 'privatePrefix');
      if (publicPrefixValue && privatePrefixValue) {
        const publicStr: string | undefined = getStringValue(publicPrefixValue);
        const privateStr: string | undefined = getStringValue(privatePrefixValue);
        if (publicStr && privateStr && publicStr === privateStr && publicStr !== '') {
          results.push({
            file: context.file,
            line: privatePrefixValue.loc.start.line,
            column: privatePrefixValue.loc.start.column + 1,
            severity: 'error',
            message: `Public and private prefix are both '${publicStr}' — cannot distinguish public from private vars`,
            ruleId: rule.id,
            tip: 'Use different prefixes for public and private environment variables',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
