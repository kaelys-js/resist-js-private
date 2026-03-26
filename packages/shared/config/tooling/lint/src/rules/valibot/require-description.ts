/**
 * Rule: valibot/require-description
 *
 * Schemas should have `v.description()` in their pipe. Descriptions provide
 * self-documenting schemas that can be used for OpenAPI generation and
 * developer tooling.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The require-description lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'documentation'],
  description: 'Schemas should have v.description() in their pipe',
  id: 'valibot/require-description',
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
        if (!name.endsWith('Schema')) {
          continue;
        }

        // Check if init is a v.pipe(...) call
        if (init.type !== 'CallExpression') {
          continue;
        }

        const callee = init.callee as AstNode | undefined;
        if (!callee) {
          continue;
        }
        if (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression') {
          continue;
        }

        const obj = callee.object as AstNode | undefined;
        const prop = callee.property as AstNode | undefined;
        const methodName: string = (prop?.name as string) ?? '';

        if (!context.isImportedFrom((obj?.name as string) ?? '', 'valibot')) {
          continue;
        }

        if (methodName !== 'pipe') {
          continue;
        }

        // Check if v.pipe(...) arguments include v.description(...)
        const pipeText: string = context.content.slice(init.start, init.end);
        if (!pipeText.includes('description(')) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: 0, start: 0 }, text: '' },
            line: node.loc.start.line,
            message: `Schema '${name}' uses v.pipe() but is missing v.description()`,
            ruleId: 'valibot/require-description',
            severity: 'info',
            tip: "Add v.description('...') to the pipe for self-documenting schemas and OpenAPI generation",
          });
        }
      }

      return results;
    },
  },
};

export default rule;
