/**
 * Rule: typescript/no-bare-data-types
 *
 * Forbids `interface` declarations, `type X = { ... }` bare object types,
 * inline object types in function return annotations, and inline object
 * types in function parameter annotations.
 *
 * Data types must be derived from Valibot schemas using `v.InferOutput<>`.
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
 * Get function name from a function node or its parent variable declarator.
 *
 * @param {AstNode} funcNode - The function AST node
 * @param {VisitorContext} context - Visitor context
 * @returns {string} The function name or '<anonymous>'
 */
function getFuncName(funcNode: AstNode, context: VisitorContext): string {
  // Named function declaration
  const id = funcNode.id as AstNode | undefined;

  if (id?.name) {
    return id.name as string;
  }

  // Arrow/function expression assigned to a variable — look backwards for `const name =`
  const before: string = context.content.slice(Math.max(0, funcNode.start - 100), funcNode.start);
  const varMatch: RegExpMatchArray | null = before.match(/(?:const|let|var)\s+(\w+)\s*=\s*$/);

  if (varMatch) {
    return varMatch[1] ?? '<anonymous>';
  }

  return '<anonymous>';
}

/**
 * Check a function's return type for inline object literals.
 *
 * @param {AstNode} funcNode - Function AST node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintResult[]} Any violations
 */
function checkReturnType(funcNode: AstNode, context: VisitorContext): LintResult[] {
  const returnType = funcNode.returnType as AstNode | undefined;

  if (!returnType) {
    return [];
  }

  const typeAnnotation = returnType.typeAnnotation as AstNode | undefined;

  if (!typeAnnotation) {
    return [];
  }

  if (typeAnnotation.type !== 'TSTypeLiteral') {
    return [];
  }

  const funcName: string = getFuncName(funcNode, context);

  return [
    {
      file: context.file,
      line: funcNode.loc.start.line,
      column: funcNode.loc.start.column + 1,
      severity: 'error',
      message: `Function '${funcName}' has inline object return type — define a Valibot schema and use the derived type`,
      ruleId: 'typescript/no-bare-data-types',
      tip: 'Create a schema: const XSchema = v.strictObject({ ... }); type X = v.InferOutput<typeof XSchema>; then use X as the return type',
      fix: {
        range: { start: typeAnnotation.start, end: typeAnnotation.end },
        text: 'NamedType /* TODO: replace with Valibot-derived type */',
      },
    },
  ];
}

/**
 * Check a function's parameters for inline object type annotations.
 *
 * @param {AstNode} funcNode - Function AST node
 * @param {VisitorContext} context - Visitor context
 * @returns {LintResult[]} Any violations
 */
function checkParamTypes(funcNode: AstNode, context: VisitorContext): LintResult[] {
  const results: LintResult[] = [];
  const params = funcNode.params as AstNode[] | undefined;

  if (!params) {
    return results;
  }

  for (const param of params) {
    const typeAnnotation = (param.typeAnnotation as AstNode | undefined)?.typeAnnotation as
      | AstNode
      | undefined; // cast safe: AST property chain

    if (!typeAnnotation) {
      continue;
    }
    if (typeAnnotation.type !== 'TSTypeLiteral') {
      continue;
    }

    const paramName: string =
      (param.name as string) ?? ((param.left as AstNode | undefined)?.name as string) ?? 'param'; // cast safe: AST property

    results.push({
      file: context.file,
      line: param.loc.start.line,
      column: param.loc.start.column + 1,
      severity: 'error',
      message: `Parameter '${paramName}' has inline object type — define a Valibot schema and use the derived type`,
      ruleId: 'typescript/no-bare-data-types',
      tip: 'Create a schema: const XSchema = v.strictObject({ ... }); type X = v.InferOutput<typeof XSchema>; then use X as the param type',
      fix: {
        range: { start: typeAnnotation.start, end: typeAnnotation.end },
        text: 'NamedType /* TODO: replace with Valibot-derived type */',
      },
    });
  }

  return results;
}

/**
 * Check if a TSTypeLiteral contains only method/function signatures (not data).
 *
 * @param {AstNode} typeNode - TSTypeLiteral AST node
 * @returns {boolean} Whether all members are methods
 */
function isAllMethodsType(typeNode: AstNode): boolean {
  const members = typeNode.members as AstNode[] | undefined;

  if (!members || members.length === 0) {
    return false;
  }
  return members.every((m: AstNode): boolean => {
    if (m.type === 'TSMethodSignature') {
      return true;
    }
    if (m.type === 'TSPropertySignature') {
      const memberType = (m.typeAnnotation as AstNode | undefined)?.typeAnnotation as
        | AstNode
        | undefined;

      if (memberType?.type === 'TSFunctionType') {
        return true;
      }
    }
    return false;
  });
}
/** The no-bare-data-types lint rule. */
const rule: TypeScriptRule = {
  id: 'typescript/no-bare-data-types',
  description: 'Data types must use Valibot schemas, not interface/type literals',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['typescript', 'valibot'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    TSInterfaceDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const name: string = ((node.id as AstNode)?.name as string) ?? 'unknown'; // cast safe: AST property

      // Check if the interface extends a Valibot base type
      const bodyText: string = context.content.slice(
        Math.max(0, node.start - 5),
        Math.min(context.content.length, node.end + 5),
      );

      if (/extends\s+.*(?:Base|Valibot|Schema)/.test(bodyText)) {
        return [];
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Interface '${name}' should be a Valibot schema with v.InferOutput<>`,
          ruleId: 'typescript/no-bare-data-types',
          tip: 'Define a Valibot schema and derive the type: type X = v.InferOutput<typeof XSchema>',
          fix: {
            range: { start: node.start, end: node.end },
            text: `const ${name}Schema = v.strictObject({ /* fields */ });\ntype ${name} = v.InferOutput<typeof ${name}Schema>;`,
          },
        },
      ];
    },

    TSTypeAliasDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const typeAnnotation = node.typeAnnotation as AstNode | undefined; // cast safe: AST property

      if (!typeAnnotation) {
        return [];
      }

      // Only flag bare object literal types: type X = { ... }
      if (typeAnnotation.type !== 'TSTypeLiteral') {
        return [];
      }

      // Skip generic type aliases — type parameters have no runtime representation,
      // so the type can't be expressed as a Valibot schema
      if (node.typeParameters) {
        return [];
      }

      // Skip if all members are function signatures (constructor/class interfaces, not data)
      if (isAllMethodsType(typeAnnotation)) {
        return [];
      }

      const name: string = ((node.id as AstNode)?.name as string) ?? 'unknown'; // cast safe: AST property

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Type '${name}' uses bare object literal — use Valibot schema instead`,
          ruleId: 'typescript/no-bare-data-types',
          tip: 'Define a Valibot schema and derive the type: type X = v.InferOutput<typeof XSchema>',
          fix: {
            range: { start: node.start, end: node.end },
            text: `const ${name}Schema = v.strictObject({ /* fields */ });\ntype ${name} = v.InferOutput<typeof ${name}Schema>;`,
          },
        },
      ];
    },

    FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      return [...checkReturnType(node, context), ...checkParamTypes(node, context)];
    },

    ArrowFunctionExpression(node: AstNode, context: VisitorContext): LintResult[] {
      return [...checkReturnType(node, context), ...checkParamTypes(node, context)];
    },

    VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const declarations = node.declarations as AstNode[] | undefined;

      if (!declarations) {
        return results;
      }

      for (const decl of declarations) {
        const id = decl.id as AstNode | undefined;

        if (!id) {
          continue;
        }

        // Get type annotation — works for both simple identifiers and destructured patterns
        const annotation = (id.typeAnnotation as AstNode | undefined)?.typeAnnotation as
          | AstNode
          | undefined;

        if (!annotation || annotation.type !== 'TSTypeLiteral') {
          continue;
        }

        // Skip all-method types (constructor/class interfaces)
        if (isAllMethodsType(annotation)) {
          continue;
        }

        const name: string =
          id.type === 'Identifier' ? ((id.name as string) ?? '<variable>') : '<destructured>';

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: id.loc.start.column + 1,
          severity: 'error',
          message: `${name === '<destructured>' ? 'Destructured' : `Variable '${name}'`} uses inline object type — define a Valibot schema instead`,
          ruleId: 'typescript/no-bare-data-types',
          tip: 'Create a named schema: const XSchema = v.strictObject({ ... }); type X = v.InferOutput<typeof XSchema>',
          fix: {
            range: { start: annotation.start, end: annotation.end },
            text: 'NamedType /* TODO: replace with Valibot-derived type */',
          },
        });
      }

      return results;
    },

    TSAsExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const typeAnnotation = node.typeAnnotation as AstNode | undefined;

      if (!typeAnnotation || typeAnnotation.type !== 'TSTypeLiteral') {
        return [];
      }

      // Skip all-method types
      if (isAllMethodsType(typeAnnotation)) {
        return [];
      }

      return [
        {
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: 'Cast uses inline object type — define a Valibot schema instead',
          ruleId: 'typescript/no-bare-data-types',
          tip: 'Create a named schema and use the inferred type for the cast',
          fix: {
            range: { start: typeAnnotation.start, end: typeAnnotation.end },
            text: 'NamedType /* TODO: replace with Valibot-derived type */',
          },
        },
      ];
    },
  },
};

export default rule;
