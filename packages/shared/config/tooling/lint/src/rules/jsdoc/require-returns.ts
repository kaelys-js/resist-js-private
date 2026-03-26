/**
 * Rule: jsdoc/require-returns
 *
 * Exported functions with a non-void return type must have a `@returns` tag
 * that includes a `{Type}` matching the actual return type annotation.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

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
 * Extract the @returns type from JSDoc if present.
 *
 * @param jsDoc - JSDoc comment text
 * @returns The type string from @returns {Type}, or null
 */
function extractReturnsType(jsDoc: string): string | null {
  const match: RegExpMatchArray | null = jsDoc.match(/@returns\s+\{([^}]+)\}/);
  return match ? (match[1] ?? '').trim() : null;
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
    results.push({
      file: context.file,
      line: exportNode.loc.start.line,
      column: exportNode.loc.start.column + 1,
      severity: 'error',
      message: `@returns is missing {Type} for function '${funcName}' (returns ${returnType})`,
      ruleId: 'jsdoc/require-returns',
      tip: `Add type to @returns: @returns {${returnType}} Description`,
      fix: { range: { start: exportNode.start, end: exportNode.start }, text: '' },
    });
    return results;
  }

  // Check type match
  const normalizedDoc: string = normalizeType(docReturnsType);
  const normalizedActual: string = normalizeType(returnType);
  if (normalizedDoc !== normalizedActual) {
    results.push({
      file: context.file,
      line: exportNode.loc.start.line,
      column: exportNode.loc.start.column + 1,
      severity: 'error',
      message: `@returns {${docReturnsType}} does not match actual return type '${returnType}' in '${funcName}'`,
      ruleId: 'jsdoc/require-returns',
      tip: `Update @returns type to match: @returns {${returnType}}`,
      fix: { range: { start: exportNode.start, end: exportNode.start }, text: '' },
    });
  }

  return results;
}

const rule: TypeScriptRule = {
  id: 'jsdoc/require-returns',
  description: 'Exported functions with non-void return types must have @returns {Type}',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

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
