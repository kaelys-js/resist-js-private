/**
 * Rule: primitives/no-unsafe-integer
 *
 * Detects integer literals that exceed Number.MAX_SAFE_INTEGER, which lose
 * precision in JavaScript. Suggests BigInt or string as alternatives.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-unsafe-integer lint rule. */
const rule: TypeScriptRule = {
  id: 'primitives/no-unsafe-integer',
  description: 'Disallow integer literals exceeding MAX_SAFE_INTEGER',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    Literal(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const { value } = node;

      if (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        Math.abs(value) > Number.MAX_SAFE_INTEGER
      ) {
        /* Fix: append n to make it a BigInt literal */
        const nodeText: string = context.getNodeText(node);
        const fix = {
          range: { start: node.start, end: node.end },
          text: `${nodeText}n`,
        };

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: `Number ${String(value)} exceeds MAX_SAFE_INTEGER - use BigInt or string`,
          ruleId: 'primitives/no-unsafe-integer',
          tip: `Use BigInt (${String(value)}n) or keep as string to preserve precision`,
          fix,
        });
      }

      return results;
    },
  },
};

export default rule;
