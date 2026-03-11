/**
 * Rule: valibot/limit-union-size
 *
 * Warns when unions have many variants - suggest using v.variant() instead.
 *
 * Large unions are slower because v.union() tries each schema sequentially.
 * v.variant() (discriminated unions) are O(1) lookup.
 *
 * ⚠️ Warning (>5 variants):
 *   const Schema = v.union([...6+ schemas]);
 *
 * ❌ Error (>10 variants):
 *   const Schema = v.union([...11+ schemas]);
 *
 * ✅ Good:
 *   const Schema = v.variant('type', [...]);
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const WARNING_THRESHOLD = 5;
const ERROR_THRESHOLD = 10;

const rule: TypeScriptRule = {
	id: 'valibot/limit-union-size',
	description: 'Large unions (>10 variants) should use v.variant() for performance',
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

			// First argument should be an array
			const schemas = args[0];
			if (schemas.type !== 'ArrayExpression') return results;

			const elements = schemas.elements as AstNode[] | undefined;
			if (!elements) return results;

			const variantCount = elements.length;

			if (variantCount > ERROR_THRESHOLD) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: `Union has ${variantCount} variants - use v.variant() for better performance`,
					ruleId: 'valibot/limit-union-size',
					tip: `v.union() with ${variantCount} variants is O(n) - v.variant() is O(1)`,
					example: `${namespaceAlias}.variant('discriminatorKey', [...])`,
				});
			} else if (variantCount > WARNING_THRESHOLD) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: `Union has ${variantCount} variants - consider v.variant() for better performance`,
					ruleId: 'valibot/limit-union-size',
					tip: 'If variants have a common discriminator property, use v.variant()',
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
