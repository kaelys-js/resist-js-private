/**
 * Rule: hygiene/no-bare-catch
 *
 * Bare catch blocks that swallow errors are forbidden — always bind the
 * error parameter so the exception is explicitly handled or logged.
 *
 * @module
 */

import {
  createResult,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/** The no-bare-catch lint rule. */
const rule: TypeScriptRule = {
  id: 'hygiene/no-bare-catch',
  description:
    'Bare catch blocks that swallow errors are forbidden — always bind the error parameter.',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['hygiene'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    CatchClause(node: AstNode, context: VisitorContext): LintResult[] {
      if (!node.param) {
        const line: number = node.loc?.start?.line ?? 1;

        // Check for disable comment on preceding line
        const lines: string[] = context.content.split('\n');
        const prevLine: string = lines[line - 2] ?? '';
        if (prevLine.includes('resist-lint-disable-next-line: hygiene/no-bare-catch')) {
          return [];
        }

        return [
          createResult(
            'hygiene/no-bare-catch',
            context.file,
            line,
            node.loc?.start?.column ?? 1,
            'error',
            'Bare catch blocks that swallow errors are forbidden — always bind the error parameter.',
            {
              tip: 'Add a parameter binding: catch (error: unknown) { ... }',
              example: 'try { ... } catch (error: unknown) { handleError(error); }',
            },
          ),
        ];
      }

      return [];
    },
  },
};

export default rule;
