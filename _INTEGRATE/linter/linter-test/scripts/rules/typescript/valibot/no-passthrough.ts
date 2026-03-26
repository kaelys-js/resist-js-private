/**
 * Rule: valibot/no-passthrough
 *
 * Disallows v.passthrough() which defeats strict validation.
 *
 * ❌ Bad:
 *   const Schema = v.pipe(v.object({ ... }), v.passthrough());
 *
 * ✅ Good:
 *   const Schema = v.strictObject({ ... });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-passthrough',
	description: 'Disallow v.passthrough() which defeats strict validation',
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

			if (isNamespaceMethodCall(node, namespaceAlias, 'passthrough')) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: "'passthrough' defeats strict validation by allowing extra properties",
					ruleId: 'valibot/no-passthrough',
					tip: 'Remove passthrough and use strictObject for type-safe validation',
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
