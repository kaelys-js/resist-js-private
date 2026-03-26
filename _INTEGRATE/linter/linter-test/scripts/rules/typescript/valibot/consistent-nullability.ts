/**
 * Rule: valibot/consistent-nullability
 *
 * Enforces consistent use of optional/nullable/nullish within a schema.
 *
 * Mixing these inconsistently can cause confusion:
 *   - optional: allows undefined
 *   - nullable: allows null
 *   - nullish: allows both null and undefined
 *
 * ⚠️ Warning:
 *   const Schema = v.strictObject({
 *     a: v.optional(v.string()),   // undefined OK
 *     b: v.nullable(v.string()),   // null OK
 *     c: v.nullish(v.string()),    // both OK - inconsistent!
 *   });
 *
 * ✅ Good (pick one pattern):
 *   const Schema = v.strictObject({
 *     a: v.optional(v.string()),
 *     b: v.optional(v.string()),
 *   });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const OBJECT_METHODS = ['object', 'strictObject', 'looseObject'];
const NULLABILITY_METHODS = ['optional', 'nullable', 'nullish'];

const rule: TypeScriptRule = {
	id: 'valibot/consistent-nullability',
	description: 'Use consistent nullability pattern within an object schema',
	categories: ['typescript', 'valibot', 'style'],
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
			if (!properties) return results;

			// Collect nullability methods used
			const usedMethods = new Map<string, string[]>(); // method -> field names

			for (const prop of properties) {
				if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') continue;

				const key = prop.key as AstNode | undefined;
				const value = prop.value as AstNode | undefined;
				if (!key || !value) continue;

				const fieldName = (key.name as string) || (key.value as string) || 'field';
				const valueMethod = getNamespaceMethodName(value, namespaceAlias);

				if (valueMethod && NULLABILITY_METHODS.includes(valueMethod)) {
					if (!usedMethods.has(valueMethod)) {
						usedMethods.set(valueMethod, []);
					}
					usedMethods.get(valueMethod)!.push(fieldName);
				}
			}

			// Check for inconsistency
			if (usedMethods.size > 1) {
				const methodsUsed = Array.from(usedMethods.keys());
				const details = methodsUsed
					.map((m) => `${m}: ${usedMethods.get(m)!.join(', ')}`)
					.join('; ');

				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: `Mixed nullability patterns in object: ${methodsUsed.join(', ')}`,
					ruleId: 'valibot/consistent-nullability',
					tip: `Consider using one pattern consistently. Fields: ${details}`,
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
