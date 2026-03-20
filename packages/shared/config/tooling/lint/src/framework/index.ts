/**
 * Custom Linter Framework — public API.
 *
 * Re-exports the rule runner and type definitions.
 *
 * @module
 */

export { runTypeScriptRules, walkNode } from './oxc-runner.ts';
export type {
  TypeScriptRule,
  LintResult,
  LintFix,
  AstNode,
  VisitorContext,
  VisitorFn,
  AstVisitor,
  ImportInfo,
  ImportSpecifier,
} from './types.ts';
