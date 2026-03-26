/**
 * Rule: valibot/namespace-import
 *
 * Valibot must be imported as a namespace: `import * as v from 'valibot'`.
 * Named imports like `import { string, object } from 'valibot'` are forbidden.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
/** The namespace-import lint rule. */
const rule: TypeScriptRule = {
  id: 'valibot/namespace-import',
  description: "Valibot must be imported as namespace: import * as v from 'valibot'",
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const source = node.source as AstNode | undefined;
      const value: string | undefined = (source as { value?: string } | undefined)?.value;
      if (value !== 'valibot') {
        return results;
      }

      // Type-only imports are fine (import type { InferOutput } from 'valibot')
      if (node.importKind === 'type') {
        return results;
      }

      const specifiers = node.specifiers as AstNode[] | undefined;
      if (!specifiers) {
        return results;
      }

      // Check if it's a namespace import (import * as v from 'valibot')
      const isNamespace: boolean = specifiers.some(
        (s: AstNode): boolean => s.type === 'ImportNamespaceSpecifier',
      );
      if (isNamespace) {
        return results;
      }

      // Has named imports from 'valibot' — flag it
      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: "Valibot must be imported as namespace: import * as v from 'valibot'",
        ruleId: 'valibot/namespace-import',
        tip: "Replace with: import * as v from 'valibot'",
        fix: {
          range: { start: node.start, end: node.end },
          text: "import * as v from 'valibot';",
        },
      });

      return results;
    },
  },
};

export default rule;
