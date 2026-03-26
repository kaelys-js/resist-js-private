/**
 * Rule: valibot/explicit-undefined
 *
 * Warns when optional fields could benefit from explicit undefined handling.
 *
 * v.optional() allows undefined but doesn't handle the case explicitly.
 * For clarity, consider using v.optional(schema, defaultValue) or handling
 * undefined in your code.
 *
 * ⚠️ Consider:
 *   const Schema = v.strictObject({
 *     nickname: v.optional(v.string()),  // Could be undefined - handle it!
 *   });
 *
 * ✅ Good:
 *   const Schema = v.strictObject({
 *     nickname: v.optional(v.string(), ''),  // Default to empty string
 *     // or
 *     nickname: v.nullish(v.string(), null),  // Explicit null fallback
 *   });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const OBJECT_METHODS = ['object', 'strictObject', 'looseObject'];

const rule: TypeScriptRule = {
	id: 'valibot/explicit-undefined',
	description: 'Consider providing default values for optional fields',
	categories: ['typescript', 'valibot', 'style'],
	stages: ['lint'],
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
			if (!properties) return results;

			const optionalFieldsWithoutDefault: string[] = [];

			for (const prop of properties) {
				if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') continue;

				const key = prop.key as AstNode | undefined;
				const value = prop.value as AstNode | undefined;

				if (!key || !value) continue;

				const keyName = (key.name as string) || (key.value as string);
				if (!keyName) continue;

				const valueMethod = getNamespaceMethodName(value, namespaceAlias);

				if (valueMethod === 'optional' || valueMethod === 'nullish') {
					// Check if it has a default value (second argument)
					const optionalArgs = value.arguments as AstNode[] | undefined;
					if (!optionalArgs || optionalArgs.length < 2) {
						optionalFieldsWithoutDefault.push(keyName);
					}
				}
			}

			// Only report if there are multiple optional fields without defaults
			// (single optional field is often intentional)
			if (optionalFieldsWithoutDefault.length >= 3) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'info',
					message: `${optionalFieldsWithoutDefault.length} optional fields without defaults: ${optionalFieldsWithoutDefault.slice(0, 3).join(', ')}...`,
					ruleId: 'valibot/explicit-undefined',
					tip: 'Consider providing default values: v.optional(schema, defaultValue)',
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
