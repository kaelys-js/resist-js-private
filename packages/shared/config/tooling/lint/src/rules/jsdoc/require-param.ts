/**
 * Rule: jsdoc/require-param
 *
 * Every function parameter must have a matching `@param` tag in JSDoc.
 * The `@param` name must match the actual parameter name.
 *
 * @module
 */

import * as v from 'valibot';

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

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

/** Schema for a parsed @param entry with optional type. */
const ParamEntrySchema = v.strictObject({
  /** The parameter name */
  name: v.string(),
  /** Whether a {Type} was present */
  hasType: v.boolean(),
});

/** Parsed @param entry with optional type. See {@link ParamEntrySchema}. */
type ParamEntry = v.InferOutput<typeof ParamEntrySchema>;

/**
 * Extract `@param` entries from a JSDoc comment, including type presence.
 *
 * @param jsDoc - The JSDoc comment string
 * @returns Array of parsed param entries
 */
function extractParamEntries(jsDoc: string): ParamEntry[] {
  const entries: ParamEntry[] = [];
  const regex: RegExp = /^\s*\*\s*@param\s+(?:(\{[^}]*\})\s+)?([\w.]+)/gm;
  let match: RegExpExecArray | null = regex.exec(jsDoc);
  while (match) {
    entries.push({
      name: match[2] ?? '',
      hasType: match[1] !== null && match[1] !== undefined,
    });
    match = regex.exec(jsDoc);
  }
  return entries;
}

/**
 * Extract parameter names from a function's AST params array.
 *
 * @param params - The function's params AST nodes
 * @returns Array of parameter names
 */
function extractFunctionParamNames(params: AstNode[]): string[] {
  const names: string[] = [];
  for (const param of params) {
    if (param.type === 'Identifier') {
      const name: string | undefined = param.name as string | undefined;
      if (name) {
        names.push(name);
      }
    } else if (param.type === 'AssignmentPattern') {
      const left = param.left as AstNode | undefined;
      if (left?.type === 'Identifier') {
        const name: string | undefined = left.name as string | undefined;
        if (name) {
          names.push(name);
        }
      }
    } else if (param.type === 'RestElement') {
      const argument = param.argument as AstNode | undefined;
      if (argument?.type === 'Identifier') {
        const name: string | undefined = argument.name as string | undefined;
        if (name) {
          names.push(name);
        }
      }
    } else if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
      names.push(`__destructured_${names.length}`);
    }
  }
  return names;
}

/**
 * Check a function node for missing @param tags.
 *
 * @param funcNode - The function AST node
 * @param exportNode - The export node (for JSDoc location)
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

  const params = funcNode.params as AstNode[] | undefined;
  if (!params || params.length === 0) {
    return results;
  }

  const docEntries: ParamEntry[] = extractParamEntries(jsDoc);
  const docParamNames: string[] = docEntries.map((e: ParamEntry): string => e.name);
  const funcParamNames: string[] = extractFunctionParamNames(params);
  const insertOffset: number = getJsDocEndOffset(exportNode, context.content);
  const funcName: string = ((funcNode.id as AstNode | undefined)?.name as string) ?? '<anonymous>';

  for (const paramName of funcParamNames) {
    if (paramName.startsWith('__destructured_')) {
      continue;
    }

    if (!docParamNames.includes(paramName)) {
      const fixText: string = ` * @param {Type} ${paramName} - Description\n `;
      results.push({
        file: context.file,
        line: exportNode.loc.start.line,
        column: exportNode.loc.start.column + 1,
        severity: 'error',
        message: `Missing @param tag for '${paramName}' in function '${funcName}'`,
        ruleId: 'jsdoc/require-param',
        tip: `Add @param {Type} ${paramName} - <description> to the JSDoc comment`,
        example: `@param {Type} ${paramName} - Description of the parameter`,
        fix: {
          range: { start: insertOffset, end: insertOffset },
          text: fixText,
        },
      });
    }
  }

  // Check that existing @param tags have {Type}
  for (const entry of docEntries) {
    if (!entry.hasType && funcParamNames.includes(entry.name)) {
      results.push({
        file: context.file,
        line: exportNode.loc.start.line,
        column: exportNode.loc.start.column + 1,
        severity: 'error',
        message: `@param '${entry.name}' is missing {Type} in function '${funcName}'`,
        ruleId: 'jsdoc/require-param',
        tip: `Add type: @param {Type} ${entry.name} - description`,
        example: `@param {Type} ${entry.name} - Description`,
        fix: { range: { start: exportNode.start, end: exportNode.start }, text: '' },
      });
    }
  }

  const hasDestructuredParams: boolean = funcParamNames.some((n: string): boolean =>
    n.startsWith('__destructured_'),
  );

  for (const docName of docParamNames) {
    // Skip dot-notation params (e.g., root0.plugins) — used for destructured params
    if (docName.includes('.')) {
      continue;
    }

    // Skip rootN pattern when function has destructured params (oxlint convention)
    if (/^root\d+$/.test(docName) && hasDestructuredParams) {
      continue;
    }

    if (!funcParamNames.includes(docName)) {
      results.push({
        file: context.file,
        line: exportNode.loc.start.line,
        column: exportNode.loc.start.column + 1,
        severity: 'error',
        message: `@param '${docName}' does not match any function parameter`,
        ruleId: 'jsdoc/require-param',
        tip: 'Remove the stale @param tag or fix the parameter name',
        fix: { range: { start: exportNode.start, end: exportNode.start }, text: '' },
      });
    }
  }

  return results;
}
/** The require-param lint rule. */
const rule: TypeScriptRule = {
  id: 'jsdoc/require-param',
  description: 'Every function parameter must have a matching @param in JSDoc',
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
