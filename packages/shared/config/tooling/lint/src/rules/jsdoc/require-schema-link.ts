/**
 * Rule: jsdoc/require-schema-link
 *
 * Types derived from Valibot schemas must include {@link SchemaName} in JSDoc.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Pattern to extract schema name from v.InferOutput<typeof XSchema>. */
const INFER_OUTPUT_PATTERN: RegExp = /v\.InferOutput\s*<\s*typeof\s+(\w+)\s*>/;

/**
 * Check whether the JSDoc preceding a declaration contains a {@link SchemaName} reference.
 *
 * @param content - Full source file content
 * @param start - Byte offset of the declaration start
 * @param schemaName - The schema name to search for
 * @returns Whether the schema link exists in the preceding JSDoc
 */
function hasSchemaLink(content: string, start: number, schemaName: string): boolean {
  const before: string = content.slice(0, start);
  const trimmed: string = before.trimEnd();

  if (!trimmed.endsWith('*/')) {
    return false;
  }

  const closeIdx: number = trimmed.lastIndexOf('*/');
  const openIdx: number = trimmed.lastIndexOf('/**');

  if (openIdx === -1 || openIdx >= closeIdx) {
    return false;
  }

  const jsDoc: string = trimmed.slice(openIdx, closeIdx + 2);

  return jsDoc.includes(`{@link ${schemaName}}`);
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'jsdoc/require-schema-link',
  description: 'Types derived from Valibot schemas must include {@link SchemaName} in JSDoc',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['jsdoc', 'valibot'],
  fixable: true,
  stages: ['lint'],

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const declaration = node.declaration as AstNode | undefined;

      if (!declaration || declaration.type !== 'TSTypeAliasDeclaration') {
        return results;
      }

      const typeAnnotation = declaration.typeAnnotation as AstNode | undefined;

      if (!typeAnnotation) {
        return results;
      }

      const nodeText: string = context.getNodeText(typeAnnotation);
      const match: RegExpMatchArray | null = INFER_OUTPUT_PATTERN.exec(nodeText);

      if (!match) {
        return results;
      }

      const schemaName: string = match[1] ?? '';

      if (!hasSchemaLink(context.content, node.start, schemaName)) {
        const typeName: string =
          ((declaration.id as AstNode | undefined)?.name as string) ?? '<anonymous>';

        // Compute fix: insert {@link} into existing JSDoc or create new JSDoc
        const before: string = context.content.slice(0, node.start);
        const trimmed: string = before.trimEnd();
        const hasJsDoc: boolean = trimmed.endsWith('*/');
        let fixRange: { start: number; end: number };
        let fixText: string;

        if (hasJsDoc) {
          // Insert " See {@link SchemaName}. " before the closing */
          const closeOffset: number = trimmed.length - 2;
          fixRange = { start: closeOffset, end: closeOffset };
          fixText = ` See {@link ${schemaName}}. `;
        } else {
          // No JSDoc — insert a full comment before the export node
          fixRange = { start: node.start, end: node.start };
          fixText = `/** See {@link ${schemaName}}. */\n`;
        }

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Type '${typeName}' is derived from '${schemaName}' but JSDoc is missing {@link ${schemaName}}`,
          ruleId: 'jsdoc/require-schema-link',
          tip: `Add '{@link ${schemaName}}' to the JSDoc comment`,
          fix: { range: fixRange, text: fixText },
        });
      }

      return results;
    },
  },
};

export default rule;
