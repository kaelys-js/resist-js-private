/**
 * Rule: typescript/no-bare-as-cast
 *
 * Every `as` type assertion must have an inline comment on the same line
 * or the preceding line explaining WHY the cast is safe.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/**
 * Check whether a line or the preceding line has an inline comment.
 *
 * @param content - Full file source
 * @param line - 1-based line number of the `as` expression
 * @returns Whether an explanatory comment exists
 */
function hasExplanatoryComment(content: string, line: number): boolean {
  const lines: string[] = content.split('\n');
  const lineIdx: number = line - 1;

  // Check same line for trailing // comment
  if (lineIdx >= 0 && lineIdx < lines.length) {
    const currentLine: string = lines[lineIdx] ?? '';
    if (/\/\/.*\b(cast|safe|irreducible|workaround|required|integration)\b/i.test(currentLine)) {
      return true;
    }
    if (/\/\//.test(currentLine) && currentLine.indexOf('//') > currentLine.indexOf(' as ')) {
      return true;
    }
  }

  // Check preceding line for a // comment
  if (lineIdx > 0) {
    const prevLine: string = (lines[lineIdx - 1] ?? '').trim();
    if (prevLine.startsWith('//')) {
      return true;
    }
  }

  return false;
}
/** The no-bare-as-cast lint rule. */
const rule: TypeScriptRule = {
  id: 'typescript/no-bare-as-cast',
  description: 'Every `as` cast must have an inline comment explaining why',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    TSAsExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Skip `as const` — that's a const assertion, not a type cast
      const typeAnnotation = node.typeAnnotation as AstNode | undefined;
      if (typeAnnotation?.type === 'TSTypeReference') {
        const typeName = typeAnnotation.typeName as AstNode | undefined;
        if ((typeName?.name as string) === 'const') {
          return results;
        }
      }

      if (!hasExplanatoryComment(context.content, node.loc.start.line)) {
        const typeText: string = context.content.slice(
          (typeAnnotation ?? node).start,
          (typeAnnotation ?? node).end,
        );

        // Check if a safeParse call precedes this cast (within 500 chars)
        const beforeCast: string = context.content.slice(Math.max(0, node.start - 500), node.start);
        const hasPrecedingSafeParse: boolean = /safeParse\s*\(/.test(beforeCast);

        // Find end of line for the fix insertion point
        const lineEnd: number = context.content.indexOf('\n', node.end);
        const fixPos: number = lineEnd === -1 ? node.end : lineEnd;

        const message: string = hasPrecedingSafeParse
          ? 'Bare `as` cast without explanatory comment'
          : 'Unvalidated `as` cast — no safeParse found before cast';
        const tip: string = hasPrecedingSafeParse
          ? 'Add an inline comment explaining why the cast is safe'
          : 'Validate with safeParse() before casting, or add a comment explaining why the cast is safe';

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message,
          ruleId: 'typescript/no-bare-as-cast',
          tip,
          example: `value as ${typeText} // Cast safe: <reason>`,
          fix: { range: { start: fixPos, end: fixPos }, text: ' // Cast safe: <reason>' },
        });
      }

      return results;
    },
  },
};

export default rule;
