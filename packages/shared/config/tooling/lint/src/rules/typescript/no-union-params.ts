/**
 * Rule: typescript/no-union-params
 *
 * Exported function parameters must not use `|` union types.
 * Optionality belongs in Valibot schemas via `v.optional()`,
 * variant types via `v.union()` or `v.variant()`.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /config\/tooling\/lint\//,
  /config\/test\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

/** Union type patterns that are exempt (external types without Valibot equivalents). */
const EXEMPT_UNION_PATTERNS: readonly RegExp[] = [
  /\bDate\b.*\bNum\b|\bNum\b.*\bDate\b/, // Date | Num — common date/timestamp pattern
  /\bIntl\./, // External Intl types
];

/**
 * Check if a file is exempt from this rule.
 *
 * @param {string} filePath - File path
 * @returns {boolean} Whether exempt
 */
function isExempt(filePath: string): boolean {
  return EXEMPT_PATTERNS.some((p: RegExp): boolean => p.test(filePath));
}

/**
 * Extract parameter name from an AST node.
 *
 * @param {AstNode} param - Parameter AST node
 * @returns {string} Parameter name or '<destructured>'
 */
function getParamName(param: AstNode): string {
  if (param.type === 'Identifier') {
    return (param.name as string) ?? '<unknown>';
  }
  if (param.type === 'AssignmentPattern') {
    const left = param.left as AstNode | undefined;
    if (left?.type === 'Identifier') {
      return (left.name as string) ?? '<unknown>';
    }
  }
  if (param.type === 'RestElement') {
    const arg = param.argument as AstNode | undefined;
    if (arg?.type === 'Identifier') {
      return (arg.name as string) ?? '<unknown>';
    }
  }
  return '<destructured>';
}

/**
 * Get type annotation from a parameter node.
 *
 * @param {AstNode} param - Parameter AST node
 * @returns {AstNode | undefined} Type annotation node
 */
function getTypeAnnotation(param: AstNode): AstNode | undefined {
  if (param.type === 'Identifier' || param.type === 'RestElement') {
    return (param.typeAnnotation as AstNode | undefined)?.typeAnnotation as AstNode | undefined;
  }
  if (param.type === 'AssignmentPattern') {
    const left = param.left as AstNode | undefined;
    return (left?.typeAnnotation as AstNode | undefined)?.typeAnnotation as AstNode | undefined;
  }
  return undefined;
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'typescript/no-union-params',
  description: 'Function parameters must not use | union types — use Valibot schemas instead',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      if (isExempt(context.file)) {
        return [];
      }

      const declaration = node.declaration as AstNode | undefined;
      if (!declaration) {
        return [];
      }
      if (declaration.type !== 'FunctionDeclaration') {
        return [];
      }

      const params = declaration.params as AstNode[] | undefined;
      if (!params) {
        return [];
      }

      const results: LintResult[] = [];

      for (const param of params) {
        const typeNode: AstNode | undefined = getTypeAnnotation(param);
        if (!typeNode || typeNode.type !== 'TSUnionType') {
          continue;
        }

        // Check if the union text matches an exempt pattern
        const unionText: string = context.content.slice(typeNode.start, typeNode.end);
        const isExemptUnion: boolean = EXEMPT_UNION_PATTERNS.some((p: RegExp): boolean =>
          p.test(unionText),
        );
        if (isExemptUnion) {
          continue;
        }

        const paramName: string = getParamName(param);

        results.push({
          file: context.file,
          line: param.loc.start.line,
          column: param.loc.start.column + 1,
          severity: 'error',
          message: `Parameter '${paramName}' uses union type — express optionality/variants in Valibot schema instead`,
          ruleId: 'typescript/no-union-params',
          tip: 'Use v.optional(schema) or v.union([...]) in the schema, then use the inferred type',
          fix: { range: { start: param.start, end: param.end }, text: '' },
        });
      }

      return results;
    },
  },
};

export default rule;
