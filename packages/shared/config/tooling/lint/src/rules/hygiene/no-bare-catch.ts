/**
 * Rule: hygiene/no-bare-catch
 *
 * Bare catch blocks that swallow errors are forbidden — always bind the
 * error parameter so the exception is explicitly handled or logged.
 *
 * The auto-fix inserts `(error: unknown)` after the `catch` keyword,
 * turning `catch {` into `catch (error: unknown) {`.
 *
 * @module
 */

import {
  NO_OP_FIX,
  createResult,
  type TypeScriptRule,
  type LintResult,
  type LintFix,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';

/** No-op fix sentinel. */
const NO_FIX: LintFix = NO_OP_FIX;

/**
 * Build a fix that inserts `(error: unknown)` after the `catch` keyword.
 *
 * Finds the `catch` keyword in the source text at the node's position
 * and inserts the parameter binding before the opening brace.
 *
 * @param {AstNode} node - The CatchClause AST node
 * @param {string} source - Full source text
 * @returns {LintFix} The fix or NO_FIX
 */
function buildCatchParamFix(node: AstNode, source: string): LintFix {
  const nodeStart: number = node.start as number;
  const nodeEnd: number = node.end as number;
  const catchText: string = source.slice(nodeStart, nodeEnd);

  /* Find the opening brace of the catch body */
  const braceIdx: number = catchText.indexOf('{');

  if (braceIdx === -1) {
    return NO_FIX;
  }

  /* Insert `(error: unknown) ` before the opening brace.
   * Handle both `catch {` and `catch  {` (with extra whitespace). */
  const beforeBrace: string = catchText.slice(0, braceIdx).trimEnd();
  const afterBrace: string = catchText.slice(braceIdx);

  return {
    range: { start: nodeStart, end: nodeEnd },
    text: `${beforeBrace} (error: unknown) ${afterBrace}`,
  };
}

/** The no-bare-catch lint rule. */
const rule: TypeScriptRule = {
  id: 'hygiene/no-bare-catch',
  description:
    'Bare catch blocks that swallow errors are forbidden — always bind the error parameter.',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  categories: ['hygiene'],
  stages: ['lint', 'ci'],
  fixable: true,

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
              fix: buildCatchParamFix(node, context.content),
            },
          ),
        ];
      }

      return [];
    },
  },
};

export default rule;
