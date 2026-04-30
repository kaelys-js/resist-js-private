/**
 * Rule: primitives/no-math-random-crypto
 *
 * Flags Math.random() usage in security-sensitive files where cryptographically
 * secure random values should be used instead.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

const SENSITIVE_PATTERNS = /auth|token|secret|password|key|crypto|session/i;

const rule: TypeScriptRule = {
  id: 'primitives/no-math-random-crypto',
  description:
    'Math.random() is not cryptographically secure - use crypto.randomUUID() or crypto.getRandomValues()',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const calleeRaw: unknown = node.callee;

      if (calleeRaw !== null && typeof calleeRaw === 'object') {
        const callee = calleeRaw as AstNode;
        const objectRaw: unknown = callee.object;
        const propertyRaw: unknown = callee.property;
        const objectNode =
          objectRaw !== null && typeof objectRaw === 'object' ? (objectRaw as AstNode) : undefined;
        const propertyNode =
          propertyRaw !== null && typeof propertyRaw === 'object'
            ? (propertyRaw as AstNode)
            : undefined;

        if (
          callee.type === 'MemberExpression' &&
          objectNode &&
          objectNode.type === 'Identifier' &&
          (objectNode.name as string) === 'Math' &&
          propertyNode &&
          (propertyNode.name as string) === 'random' &&
          SENSITIVE_PATTERNS.test(context.file)
        ) {
          results.push({
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message:
              'Math.random() is not cryptographically secure - use crypto.randomUUID() or crypto.getRandomValues()',
            ruleId: 'primitives/no-math-random-crypto',
            tip: 'Use crypto.randomUUID() for IDs or crypto.getRandomValues() for random bytes',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
