/**
 * Rule: primitives/no-string-length-unicode
 *
 * Flags .length property access which counts UTF-16 code units rather than
 * Unicode characters. Emoji and other multi-byte characters will report
 * incorrect lengths.
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
  id: 'primitives/no-string-length-unicode',
  description:
    'String .length counts UTF-16 code units, not characters - use [...str].length for unicode',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    MemberExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const propRaw: unknown = node.property;
      const propNode =
        propRaw !== null && typeof propRaw === 'object' ? (propRaw as AstNode) : undefined;
      const computed = node.computed as boolean | undefined;
      const objRaw: unknown = node.object;
      const objNode =
        objRaw !== null && typeof objRaw === 'object' ? (objRaw as AstNode) : undefined;
      const propName = propNode?.name as string | undefined;

      if (
        propNode &&
        propNode.type === 'Identifier' &&
        propName === 'length' &&
        !computed &&
        objNode &&
        objNode.type === 'Identifier'
      ) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message:
            'String .length counts UTF-16 code units, not characters - use [...str].length for unicode',
          ruleId: 'primitives/no-string-length-unicode',
          tip: 'Use [...str].length for codepoints or Intl.Segmenter for grapheme clusters',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
