/**
 * Rule: valibot/strict-objects
 *
 * Enforces use of v.strictObject() instead of v.object() to catch extra properties.
 *
 * ❌ Bad:
 *   const UserSchema = v.object({ name: v.string() });
 *
 * ✅ Good:
 *   const UserSchema = v.strictObject({ name: v.string() });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/strict-objects',
	description: 'Use v.strictObject() instead of v.object() to catch extra properties',
	categories: ['typescript', 'valibot', 'strict'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			if (isNamespaceMethodCall(node, namespaceAlias, 'object')) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: "Use 'strictObject' instead of 'object' to catch extra properties",
					ruleId: 'valibot/strict-objects',
					tip: 'strictObject rejects objects with unexpected properties, improving type safety',
					example: `${namespaceAlias}.strictObject({ ... })`,
				});
			}

			// Also check for looseObject which is explicitly loose
			if (isNamespaceMethodCall(node, namespaceAlias, 'looseObject')) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: "'looseObject' allows extra properties - consider using 'strictObject'",
					ruleId: 'valibot/strict-objects',
					tip: 'looseObject ignores extra properties which may hide bugs',
				});
			}

			return results;
		},
	},

	async check() {
		return [];
	},
};

export default rule;
