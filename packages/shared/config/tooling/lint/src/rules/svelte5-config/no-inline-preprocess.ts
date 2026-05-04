/**
 * Rule: svelte5-config/no-inline-preprocess
 *
 * Warns when the `preprocess` array contains inline object literals with
 * `markup`, `script`, or `style` function properties. Complex preprocessors
 * should be extracted to separate modules.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { getDefaultExportObject, getPropertyValueNode, hasProperty } from './_config-ast.ts';

/** Preprocessor hook names that indicate an inline preprocessor object. */
const PREPROCESS_HOOKS: ReadonlySet<string> = new Set(['markup', 'script', 'style']);

/** The no-inline-preprocess lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/no-inline-preprocess',
  description: 'Complex inline preprocessor should be extracted to a separate module',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);

      if (!configObj) {
        return [];
      }

      const preprocessValue: AstNode | undefined = getPropertyValueNode(configObj, 'preprocess');

      if (!preprocessValue) {
        return [];
      }

      const results: LintResult[] = [];

      // Check array elements
      if (preprocessValue.type === 'ArrayExpression') {
        const elements: AstNode[] | undefined = preprocessValue.elements as AstNode[] | undefined;

        if (!elements) {
          return [];
        }

        for (const el of elements) {
          if (el?.type === 'ObjectExpression') {
            let hasHook: boolean = false;

            for (const hook of PREPROCESS_HOOKS) {
              if (hasProperty(el, hook)) {
                hasHook = true;
                break;
              }
            }

            if (hasHook) {
              results.push({
                file: context.file,
                line: el.loc.start.line,
                column: el.loc.start.column + 1,
                severity: 'warning',
                message: 'Complex inline preprocessor should be extracted to a separate module',
                ruleId: rule.id,
                tip: 'Create preprocessor in config/preprocessors.js and import it',
                fix: { range: { start: 0, end: 0 }, text: '' },
              });
            }
          }
        }
      }

      // Single inline preprocessor object (not in array)
      if (preprocessValue.type === 'ObjectExpression') {
        const hasHook: boolean = [...PREPROCESS_HOOKS].some((hook: string): boolean =>
          hasProperty(preprocessValue, hook),
        );

        if (hasHook) {
          results.push({
            file: context.file,
            line: preprocessValue.loc.start.line,
            column: preprocessValue.loc.start.column + 1,
            severity: 'warning',
            message: 'Complex inline preprocessor should be extracted to a separate module',
            ruleId: rule.id,
            tip: 'Create preprocessor in config/preprocessors.js and import it',
            fix: { range: { start: 0, end: 0 }, text: '' },
          });
        }
      }

      return results;
    },
  },
};

export default rule;
