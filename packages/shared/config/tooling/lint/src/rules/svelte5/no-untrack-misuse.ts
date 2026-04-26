/**
 * Rule: svelte5/no-untrack-misuse
 *
 * Catches `untrack()` used on non-reactive values. `untrack` is only needed
 * for `$state`/`$derived` values you want to read without tracking.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Plan: docs/plans/2026-03-30-linter-phase-49.md TASK 19
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';
import { walkNode } from '@/lint/framework/oxc-runner.ts';
import { collectStateVariables, collectDerivedVariables } from './_svelte-helpers.ts';

/**
 * Get the text representation of an expression node for the error message.
 *
 * @param {AstNode} node - An expression AST node
 * @returns {string} A short text describing the expression
 */
function getExpressionText(node: AstNode): string {
  if (node.type === 'Identifier') {
    return (node as unknown as { name: string }).name;
  }

  if (
    node.type === 'NumericLiteral' ||
    node.type === 'StringLiteral' ||
    node.type === 'BooleanLiteral'
  ) {
    const value: unknown = (node as { value?: unknown }).value;
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    return String(value);
  }

  if (node.type === 'NullLiteral') {
    return 'null';
  }

  if (node.type === 'CallExpression') {
    const callee: AstNode | undefined = node.callee as AstNode | undefined;
    if (callee?.type === 'Identifier') {
      return `${(callee as unknown as { name: string }).name}()`;
    }
    if (
      callee?.type === 'StaticMemberExpression' ||
      (callee?.type === 'MemberExpression' && !(callee as { computed?: boolean }).computed)
    ) {
      const obj: AstNode | undefined = (callee as { object?: AstNode }).object;
      const prop: AstNode | undefined = (callee as { property?: AstNode }).property;
      if (obj?.type === 'Identifier' && prop?.type === 'Identifier') {
        return `${(obj as unknown as { name: string }).name}.${(prop as unknown as { name: string }).name}()`;
      }
    }
    return '<call>';
  }

  if (
    node.type === 'StaticMemberExpression' ||
    (node.type === 'MemberExpression' && !(node as { computed?: boolean }).computed)
  ) {
    const obj: AstNode | undefined = (node as { object?: AstNode }).object;
    const prop: AstNode | undefined = (node as { property?: AstNode }).property;
    if (obj?.type === 'Identifier' && prop?.type === 'Identifier') {
      return `${(obj as unknown as { name: string }).name}.${(prop as unknown as { name: string }).name}`;
    }
  }

  return '<expression>';
}

/**
 * Check if an expression references any reactive variables.
 *
 * @param {AstNode} node - An expression node
 * @param {Set<string>} reactiveVars - Set of reactive variable names ($state + $derived)
 * @returns {boolean} Whether the expression references reactive state
 */
function referencesReactiveVar(node: AstNode, reactiveVars: Set<string>): boolean {
  let found: boolean = false;

  walkNode(node, (n: AstNode): void => {
    if (n.type === 'Identifier' && reactiveVars.has((n as unknown as { name: string }).name)) {
      found = true;
    }
  });

  return found;
}

/** The no-untrack-misuse lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5/no-untrack-misuse',
  description: 'untrack() used on non-reactive value - untrack is only needed for $state/$derived',
  patterns: ['**/*.svelte'],
  categories: ['svelte5'],
  stages: ['lint', 'ci'],

  visitor: {
    Program(_node: AstNode, context: VisitorContext): LintResult[] {
      const stateVars: Set<string> = collectStateVariables(context.ast);
      const derivedVars: Set<string> = collectDerivedVariables(context.ast);
      const reactiveVars: Set<string> = new Set([...stateVars, ...derivedVars]);

      const results: LintResult[] = [];

      walkNode(context.ast, (node: AstNode): void => {
        if (node.type !== 'CallExpression') {
          return;
        }

        const callee: AstNode | undefined = node.callee as AstNode | undefined;
        if (
          !callee ||
          callee.type !== 'Identifier' ||
          (callee as { name?: string }).name !== 'untrack'
        ) {
          return;
        }

        const args: AstNode[] | undefined = node.arguments as AstNode[] | undefined;
        if (!args || args.length === 0) {
          return;
        }

        const [callback]: AstNode | undefined = args;
        if (!callback) {
          return;
        }

        // The callback should be an arrow or function expression
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
          return;
        }

        const body: AstNode | undefined = callback.body as AstNode | undefined;
        if (!body) {
          return;
        }

        // For arrow expressions with expression body, check the expression directly
        // For block bodies, check the return statement's argument
        let returnExpr: AstNode | undefined;

        if (body.type === 'BlockStatement') {
          // Find the return statement
          const bodyStmts: AstNode[] | undefined = body.body as AstNode[] | undefined;
          if (bodyStmts) {
            for (const stmt of bodyStmts) {
              if (stmt.type === 'ReturnStatement') {
                returnExpr = stmt.argument as AstNode | undefined;
                break;
              }
            }
          }
        } else {
          // Expression body in arrow function
          returnExpr = body;
        }

        if (!returnExpr) {
          return;
        }

        // If the return expression references any reactive variables, it's valid usage
        if (referencesReactiveVar(returnExpr, reactiveVars)) {
          return;
        }

        const exprText: string = getExpressionText(returnExpr);

        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'warning',
          message: `untrack() used on non-reactive value '${exprText}' - untrack is only needed for $state/$derived`,
          ruleId: rule.id,
          tip: 'Remove untrack() wrapper - the value is not reactive',
          fix: { range: { start: 0, end: 0 }, text: '' },
        });
      });

      return results;
    },
  },
};

export default rule;
