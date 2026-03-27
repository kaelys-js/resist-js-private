/**
 * Rule: valibot/validate-function-output
 *
 * Exported functions that return data should validate their return
 * values using safeParse or a Result type. Unvalidated return values
 * can propagate invalid data to consumers.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Return type annotations that indicate the function already validates output. */
const VALIDATED_RETURN_PATTERNS: readonly string[] = [
  'Result',
  'SafeParseResult',
  'Promise<Result',
  'safeParse',
];

/** The validate-function-output lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'quality'],
  description: 'Exported functions returning data should validate return values',
  id: 'valibot/validate-function-output',
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

      if (declaration.type !== 'FunctionDeclaration') {
        return results;
      }

      const id = declaration.id as AstNode | undefined;
      const funcName: string = (id?.name as string) ?? '';
      if (!funcName) {
        return results;
      }

      // Check return type annotation — skip void/never functions
      const returnType = declaration.returnType as AstNode | undefined;
      if (returnType) {
        if (
          context.content.slice(returnType.start, returnType.end).includes('void') ||
          context.content.slice(returnType.start, returnType.end).includes('never')
        ) {
          return results;
        }

        // Skip functions that already return Result or SafeParseResult
        const hasValidatedReturn: boolean = VALIDATED_RETURN_PATTERNS.some(
          (pattern: string): boolean =>
            context.content.slice(returnType.start, returnType.end).includes(pattern),
        );
        if (hasValidatedReturn) {
          return results;
        }
      }

      // Check function body for safeParse usage
      const body = declaration.body as AstNode | undefined;
      if (!body) {
        return results;
      }

      if (
        context.content.slice(body.start, body.end).includes('safeParse') ||
        context.content.slice(body.start, body.end).includes('Result')
      ) {
        return results;
      }

      // Skip functions without return statements (effectively void)
      if (!context.content.slice(body.start, body.end).includes('return ')) {
        return results;
      }

      results.push({
        column: node.loc.start.column + 1,
        file: context.file,
        fix: { range: { end: 0, start: 0 }, text: '' },
        line: node.loc.start.line,
        message: `Exported function '${funcName}' returns data without validation — consider using safeParse on the return value`,
        ruleId: 'valibot/validate-function-output',
        severity: 'info',
        tip: 'Validate the return value with safeParse or return a Result type to ensure type safety for consumers',
      });

      return results;
    },
  },
};

export default rule;
