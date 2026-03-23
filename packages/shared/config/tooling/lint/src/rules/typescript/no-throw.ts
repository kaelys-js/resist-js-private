/**
 * Rule: typescript/no-throw
 *
 * Forbids `throw` statements. Use `return err(ERRORS.DOMAIN.CODE, message)`
 * instead to maintain the Result pattern.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

const rule: TypeScriptRule = {
  id: 'typescript/no-throw',
  description: 'Forbids throw statements — use return err() instead',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    ThrowStatement(node: AstNode, context: VisitorContext): LintResult[] {
      return [{
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: 'Do not use throw — return err(ERRORS.DOMAIN.CODE, message) instead',
        ruleId: 'typescript/no-throw',
        tip: 'Replace throw with return err() to maintain the Result pattern',
        fix: { range: { start: node.start, end: node.start }, text: '' },
      }];
    },
  },
};

export default rule;
