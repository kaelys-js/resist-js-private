/**
 * Rule: primitives/no-regex-on-untrusted
 *
 * Detects RegExp construction with non-literal patterns that could be user input,
 * which is a ReDoS (Regular Expression Denial of Service) vulnerability.
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
  id: 'primitives/no-regex-on-untrusted',
  description: 'RegExp with user input is ReDoS vulnerability - escape input or use string methods',
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

      if (calleeNode.type !== 'Identifier' || (calleeNode.name as string) !== 'RegExp') {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;

      if (!args || args.length === 0) {
        return results;
      }

      const firstArg = args[0] as AstNode;

      if (firstArg.type === 'Literal') {
        return results;
      }

      /* Fix: wrap the pattern argument with inline regex escaping */
      const patternText: string = context.getNodeText(firstArg);
      /* The output regex escapes all special regex chars in the user input */
      const escapeCall: string =
        patternText + '.replace(/[.*+?^${}()|[\\]' + '\\\\' + ']/g, ' + "'\\\\$&'" + ')';
      let fixText: string;

      if (args.length > 1) {
        const flagsText: string = context.getNodeText(args[1] as AstNode);
        fixText = 'new RegExp(' + escapeCall + ', ' + flagsText + ')';
      } else {
        fixText = 'new RegExp(' + escapeCall + ')';
      }

      const fix = {
        range: { start: node.start, end: node.end },
        text: fixText,
      };

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'warning',
        message:
          'RegExp with user input is ReDoS vulnerability - escape input or use string methods',
        ruleId: 'primitives/no-regex-on-untrusted',
        tip: 'Use escapeRegExp(input) or string methods like includes(), startsWith()',
        fix,
      });

      return results;
    },
  },
};

export default rule;
