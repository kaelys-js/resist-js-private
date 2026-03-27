/**
 * Rule: jsdoc/param-type-match
 *
 * When `@param` includes a `{Type}`, it must match the actual TypeScript
 * type annotation on the corresponding parameter.
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

/** Schema for a parsed @param entry with optional type. */
const DocParamSchema = v.strictObject({
  /** The type in braces, if present */
  type: v.nullable(v.string()),
  /** The parameter name */
  name: v.string(),
});

/** Parsed @param entry with optional type. See {@link DocParamSchema}. */
type DocParam = v.InferOutput<typeof DocParamSchema>;

/**
 * Extract @param entries from JSDoc, including their types.
 *
 * @param jsDoc - JSDoc comment string
 * @returns Array of parsed param entries
 */
function extractDocParams(jsDoc: string): DocParam[] {
  const params: DocParam[] = [];
  // Matches @param {Type} name  OR  @param name at JSDoc line starts
  const regex: RegExp = /^\s*\*\s*@param\s+(?:\{([^}]*)\}\s+)?(\w+)/gm;
  let match: RegExpExecArray | null = regex.exec(jsDoc);
  while (match) {
    params.push({
      type: match[1] ?? null,
      name: match[2] ?? '',
    });
    match = regex.exec(jsDoc);
  }
  return params;
}

/**
 * Get the type annotation string for a function parameter.
 *
 * @param param - Parameter AST node
 * @param content - File source text
 * @returns The type annotation text, or null
 */
function getParamType(param: AstNode, content: string): string | null {
  // For Identifier params: look at typeAnnotation
  let target: AstNode = param;

  // AssignmentPattern (default values): check the left side
  if (param.type === 'AssignmentPattern') {
    const left = param.left as AstNode | undefined;
    if (left) {
      target = left;
    }
  }

  const typeAnnotation = target.typeAnnotation as AstNode | undefined;
  if (!typeAnnotation) {
    return null;
  }

  const innerType = typeAnnotation.typeAnnotation as AstNode | undefined;
  if (!innerType) {
    return content.slice(typeAnnotation.start, typeAnnotation.end).replace(/^:\s*/, '');
  }

  return content.slice(innerType.start, innerType.end);
}

/**
 * Normalize a type string for comparison (strip whitespace, generics formatting).
 *
 * @param type - Type string
 * @returns Normalized type string
 */
function normalizeType(type: string): string {
  return type.replaceAll(/\s+/g, ' ').trim();
}

/**
 * Check a function's @param types against actual parameter types.
 *
 * @param funcNode - Function AST node
 * @param exportNode - Export node (for JSDoc location)
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

  const docParams: DocParam[] = extractDocParams(jsDoc);
  const params = funcNode.params as AstNode[] | undefined;
  if (!params) {
    return results;
  }

  // Build a map of actual param name → type
  const actualTypes: Map<string, string> = new Map();
  for (const param of params) {
    let name: string | null = null;

    if (param.type === 'Identifier') {
      name = (param.name as string) ?? null;
    } else if (param.type === 'AssignmentPattern') {
      const left = param.left as AstNode | undefined;
      if (left?.type === 'Identifier') {
        name = (left.name as string) ?? null;
      }
    } else if (param.type === 'RestElement') {
      const arg = param.argument as AstNode | undefined;
      if (arg?.type === 'Identifier') {
        name = (arg.name as string) ?? null;
      }
    }

    if (name) {
      const type: string | null = getParamType(param, context.content);
      if (type) {
        actualTypes.set(name, type);
      }
    }
  }

  // Check each @param {Type} against actual type
  for (const docParam of docParams) {
    if (!docParam.type) {
      continue;
    } // No type in JSDoc — nothing to check

    const actualType: string | undefined = actualTypes.get(docParam.name);
    if (!actualType) {
      continue;
    } // Param not found — handled by require-param

    const normalizedDoc: string = normalizeType(docParam.type);
    const normalizedActual: string = normalizeType(actualType);

    if (normalizedDoc !== normalizedActual) {
      // Find the {WrongType} substring in the JSDoc to compute fix range
      const before: string = context.content.slice(0, exportNode.start);
      const trimmed: string = before.trimEnd();
      const docStart: number = trimmed.lastIndexOf('/**');
      const typePattern: string = `{${docParam.type}}`;
      const jsDocText: string = trimmed.slice(docStart);
      const typeOffset: number = jsDocText.indexOf(typePattern);
      const absStart: number = docStart + typeOffset;
      const absEnd: number = absStart + typePattern.length;

      results.push({
        file: context.file,
        line: exportNode.loc.start.line,
        column: exportNode.loc.start.column + 1,
        severity: 'error',
        message: `@param {${docParam.type}} ${docParam.name} does not match actual type '${actualType}'`,
        ruleId: 'jsdoc/param-type-match',
        tip: `Update the @param type to match: @param {${actualType}} ${docParam.name}`,
        fix: { range: { start: absStart, end: absEnd }, text: `{${actualType}}` },
      });
    }
  }

  return results;
}
/** The param-type-match lint rule. */
const rule: TypeScriptRule = {
  id: 'jsdoc/param-type-match',
  description: '@param {Type} must match the actual TypeScript type annotation',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['jsdoc', 'typescript'],
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
