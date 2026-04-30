/**
 * Rule: valibot/no-schema-in-loop
 *
 * Bans schema creation inside loops. Creating schemas (v.strictObject,
 * v.pipe, etc.) inside for/while/do blocks is wasteful — schemas should
 * be defined once and reused.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Set of Valibot factory method names that produce schemas. */
const SCHEMA_FACTORIES: ReadonlySet<string> = new Set([
  'array',
  'boolean',
  'brand',
  'custom',
  'enum',
  'intersect',
  'lazy',
  'literal',
  'map',
  'nullable',
  'number',
  'object',
  'optional',
  'picklist',
  'pipe',
  'record',
  'set',
  'strictObject',
  'strictTuple',
  'string',
  'tuple',
  'union',
  'variant',
]);

/**
 * Check if a position in the content is inside a loop construct.
 *
 * @param {string} content - Full file content
 * @param {number} position - Position to check
 * @returns {boolean} Whether the position is inside a loop
 */
function isInsideLoop(content: string, position: number): boolean {
  const before: string = content.slice(0, position);
  const lines: string[] = before.split('\n');

  // Walk backwards through lines looking for loop keywords
  let braceDepth: number = 0;

  for (let i: number = lines.length - 1; i >= 0; i--) {
    const line: string = lines[i] ?? '';

    for (let j: number = line.length - 1; j >= 0; j--) {
      const ch: string = line[j] ?? '';

      if (ch === '}') {
        braceDepth++;
      }
      if (ch === '{') {
        braceDepth--;
        if (braceDepth < 0) {
          // We found an unmatched opening brace — check if this line starts a loop
          const trimmedLine: string = line.trimStart();

          if (
            trimmedLine.startsWith('for ') ||
            trimmedLine.startsWith('for(') ||
            trimmedLine.startsWith('while ') ||
            trimmedLine.startsWith('while(') ||
            trimmedLine.startsWith('do ') ||
            trimmedLine.startsWith('do{')
          ) {
            return true;
          }
          return false;
        }
      }
    }
  }

  return false;
}

/** The no-schema-in-loop lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'performance'],
  description: 'Bans schema creation inside loops — define schemas once and reuse them',
  id: 'valibot/no-schema-in-loop',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;

      if (!callee) {
        return results;
      }

      if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
        const object = callee.object as AstNode | undefined;
        const property = callee.property as AstNode | undefined;
        const propName: string = (property?.name as string) ?? '';

        if (
          SCHEMA_FACTORIES.has(propName) &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot') &&
          isInsideLoop(context.content, node.start)
        ) {
          results.push({
            column: node.loc.start.column + 1,
            file: context.file,
            fix: { range: { end: 0, start: 0 }, text: '' },
            line: node.loc.start.line,
            message: `v.${propName}() called inside a loop — schema creation is expensive and should be hoisted`,
            ruleId: 'valibot/no-schema-in-loop',
            severity: 'warning',
            tip: 'Move the schema definition outside the loop and reference it by variable',
          });
        }
      }

      return results;
    },
  },
};

export default rule;
