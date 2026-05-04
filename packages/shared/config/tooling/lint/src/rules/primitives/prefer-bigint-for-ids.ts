/**
 * Rule: primitives/prefer-bigint-for-ids
 *
 * Detects TypeScript interface declarations where ID fields (properties ending
 * in "Id" or "id", or named exactly "id") are typed as `number`. Large numeric
 * IDs from databases or APIs can exceed MAX_SAFE_INTEGER and lose precision.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** The prefer-bigint-for-ids lint rule. */
const rule: TypeScriptRule = {
  id: 'primitives/prefer-bigint-for-ids',
  description: 'Warn when ID fields in interfaces use number type',
  patterns: ['**/*.ts', '**/*.svelte.ts', '**/*.mjs'],
  categories: ['primitives', 'safety'],
  stages: ['lint', 'check'],
  fixable: true,

  visitor: {
    TSInterfaceDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const bodyRaw: unknown = node.body;
      const bodyNode =
        bodyRaw !== null && typeof bodyRaw === 'object' ? (bodyRaw as AstNode) : undefined;
      const membersRaw: unknown = bodyNode?.body;

      if (!Array.isArray(membersRaw)) {
        return results;
      }

      const members = membersRaw as AstNode[];

      for (const member of members) {
        if (member.type !== 'TSPropertySignature') {
          continue;
        }

        const keyRaw: unknown = member.key;
        const keyNode =
          keyRaw !== null && typeof keyRaw === 'object' ? (keyRaw as AstNode) : undefined;
        const keyName = keyNode?.type === 'Identifier' ? (keyNode.name as string) : undefined;

        if (keyName === undefined) {
          continue;
        }

        const isIdField = keyName === 'id' || /[Ii]d$/.test(keyName);

        if (!isIdField) {
          continue;
        }

        const typeAnnotationRaw: unknown = member.typeAnnotation;
        const typeAnnotationNode =
          typeAnnotationRaw !== null && typeof typeAnnotationRaw === 'object'
            ? (typeAnnotationRaw as AstNode)
            : undefined;
        const innerTypeRaw: unknown = typeAnnotationNode?.typeAnnotation;
        const innerTypeNode =
          innerTypeRaw !== null && typeof innerTypeRaw === 'object'
            ? (innerTypeRaw as AstNode)
            : undefined;

        if (innerTypeNode?.type === 'TSNumberKeyword') {
          /* Fix: replace 'number' type annotation with 'string' */
          const fix = {
            range: { start: innerTypeNode.start, end: innerTypeNode.end },
            text: 'string',
          };

          results.push({
            file: context.file,
            line: member.loc.start.line,
            column: member.loc.start.column + 1,
            severity: 'warning',
            message: `ID field '${keyName}' as number may lose precision - use string or bigint`,
            ruleId: 'primitives/prefer-bigint-for-ids',
            tip: 'Use string for IDs in JSON, or bigint if doing arithmetic',
            fix,
          });
        }
      }

      return results;
    },
  },
};

export default rule;
