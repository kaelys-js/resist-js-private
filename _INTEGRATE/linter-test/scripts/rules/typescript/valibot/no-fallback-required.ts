/**
 * Rule: valibot/no-fallback-required
 *
 * v.fallback() on required schemas can hide validation errors.
 *
 * ❌ Bad:
 *   const NameSchema = v.fallback(v.string(), 'unknown');
 *   // If name is missing, silently uses 'unknown' instead of error
 *
 * ✅ Good:
 *   const NameSchema = v.fallback(v.optional(v.string()), 'unknown');
 *   // Only uses fallback when value is undefined (intentionally missing)
 *
 *   const NameSchema = v.pipe(v.string(), v.minLength(1));
 *   // Properly validates - no silent fallback
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const NULLABLE_METHODS = ['optional', 'nullable', 'nullish'];

const rule: TypeScriptRule = {
	id: 'valibot/no-fallback-required',
	description: 'v.fallback() on required schemas can hide validation errors',
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

			if (!isNamespaceMethodCall(node, namespaceAlias, 'fallback')) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length < 2) return results;

			const schema = args[0];
			const schemaMethod = getNamespaceMethodName(schema, namespaceAlias);

			// Check if the schema is already optional/nullable/nullish
			const isNullable = schemaMethod && NULLABLE_METHODS.includes(schemaMethod);

			if (!isNullable) {
				// Check if it's a pipe that starts with optional
				if (schemaMethod === 'pipe') {
					const pipeArgs = schema.arguments as AstNode[] | undefined;
					if (pipeArgs && pipeArgs.length > 0) {
						const firstArg = pipeArgs[0];
						const firstMethod = getNamespaceMethodName(firstArg, namespaceAlias);
						if (firstMethod && NULLABLE_METHODS.includes(firstMethod)) {
							return results; // OK - pipe starts with optional
						}
					}
				}

				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: 'v.fallback() on required schema may silently hide validation errors',
					ruleId: 'valibot/no-fallback-required',
					tip: 'Wrap the schema in v.optional() first, or remove fallback to get proper errors',
					example: `${namespaceAlias}.fallback(${namespaceAlias}.optional(${schemaMethod || 'schema'}()), defaultValue)`,
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
