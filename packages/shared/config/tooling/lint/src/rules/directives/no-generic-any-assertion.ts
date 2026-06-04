/**
 * Rule: directives/no-generic-any-assertion
 *
 * Detects `as any` type assertions that defeat TypeScript's type safety.
 * Encourages using proper types or `unknown` with type guards instead.
 *
 * The auto-fix replaces `as any` with `as unknown`, which is the safe
 * mechanical transform — `unknown` forces the developer to add proper
 * type narrowing before using the value.
 *
 * Exception: when the `as any` is the INNER operand of an enclosing
 * `as` expression (a chain `x as any as T`), no fix is emitted (NO_OP_FIX).
 * That chain is owned by directives/no-type-assertion-chain, whose fix
 * rewrites the whole `outer` range; emitting an inner `any → unknown`
 * fix here would overlap with it (the --fix applier has no overlap
 * detection). The diagnostic is still reported.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintFix,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';
import { walkNode } from '@/lint/framework/oxc-runner.ts';

/** ruleState key for the memoised set of chained-inner `as` node identities. */
const CHAIN_INNER_KEY: string = 'no-generic-any-assertion:chain-inner';

/**
 * Build a stable identity key for an AST node from its byte range.
 *
 * @param {AstNode} astNode - Node with start/end byte offsets.
 * @returns {string} A `"start:end"` identity key.
 */
function nodeKey(astNode: AstNode): string {
  return `${String(astNode.start)}:${String(astNode.end)}`;
}

/**
 * Pre-pass: collect the identities of every `TSAsExpression` that is the
 * inner operand (`.expression`) of an enclosing `TSAsExpression`.
 *
 * For a chain `x as any as T`, the AST is
 * `outer(TSAsExpression){ expression: inner(TSAsExpression){ … }, … }`.
 * The inner node is the one whose typeAnnotation is `any`, so collecting
 * inner-operand identities lets the visitor recognise and skip it.
 *
 * @param {AstNode} ast - Program AST root.
 * @returns {Set<string>} Identity keys of chained inner `as` nodes.
 */
function collectChainInnerNodes(ast: AstNode): Set<string> {
  const inner: Set<string> = new Set<string>();

  walkNode(ast, (node: AstNode): void => {
    if (node.type !== 'TSAsExpression') {
      return;
    }

    const { expression } = node;

    if (expression !== null && typeof expression === 'object') {
      const exprNode: AstNode = expression as AstNode;

      if (exprNode.type === 'TSAsExpression') {
        inner.add(nodeKey(exprNode));
      }
    }
  });

  return inner;
}

/**
 * Resolve (memoised per file) the set of chained inner `as` node identities.
 *
 * @param {VisitorContext} context - Visitor context (carries ruleState + ast).
 * @returns {Set<string>} Identity keys of chained inner `as` nodes.
 */
function getChainInnerNodes(context: VisitorContext): Set<string> {
  const state: Map<string, unknown> | undefined = context.ruleState;
  const cached: unknown = state?.get(CHAIN_INNER_KEY);

  if (cached instanceof Set) {
    return cached as Set<string>;
  }

  const computed: Set<string> = collectChainInnerNodes(context.ast);
  state?.set(CHAIN_INNER_KEY, computed);
  return computed;
}

/**
 * Build a fix that replaces `as any` with `as unknown`.
 *
 * Replaces only the type annotation node (the `any` keyword) with `unknown`.
 *
 * @param {AstNode} typeNode - The TSAnyKeyword AST node
 * @returns {LintFix} Fix that replaces `any` with `unknown`
 */
function buildAsUnknownFix(typeNode: AstNode): LintFix {
  const start: number = typeNode.start as number;
  const end: number = typeNode.end as number;

  return { range: { start, end }, text: 'unknown' };
}

/** The no-generic-any-assertion lint rule. */
const rule: TypeScriptRule = {
  id: 'directives/no-generic-any-assertion',
  description: "Disallow 'as any' type assertions",
  patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.js', '**/*.jsx'],
  categories: ['directives', 'safety'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    TSAsExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      const { typeAnnotation } = node;

      if (typeAnnotation === null || typeof typeAnnotation !== 'object') {
        return results;
      }

      const typeNode: AstNode = typeAnnotation as AstNode;

      if (typeNode.type !== 'TSAnyKeyword') {
        return results;
      }

      /* If this `as any` is the inner operand of an enclosing `as` expression
       * (a chain `x as any as T`), emit no fix — the chain rule owns that
       * rewrite and our inner fix would overlap with it. Still report. */
      const isChainInner: boolean = getChainInnerNodes(context).has(nodeKey(node));
      const fix: LintFix = isChainInner ? NO_OP_FIX : buildAsUnknownFix(typeNode);

      results.push({
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message:
          "'as any' assertion defeats type safety - use proper types or 'unknown' with type guards",
        ruleId: 'directives/no-generic-any-assertion',
        tip: "Replace 'as any' with proper type, or use 'unknown' with runtime type narrowing",
        fix,
      });

      return results;
    },
  },
};

export default rule;
