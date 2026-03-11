/**
 * Rule: valibot/no-optional-heavy-object
 *
 * Warns when most fields in a strictObject are optional, defeating its purpose.
 *
 * ❌ Bad (>75% optional):
 *   const UserSchema = v.strictObject({
 *     id: v.optional(v.string()),
 *     name: v.optional(v.string()),
 *     email: v.optional(v.string()),
 *     age: v.number(),  // Only 1 required field
 *   });
 *
 * ✅ Good:
 *   const UserSchema = v.strictObject({
 *     id: v.string(),
 *     name: v.string(),
 *     email: v.optional(v.string()),  // Only email is optional
 *   });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const OBJECT_METHODS = ['object', 'strictObject'];
const OPTIONAL_METHODS = ['optional', 'nullable', 'nullish'];

const WARNING_THRESHOLD = 0.75; // Warn if >75% fields are optional

const rule: TypeScriptRule = {
	id: 'valibot/no-optional-heavy-object',
	description: 'Objects with mostly optional fields may indicate a design issue',
	categories: ['typescript', 'valibot', 'design'],
	stages: ['lint', 'check'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			if (!isNamespaceMethodCallAny(node, namespaceAlias, OBJECT_METHODS)) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length === 0) return results;

			const propsArg = args[0];
			if (propsArg.type !== 'ObjectExpression') return results;

			const properties = propsArg.properties as AstNode[] | undefined;
			if (!properties || properties.length < 3) return results; // Only check objects with 3+ fields

			let optionalCount = 0;
			let totalCount = 0;

			for (const prop of properties) {
				if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') continue;
				totalCount++;

				const value = prop.value as AstNode | undefined;
				if (!value) continue;

				const valueMethod = getNamespaceMethodName(value, namespaceAlias);
				if (valueMethod && OPTIONAL_METHODS.includes(valueMethod)) {
					optionalCount++;
				}
			}

			if (totalCount > 0) {
				const optionalRatio = optionalCount / totalCount;

				if (optionalRatio > WARNING_THRESHOLD) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `Object has ${optionalCount}/${totalCount} optional fields (${Math.round(optionalRatio * 100)}%) - consider if this is intentional`,
						ruleId: 'valibot/no-optional-heavy-object',
						tip: 'If most fields are optional, consider using v.partial() or splitting into required/optional schemas',
					});
				}
			}

			return results;
		},
	},

	async check() {
		return [];
	},
};

export default rule;
