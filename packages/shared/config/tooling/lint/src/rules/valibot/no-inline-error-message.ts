/**
 * Rule: valibot/no-inline-error-message
 *
 * Bans inline string error messages in valibot validation methods like
 * `v.minLength(3, 'too short')`. Error messages should be centralized
 * or handled by the validation framework, not scattered inline.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Valibot validation methods that accept an error message as the last argument. */
const VALIDATION_METHODS: ReadonlySet<string> = new Set([
  'bytes',
  'check',
  'creditCard',
  'cuid2',
  'custom',
  'decimal',
  'email',
  'emoji',
  'endsWith',
  'excludes',
  'finite',
  'hash',
  'hexColor',
  'hexadecimal',
  'imei',
  'includes',
  'integer',
  'ip',
  'ipv4',
  'ipv6',
  'isoDate',
  'isoDateTime',
  'isoTime',
  'isoTimestamp',
  'isoWeek',
  'length',
  'mac',
  'mac48',
  'mac64',
  'maxBytes',
  'maxLength',
  'maxSize',
  'maxValue',
  'mimeType',
  'minBytes',
  'minLength',
  'minSize',
  'minValue',
  'multipleOf',
  'nonEmpty',
  'notBytes',
  'notLength',
  'notSize',
  'notValue',
  'octal',
  'rawCheck',
  'regex',
  'safeInteger',
  'size',
  'startsWith',
  'ulid',
  'url',
  'uuid',
  'value',
]);

/** The no-inline-error-message lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'quality'],
  description: 'Bans inline string error messages in valibot validation methods',
  id: 'valibot/no-inline-error-message',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

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
          VALIDATION_METHODS.has(propName) &&
          context.isImportedFrom((object?.name as string) ?? '', 'valibot')
        ) {
          const args = node.arguments as AstNode[] | undefined;
          if (!args || args.length === 0) {
            return results;
          }

          // Check if the last argument is a string literal (the error message)
          const lastArg: AstNode | undefined = args.at(-1);
          if (lastArg && lastArg.type === 'StringLiteral') {
            results.push({
              column: node.loc.start.column + 1,
              file: context.file,
              fix: { range: { end: lastArg.end, start: lastArg.start }, text: '' },
              line: node.loc.start.line,
              message: `v.${propName}() has an inline error message — centralize error messages instead`,
              ruleId: 'valibot/no-inline-error-message',
              severity: 'info',
              tip: 'Remove the inline message and let the validation framework provide consistent error messages',
            });
          }
        }
      }

      return results;
    },
  },
};

export default rule;
