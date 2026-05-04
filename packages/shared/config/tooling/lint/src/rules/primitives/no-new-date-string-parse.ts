/**
 * Rule: primitives/no-new-date-string-parse
 *
 * Detects Date construction with string literals, which has inconsistent
 * parsing behavior across browsers and environments.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

const rule: TypeScriptRule = {
  id: 'primitives/no-new-date-string-parse',
  description: 'Date string parsing is inconsistent - use explicit constructor or date library',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    NewExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const { callee } = node;

      if (callee === null || typeof callee !== 'object') {
        return results;
      }

      const calleeNode = callee as AstNode;

      if (calleeNode.type !== 'Identifier' || (calleeNode.name as string) !== 'Date') {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;

      if (!args || args.length === 0) {
        return results;
      }

      const firstArg = args[0] as AstNode;

      if (firstArg.type !== 'Literal' || typeof (firstArg.value as unknown) !== 'string') {
        return results;
      }

      /* Fix: parse common date string formats into explicit numeric constructor */
      let fix = { range: { start: 0, end: 0 }, text: '' };
      const dateStr = firstArg.value as string;

      /* Match YYYY-MM-DD or YYYY/MM/DD optionally followed by T or space then HH:MM:SS */
      const dateTimeMatch = /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2}))?$/.exec(
        dateStr,
      );

      if (dateTimeMatch) {
        const year = dateTimeMatch[1];
        const month = Number(dateTimeMatch[2]) - 1;
        const day = dateTimeMatch[3];

        if (dateTimeMatch[4]) {
          const hour = dateTimeMatch[4];
          const minute = dateTimeMatch[5];
          const second = dateTimeMatch[6];
          fix = {
            range: { start: node.start, end: node.end },
            text: `new Date(${year}, ${month}, ${day}, ${hour}, ${minute}, ${second})`,
          };
        } else {
          fix = {
            range: { start: node.start, end: node.end },
            text: `new Date(${year}, ${month}, ${day})`,
          };
        }
      }

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'warning',
        message: 'Date string parsing is inconsistent - use explicit constructor or date library',
        ruleId: 'primitives/no-new-date-string-parse',
        tip: 'Use new Date(year, month, day) or ISO 8601 with timezone, or use date-fns',
        fix,
      });

      return results;
    },
  },
};

export default rule;
