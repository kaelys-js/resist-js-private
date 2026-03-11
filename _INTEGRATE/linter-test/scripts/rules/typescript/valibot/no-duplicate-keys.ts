/**
 * Rule: valibot/no-duplicate-keys
 *
 * Detects duplicate keys in object schemas which override previous definitions.
 *
 * ❌ Bad:
 *   const Schema = v.strictObject({
 *     name: v.string(),
 *     email: v.string(),
 *     name: v.number(),  // Duplicate! Silently overrides first
 *   });
 *
 * ✅ Good:
 *   const Schema = v.strictObject({
 *     name: v.string(),
 *     email: v.string(),
 *     age: v.number(),
 *   });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const OBJECT_METHODS = ['object', 'strictObject', 'looseObject', 'objectWithRest'];

const rule: TypeScriptRule = {
	id: 'valibot/no-duplicate-keys',
	description: 'Detect duplicate keys in object schemas',
	categories: ['typescript', 'valibot', 'errors'],
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

			if (!isNamespaceMethodCallAny(node, namespaceAlias, OBJECT_METHODS)) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length === 0) return results;

			const propsArg = args[0];
			if (propsArg.type !== 'ObjectExpression') return results;

			const properties = propsArg.properties as AstNode[] | undefined;
			if (!properties) return results;

			const seenKeys = new Map<string, AstNode>();

			for (const prop of properties) {
				if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') continue;

				const key = prop.key as AstNode | undefined;
				if (!key) continue;

				const keyName = (key.name as string) || (key.value as string);
				if (!keyName) continue;

				if (seenKeys.has(keyName)) {
					results.push({
						file: context.file,
						line: prop.loc.start.line,
						column: prop.loc.start.column + 1,
						severity: 'error',
						message: `Duplicate key '${keyName}' in object schema - this overrides the previous definition`,
						ruleId: 'valibot/no-duplicate-keys',
						tip: 'Remove the duplicate key or rename one of them',
					});
				} else {
					seenKeys.set(keyName, prop);
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
