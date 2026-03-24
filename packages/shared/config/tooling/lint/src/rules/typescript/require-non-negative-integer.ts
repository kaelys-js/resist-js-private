/**
 * Rule: typescript/require-non-negative-integer
 *
 * Variables assigned from .length must be typed as NonNegativeInteger, not Num.
 * Array and string lengths are always >= 0.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /config\/tooling\/lint\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

/**
 * Check whether a file is exempt.
 *
 * @param {string} filePath - File path
 * @returns {boolean} Whether exempt
 */
function isExempt(filePath: string): boolean {
  return EXEMPT_PATTERNS.some((p: RegExp): boolean => p.test(filePath));
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'typescript/require-non-negative-integer',
  description: '.length must be typed as NonNegativeInteger, not Num',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      if (isExempt(context.file)) return results;

      const declarations = node.declarations as AstNode[] | undefined;
      if (!declarations) return results;

      for (const decl of declarations) {
        const id = decl.id as AstNode | undefined;
        if (!id || id.type !== 'Identifier') continue;

        const typeAnnotation = (id.typeAnnotation ?? decl.typeAnnotation) as AstNode | undefined;
        if (!typeAnnotation) continue;

        const innerType = typeAnnotation.typeAnnotation as AstNode | undefined;
        if (!innerType) continue;

        const typeText: string = context.content.slice(innerType.start, innerType.end).trim();
        if (typeText !== 'Num') continue;

        const init = decl.init as AstNode | undefined;
        if (!init) continue;

        if (init.type === 'MemberExpression' || init.type === 'StaticMemberExpression') {
          const prop = init.property as AstNode | undefined;
          if ((prop?.name as string) === 'length') {
            const name: string = (id.name as string) ?? '?';
            results.push({
              file: context.file,
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
              severity: 'error',
              message: `'${name}' assigned from .length should be NonNegativeInteger, not Num`,
              ruleId: 'typescript/require-non-negative-integer',
              tip: 'Import NonNegativeInteger from @/schemas/common — .length is always >= 0',
              fix: {
                range: { start: innerType.start, end: innerType.end },
                text: 'NonNegativeInteger',
              },
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
