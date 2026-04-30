/**
 * Rule: valibot/validate-boundaries
 *
 * Exported functions should validate their inputs at module boundaries.
 * Functions that accept external data should use Valibot schemas to validate
 * inputs, ensuring type safety at runtime boundaries.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Patterns that indicate validation in function body. */
const VALIDATION_PATTERNS: readonly RegExp[] = [
  /safeParse\s*\(/,
  /v\.parse\s*\(/,
  /v\.safeParse\s*\(/,
  /v\.is\s*\(/,
  /validate\s*\(/,
  /Schema\./,
];

/** The validate-boundaries lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'quality'],
  description: 'Exported functions should validate inputs at module boundaries',
  id: 'valibot/validate-boundaries',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],
  fixable: false,

  visitor: {
    ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const declaration = node.declaration as AstNode | undefined;

      if (!declaration) {
        return results;
      }

      // Check for exported function declarations
      if (declaration.type !== 'FunctionDeclaration') {
        return results;
      }

      const id = declaration.id as AstNode | undefined;
      const funcName: string = (id?.name as string) ?? '';

      // Skip functions with no parameters (nothing to validate)
      const params = declaration.params as AstNode[] | undefined;

      if (!params || params.length === 0) {
        return results;
      }

      // Get the function body text
      const body = declaration.body as AstNode | undefined;

      if (!body) {
        return results;
      }

      const bodyText: string = context.content.slice(body.start, body.end);

      // Check if body contains any validation pattern
      let hasValidation: boolean = false;

      for (const pattern of VALIDATION_PATTERNS) {
        if (pattern.test(bodyText)) {
          hasValidation = true;
          break;
        }
      }

      if (!hasValidation) {
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: 0, start: 0 }, text: '' },
          line: node.loc.start.line,
          message: `Exported function '${funcName}' does not validate its inputs`,
          ruleId: 'valibot/validate-boundaries',
          severity: 'info',
          tip: 'Add input validation with safeParse() at module boundaries for runtime type safety',
        });
      }

      return results;
    },
  },
};

export default rule;
