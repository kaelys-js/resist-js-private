/**
 * Rule: valibot/no-any-schema
 *
 * Disallows v.any() and v.unknown() schemas which defeat type safety.
 *
 * ❌ Bad:
 *   const DataSchema = v.any();
 *   const InputSchema = v.unknown();
 *
 * ✅ Good:
 *   const DataSchema = v.object({ ... });
 *   const InputSchema = v.union([...]);
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-any-schema',
	description: 'Disallow v.any() and v.unknown() schemas',
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

			if (isNamespaceMethodCall(node, namespaceAlias, 'any')) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: "'any' schema defeats type safety - define a specific schema",
					ruleId: 'valibot/no-any-schema',
					tip: 'Use a specific schema type (object, union, etc.) for proper validation',
				});
			}

			if (isNamespaceMethodCall(node, namespaceAlias, 'unknown')) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: "'unknown' schema provides no validation - consider a specific schema",
					ruleId: 'valibot/no-any-schema',
					tip: 'If the shape is truly unknown, use v.union() with expected types',
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
