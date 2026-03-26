/**
 * Rule: valibot/no-empty-object
 *
 * Disallows empty object schemas which are usually a mistake.
 *
 * ❌ Bad:
 *   const EmptySchema = v.strictObject({});
 *   const AlsoEmpty = v.object({});
 *
 * ✅ Good:
 *   const UserSchema = v.strictObject({ name: v.string() });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const OBJECT_METHODS = ['object', 'strictObject', 'looseObject', 'objectWithRest'];

const rule: TypeScriptRule = {
	id: 'valibot/no-empty-object',
	description: 'Disallow empty object schemas - they are usually a mistake',
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

			if (!isNamespaceMethodCallAny(node, namespaceAlias, OBJECT_METHODS)) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length === 0) return results;

			const propsArg = args[0];
			if (propsArg.type !== 'ObjectExpression') return results;

			const properties = propsArg.properties as AstNode[] | undefined;
			if (!properties || properties.length === 0) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: 'Empty object schema - this validates nothing and is usually a mistake',
					ruleId: 'valibot/no-empty-object',
					tip: 'Add properties to the schema or use a different schema type',
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
