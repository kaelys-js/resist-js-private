/**
 * Rule: jsdoc/require-returns
 *
 * Exported functions with a non-void return type must have a `@returns` tag
 * that includes a `{Type}` matching the actual return type annotation.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Return type strings that are considered "void" and don't need @returns. */
const VOID_TYPES: ReadonlySet<string> = new Set(['void', 'Void', 'undefined', 'never']);

/**
 * Extract JSDoc text preceding a node.
 *
 * @param node - AST node
 * @param content - Full file source text
 * @returns The JSDoc comment text, or null if none
 */
function getJsDoc(node: AstNode, content: string): string | null {
  const before: string = content.slice(0, node.start);
  const trimmed: string = before.trimEnd();
  if (!trimmed.endsWith('*/')) {
    return null;
  }

  const docEnd: number = trimmed.length;
  const docStart: number = trimmed.lastIndexOf('/**');
  if (docStart === -1) {
    return null;
  }

  return trimmed.slice(docStart, docEnd);
}

/**
 * Find the byte offset of the closing star-slash in a JSDoc comment.
 *
 * @param node - The export node
 * @param content - File source text
 * @returns Byte offset of the closing asterisk-slash, or -1
 */
function getJsDocEndOffset(node: AstNode, content: string): number {
  const before: string = content.slice(0, node.start);
  const trimmed: string = before.trimEnd();
  if (!trimmed.endsWith('*/')) {
    return -1;
  }
  return trimmed.length - 2;
}

/**
 * Get the return type annotation text from a function node.
 *
 * @param funcNode - A function AST node
 * @param content - File source text
 * @returns The return type string, or null if none
 */
function getReturnType(funcNode: AstNode, content: string): string | null {
  const returnType = funcNode.returnType as AstNode | undefined;
  if (!returnType) {
    return null;
  }

  const typeAnnotation = returnType.typeAnnotation as AstNode | undefined;
  if (!typeAnnotation) {
    return content.slice(returnType.start, returnType.end).replace(/^:\s*/, '');
  }

  return content.slice(typeAnnotation.start, typeAnnotation.end);
}

/**
 * Check whether a return type should require @returns.
 *
 * @param returnType - The return type string
 * @returns Whether @returns is required
 */
function requiresReturnsTag(returnType: string): boolean {
  const trimmed: string = returnType.trim();
  if (VOID_TYPES.has(trimmed)) {
    return false;
  }
  const promiseMatch: RegExpMatchArray | null = trimmed.match(/^Promise<(.+)>$/);
  if (promiseMatch && VOID_TYPES.has((promiseMatch[1] ?? '').trim())) {
    return false;
  }
  return true;
}

/**
 * Extract a brace-delimited type from a string starting at the opening brace.
 *
 * Counts brace depth so nested braces in object-literal types are handled
 * correctly instead of terminating at the first closing brace.
 *
 * @param {string} text - Source text containing the braced type
 * @param {number} openPos - Index of the opening brace in text
 * @returns {object | null} Extracted type and end index, or null
 */
function extractBracedType(text: string, openPos: number): { type: string; end: number } | null {
  let depth: number = 0;
  for (let i: number = openPos; i < text.length; i++) {
    if (text[i] === '{') {
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return { type: text.slice(openPos + 1, i).trim(), end: i + 1 };
      }
    }
  }
  return null;
}

/**
 * Extract the returns type from JSDoc if present.
 *
 * Uses brace-depth-aware parsing to handle types with nested braces
 * (e.g. object literals with multiple fields).
 *
 * @param {string} jsDoc - JSDoc comment text
 * @returns {string | null} The type string from the returns tag, or null
 */
function extractReturnsType(jsDoc: string): string | null {
  const returnsMatch: RegExpExecArray | null = /@returns\s+\{/.exec(jsDoc);
  if (!returnsMatch) {
    return null;
  }
  const openPos: number = returnsMatch.index + returnsMatch[0].length - 1;
  const result = extractBracedType(jsDoc, openPos);
  return result ? result.type : null;
}

/**
 * Normalize a type string for comparison.
 *
 * @param type - Type string
 * @returns Normalized type string
 */
function normalizeType(type: string): string {
  return type.replaceAll(/\s+/g, ' ').trim();
}

/**
 * Check a function for missing or mismatched @returns tag.
 *
 * @param funcNode - Function AST node
 * @param exportNode - Export declaration node (for JSDoc location)
 * @param context - Visitor context
 * @returns Array of lint results
 */
function checkFunction(
  funcNode: AstNode,
  exportNode: AstNode,
  context: VisitorContext,
): LintResult[] {
  const results: LintResult[] = [];
  const jsDoc: string | null = getJsDoc(exportNode, context.content);
  if (!jsDoc) {
    return results;
  }

  const returnType: string | null = getReturnType(funcNode, context.content);
  if (!returnType) {
    return results;
  }
  if (!requiresReturnsTag(returnType)) {
    return results;
  }

  const funcName: string = ((funcNode.id as AstNode | undefined)?.name as string) ?? '<anonymous>';
  const hasReturns: boolean = /@returns\b/.test(jsDoc);
  const insertOffset: number = getJsDocEndOffset(exportNode, context.content);

  if (!hasReturns) {
    results.push({
      file: context.file,
      line: exportNode.loc.start.line,
      column: exportNode.loc.start.column + 1,
      severity: 'error',
      message: `Missing @returns tag for function '${funcName}' (returns ${returnType})`,
      ruleId: 'jsdoc/require-returns',
      tip: 'Add @returns {Type} describing what the function returns',
      example: `@returns {${returnType}} Description`,
      fix: {
        range: { start: insertOffset, end: insertOffset },
        text: ` * @returns {${returnType}} Description\n `,
      },
    });
    return results;
  }

  // @returns exists — check that it has a {Type} and it matches
  const docReturnsType: string | null = extractReturnsType(jsDoc);
  if (!docReturnsType) {
    // Find "@returns " in the JSDoc to compute the insert offset after it
    const before: string = context.content.slice(0, exportNode.start);
    const trimmed: string = before.trimEnd();
    const docStart: number = trimmed.lastIndexOf('/**');
    const jsDocText: string = trimmed.slice(docStart);
    const returnsMatch: RegExpExecArray | null = /@returns\s+/.exec(jsDocText);
    const returnsInsert: number = returnsMatch
      ? docStart + returnsMatch.index + returnsMatch[0].length
      : exportNode.start;

    results.push({
      file: context.file,
      line: exportNode.loc.start.line,
      column: exportNode.loc.start.column + 1,
      severity: 'error',
      message: `@returns is missing {Type} for function '${funcName}' (returns ${returnType})`,
      ruleId: 'jsdoc/require-returns',
      tip: `Add type to @returns: @returns {${returnType}} Description`,
      fix: { range: { start: returnsInsert, end: returnsInsert }, text: `{${returnType}} ` },
    });
    return results;
  }

  // Check type match
  const normalizedDoc: string = normalizeType(docReturnsType);
  const normalizedActual: string = normalizeType(returnType);
  if (normalizedDoc !== normalizedActual) {
    // Find {WrongType} in the JSDoc to compute fix range
    const before: string = context.content.slice(0, exportNode.start);
    const trimmed: string = before.trimEnd();
    const docStart: number = trimmed.lastIndexOf('/**');
    const jsDocText: string = trimmed.slice(docStart);
    const typePattern: string = `{${docReturnsType}}`;
    // Search after @returns to avoid matching other {Type} patterns
    const returnsIdx: number = jsDocText.indexOf('@returns');
    const searchText: string = jsDocText.slice(returnsIdx);
    const typeOffset: number = searchText.indexOf(typePattern);
    const absStart: number = docStart + returnsIdx + typeOffset;
    const absEnd: number = absStart + typePattern.length;

    results.push({
      file: context.file,
      line: exportNode.loc.start.line,
      column: exportNode.loc.start.column + 1,
      severity: 'error',
      message: `@returns {${docReturnsType}} does not match actual return type '${returnType}' in '${funcName}'`,
      ruleId: 'jsdoc/require-returns',
      tip: `Update @returns type to match: @returns {${returnType}}`,
      fix: { range: { start: absStart, end: absEnd }, text: `{${returnType}}` },
    });
  }

  return results;
}
/** The require-returns lint rule. */
const rule: TypeScriptRule = {
  id: 'jsdoc/require-returns',
  description: 'Exported functions with non-void return types must have @returns {Type}',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['jsdoc'],
  fixable: true,
  stages: ['lint', 'ci'],

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const declaration = node.declaration as AstNode | undefined;
      if (!declaration) {
        return results;
      }

      if (declaration.type === 'FunctionDeclaration') {
        results.push(...checkFunction(declaration, node, context));
      }

      if (declaration.type === 'VariableDeclaration') {
        const declarations = declaration.declarations as AstNode[] | undefined;
        if (!declarations) {
          return results;
        }

        for (const decl of declarations) {
          const init = decl.init as AstNode | undefined;
          if (
            init &&
            (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
          ) {
            results.push(...checkFunction(init, node, context));
          }
        }
      }

      return results;
    },
  },
};

export default rule;
