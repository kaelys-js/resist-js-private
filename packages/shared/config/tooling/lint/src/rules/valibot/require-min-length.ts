/**
 * Rule: valibot/require-min-length
 *
 * Bare v.string() inside v.strictObject() fields should use
 * v.pipe(v.string(), v.minLength(1)) or a stricter constraint.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'valibot/require-min-length',
  description: 'Bare v.string() in strictObject fields should have v.minLength(1)',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;
      if (!callee) {
        return results;
      }

      const prop = callee.property as AstNode | undefined;
      const obj = callee.object as AstNode | undefined;
      if ((obj?.name as string) !== 'v' || (prop?.name as string) !== 'strictObject') {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;
      if (!args || args.length === 0) {
        return results;
      }

      const objArg: AstNode = args[0];
      if (objArg.type !== 'ObjectExpression') {
        return results;
      }

      const properties = objArg.properties as AstNode[] | undefined;
      if (!properties) {
        return results;
      }

      for (const property of properties) {
        if (property.type !== 'ObjectProperty' && property.type !== 'Property') {
          continue;
        }
        const value = property.value as AstNode | undefined;
        if (!value) {
          continue;
        }

        const valueText: string = context.content.slice(value.start, value.end).trim();
        const keyNode = property.key as AstNode | undefined;
        const keyName: string = (keyNode?.name as string) ?? (keyNode?.value as string) ?? '?';

        if (valueText === 'v.string()') {
          results.push({
            file: context.file,
            line: property.loc.start.line,
            column: property.loc.start.column + 1,
            severity: 'error',
            message: `Bare v.string() on field '${keyName}' — use v.pipe(v.string(), v.minLength(1)) or stricter`,
            ruleId: 'valibot/require-min-length',
            tip: 'Empty strings are rarely valid. Add v.minLength(1) at minimum.',
            fix: {
              range: { start: value.start, end: value.end },
              text: 'v.pipe(v.string(), v.minLength(1))',
            },
          });
        }

        if (valueText === 'v.optional(v.string())') {
          results.push({
            file: context.file,
            line: property.loc.start.line,
            column: property.loc.start.column + 1,
            severity: 'error',
            message: `v.optional(v.string()) on field '${keyName}' allows empty strings — use v.optional(v.pipe(v.string(), v.minLength(1)))`,
            ruleId: 'valibot/require-min-length',
            tip: 'When a value IS provided, it should not be empty.',
            fix: {
              range: { start: value.start, end: value.end },
              text: 'v.optional(v.pipe(v.string(), v.minLength(1)))',
            },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
