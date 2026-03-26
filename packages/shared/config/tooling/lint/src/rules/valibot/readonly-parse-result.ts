/**
 * Rule: valibot/readonly-parse-result
 *
 * Parse results assigned to `let` should use `const` instead. Parse
 * results represent validated data and should not be reassigned.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The readonly-parse-result lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'safety'],
  description: 'Parse results should be declared with const, not let',
  id: 'valibot/readonly-parse-result',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const kind: string = (node.kind as string) ?? '';
      if (kind === 'const') {
        return results;
      }

      const declarations = node.declarations as AstNode[] | undefined;
      if (!declarations) {
        return results;
      }

      for (const decl of declarations) {
        const init = decl.init as AstNode | undefined;
        if (!init) {
          continue;
        }

        if (
          context.content.slice(init.start, init.end).includes('safeParse') ||
          context.content.slice(init.start, init.end).includes('parse(')
        ) {
          const id = decl.id as AstNode | undefined;
          const varName: string = (id?.name as string) ?? '';

          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: {
              range: { end: node.start + kind.length, start: node.start },
              text: 'const',
            },
            line: node.loc.start.line,
            message: `Parse result '${varName}' should be declared with 'const' — validated data should not be reassigned`,
            ruleId: 'valibot/readonly-parse-result',
            severity: 'warning',
            tip: `Change 'let ${varName}' to 'const ${varName}'`,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
