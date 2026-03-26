/**
 * Rule: valibot/require-field-docs
 *
 * Every property in a `v.strictObject()` call must have a JSDoc comment
 * (inline `//` or block comment) on the line above or on the same line.
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
 * Check if a property node has a preceding or inline comment.
 *
 * @param {AstNode} propNode - The property AST node
 * @param {string} content - Full file source text
 * @returns {boolean} Whether the property has a comment
 */
function hasPropertyComment(propNode: AstNode, content: string): boolean {
  // Get the text before this property, back to the previous comma or brace
  const before: string = content.slice(0, propNode.start);
  const trimmed: string = before.trimEnd();

  // Check for block comment ending just before
  if (trimmed.endsWith('*/')) {
    return true;
  }

  // Check for single-line comment on the preceding line
  const lastNewline: number = trimmed.lastIndexOf('\n');
  const lastLine: string = lastNewline === -1 ? trimmed : trimmed.slice(lastNewline + 1);
  if (lastLine.trim().startsWith('//')) {
    return true;
  }

  // Check for inline comment on the same line as the property
  const afterProp: string = content.slice(propNode.end);
  const endOfLine: number = afterProp.indexOf('\n');
  const restOfLine: string = endOfLine === -1 ? afterProp : afterProp.slice(0, endOfLine);
  if (restOfLine.includes('//') || restOfLine.includes('/*')) {
    return true;
  }

  return false;
}
/** The require-field-docs lint rule. */
const rule: TypeScriptRule = {
  id: 'valibot/require-field-docs',
  description: 'Every property in v.strictObject() must have a JSDoc comment',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;
      if (!callee) {
        return results;
      }

      // Check for v.strictObject(...) call
      if (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression') {
        return results;
      }

      const object = callee.object as AstNode | undefined;
      const property = callee.property as AstNode | undefined;
      const propName: string = (property?.name as string) ?? '';

      if (propName !== 'strictObject') {
        return results;
      }
      if (!context.isImportedFrom((object?.name as string) ?? '', 'valibot')) {
        return results;
      }

      // Get the first argument (the object literal with schema fields)
      const args = node.arguments as AstNode[] | undefined;
      if (!args || args.length === 0) {
        return results;
      }

      const schemaObj = args[0] as AstNode; // cast safe: length checked above
      if (schemaObj.type !== 'ObjectExpression') {
        return results;
      }

      const properties = schemaObj.properties as AstNode[] | undefined;
      if (!properties) {
        return results;
      }

      // Count actual properties (excluding spread)
      const namedProps: AstNode[] = properties.filter(
        (p: AstNode): boolean => p.type !== 'SpreadElement',
      );
      const propCount: number = namedProps.length;

      // Count /** */ block comments at the TOP level only (exclude nested objects)
      // Extract source gaps between properties (where top-level docs live)
      let topLevelDocCount: number = 0;
      let searchStart: number = schemaObj.start;
      for (const prop of namedProps) {
        // Count /** in the gap BEFORE this property (between previous prop end and this prop start)
        const gap: string = context.content.slice(searchStart, prop.start);
        const gapMatches: RegExpMatchArray | null = gap.match(/\/\*\*/g);
        if (gapMatches) {
          topLevelDocCount += gapMatches.length;
        }
        // Skip past this property's value (which may contain nested /** */ blocks)
        searchStart = prop.end;
      }

      // Flag count mismatch (orphaned or missing docs)
      if (topLevelDocCount > propCount) {
        results.push({
          file: context.file,
          line: schemaObj.loc.start.line,
          column: schemaObj.loc.start.column + 1,
          severity: 'error',
          message: `v.strictObject() has ${topLevelDocCount} doc comments but only ${propCount} properties — ${topLevelDocCount - propCount} orphaned doc(s)`,
          ruleId: 'valibot/require-field-docs',
          tip: 'Remove orphaned JSDoc comments that no longer match a property',
          fix: { range: { start: schemaObj.start, end: schemaObj.start }, text: '' },
        });
      }

      for (const prop of namedProps) {
        const key = prop.key as AstNode | undefined;
        if (!key) {
          continue;
        }

        const keyName: string = (key.name as string) ?? (key as { value?: string }).value ?? '';

        if (!hasPropertyComment(prop, context.content)) {
          results.push({
            file: context.file,
            line: prop.loc.start.line,
            column: prop.loc.start.column + 1,
            severity: 'error',
            message: `Schema field '${keyName}' is missing a JSDoc comment`,
            ruleId: 'valibot/require-field-docs',
            tip: 'Add a /** Description */ or // comment above the field',
            fix: {
              range: { start: prop.start, end: prop.start },
              text: `/** Description. */\n  `,
            },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
