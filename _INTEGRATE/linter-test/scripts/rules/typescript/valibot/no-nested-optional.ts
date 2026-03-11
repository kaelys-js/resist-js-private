/**
 * Rule: valibot/no-nested-optional
 *
 * Disallows nested optional/nullable/nullish wrappers which are redundant.
 *
 * ❌ Bad:
 *   v.optional(v.optional(v.string()))
 *   v.nullable(v.nullable(v.number()))
 *   v.nullish(v.optional(v.string()))
 *
 * ✅ Good:
 *   v.optional(v.string())
 *   v.nullable(v.number())
 *   v.nullish(v.string())  // Combines optional + nullable
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const NULLABILITY_METHODS = ['optional', 'nullable', 'nullish'];

const rule: TypeScriptRule = {
	id: 'valibot/no-nested-optional',
	description: 'Disallow nested optional/nullable/nullish wrappers',
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

			const outerMethod = getNamespaceMethodName(node, namespaceAlias);
			if (!outerMethod || !NULLABILITY_METHODS.includes(outerMethod)) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length === 0) return results;

			const innerSchema = args[0];
			const innerMethod = getNamespaceMethodName(innerSchema, namespaceAlias);

			if (innerMethod && NULLABILITY_METHODS.includes(innerMethod)) {
				let suggestion = '';
				if (outerMethod === innerMethod) {
					suggestion = `Remove the redundant nested ${outerMethod}()`;
				} else if (
					(outerMethod === 'optional' && innerMethod === 'nullable') ||
					(outerMethod === 'nullable' && innerMethod === 'optional')
				) {
					suggestion = 'Use v.nullish() instead (combines optional + nullable)';
				} else {
					suggestion = `Simplify to a single ${outerMethod}() or ${innerMethod}()`;
				}

				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: `Nested ${outerMethod}(${innerMethod}(...)) is redundant`,
					ruleId: 'valibot/no-nested-optional',
					tip: suggestion,
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
