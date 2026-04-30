/**
 * Rule: valibot/prefer-branded-types
 *
 * Suggests using `v.brand()` for ID and nominal types. When a schema name
 * contains "Id" or "ID", it likely represents an identifier that should be
 * branded to prevent accidental mixing of different ID types.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern to detect ID-like names in schema variable names. */
const ID_PATTERN: RegExp = /(?:Id|ID)(?:Schema)?$/;

/** The prefer-branded-types lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'idiom'],
  description: 'Use v.brand() for ID/nominal types to prevent accidental mixing',
  id: 'valibot/prefer-branded-types',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],
  fixable: false,

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

        // Must end with Schema and contain Id/ID
        if (!name.endsWith('Schema')) {
          continue;
        }
        if (!ID_PATTERN.test(name)) {
          continue;
        }

        // Check that the init is a valibot call
        if (init.type !== 'CallExpression') {
          continue;
        }

        const initText: string = context.content.slice(init.start, init.end);

        // Skip if already using v.brand()
        if (initText.includes('brand(')) {
          continue;
        }

        // Check that it's a valibot namespace call
        const callee = init.callee as AstNode | undefined;

        if (!callee) {
          continue;
        }
        if (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression') {
          continue;
        }

        const obj = callee.object as AstNode | undefined;

        if (!context.isImportedFrom((obj?.name as string) ?? '', 'valibot')) {
          continue;
        }

        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: 0, start: 0 }, text: '' },
          line: node.loc.start.line,
          message: `Schema '${name}' looks like an ID type but does not use v.brand() — consider branding it`,
          ruleId: 'valibot/prefer-branded-types',
          severity: 'info',
          tip: `Wrap with v.pipe(..., v.brand('${name.replace(/Schema$/, '')}')) to prevent mixing different ID types`,
        });
      }

      return results;
    },
  },
};

export default rule;
