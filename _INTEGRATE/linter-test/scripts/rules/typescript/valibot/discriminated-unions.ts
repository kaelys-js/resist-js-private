/**
 * Rule: valibot/discriminated-unions
 *
 * Enforces use of v.variant() for discriminated unions (better performance).
 *
 * v.variant() is optimized for unions with a discriminator property,
 * while v.union() tries each schema sequentially.
 *
 * ❌ Bad:
 *   const EventSchema = v.union([
 *     v.object({ type: v.literal('click'), x: v.number() }),
 *     v.object({ type: v.literal('scroll'), offset: v.number() }),
 *   ]);
 *
 * ✅ Good:
 *   const EventSchema = v.variant('type', [
 *     v.object({ type: v.literal('click'), x: v.number() }),
 *     v.object({ type: v.literal('scroll'), offset: v.number() }),
 *   ]);
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/discriminated-unions',
	description: 'Use v.variant() for discriminated unions (better performance)',
	categories: ['typescript', 'valibot', 'performance'],
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

			if (!isNamespaceMethodCall(node, namespaceAlias, 'union')) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length === 0) return results;

			// First argument should be an array of schemas
			const schemas = args[0];
			if (schemas.type !== 'ArrayExpression') return results;

			const elements = schemas.elements as AstNode[] | undefined;
			if (!elements || elements.length < 2) return results;

			// Check if all schemas are objects with a common literal discriminator
			const discriminators = new Map<string, Set<string>>();

			for (const element of elements) {
				if (!element) continue;

				// Check if it's an object schema
				const methodName = getNamespaceMethodName(element, namespaceAlias);
				if (methodName !== 'object' && methodName !== 'strictObject') {
					// Not all are objects, union might be appropriate
					return results;
				}

				// Get the object's properties
				const objArgs = element.arguments as AstNode[] | undefined;
				if (!objArgs || objArgs.length === 0) continue;

				const propsObj = objArgs[0];
				if (propsObj.type !== 'ObjectExpression') continue;

				const properties = propsObj.properties as AstNode[] | undefined;
				if (!properties) continue;

				// Look for literal properties
				for (const prop of properties) {
					if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') continue;

					const key = prop.key as AstNode | undefined;
					const value = prop.value as AstNode | undefined;

					if (!key || !value) continue;

					const keyName = (key.name as string) || (key.value as string);
					if (!keyName) continue;

					// Check if value is v.literal()
					const valueMethod = getNamespaceMethodName(value, namespaceAlias);
					if (valueMethod === 'literal') {
						if (!discriminators.has(keyName)) {
							discriminators.set(keyName, new Set());
						}
						// Get the literal value
						const literalArgs = value.arguments as AstNode[] | undefined;
						if (literalArgs && literalArgs.length > 0) {
							const literalValue = literalArgs[0];
							const literalText = context.getNodeText(literalValue);
							discriminators.get(keyName)!.add(literalText);
						}
					}
				}
			}

			// Check if any key has unique literals for all schemas (discriminator)
			for (const [key, values] of discriminators) {
				if (values.size === elements.length) {
					// This key has unique values for each schema - it's a discriminator
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `Union has discriminator property '${key}' - use v.variant() for better performance`,
						ruleId: 'valibot/discriminated-unions',
						tip: `v.variant('${key}', [...]) validates faster by checking the discriminator first`,
						example: `${namespaceAlias}.variant('${key}', [ /* same schemas */ ])`,
					});
					break; // Only report once
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
