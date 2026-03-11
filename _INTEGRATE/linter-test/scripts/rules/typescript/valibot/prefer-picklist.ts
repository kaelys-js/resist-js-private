/**
 * Rule: valibot/prefer-picklist
 *
 * Use v.picklist() instead of v.union() with multiple literals.
 *
 * v.picklist() is more concise and performs better for string enums.
 *
 * ❌ Bad:
 *   const StatusSchema = v.union([
 *     v.literal('pending'),
 *     v.literal('active'),
 *     v.literal('completed'),
 *   ]);
 *
 * ✅ Good:
 *   const StatusSchema = v.picklist(['pending', 'active', 'completed']);
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/prefer-picklist',
	description: 'Use v.picklist() instead of v.union() with multiple literals',
	categories: ['typescript', 'valibot', 'style', 'performance'],
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

			const schemas = args[0];
			if (schemas.type !== 'ArrayExpression') return results;

			const elements = schemas.elements as AstNode[] | undefined;
			if (!elements || elements.length < 2) return results;

			// Check if all elements are v.literal() with string values
			let allLiterals = true;
			const literalValues: string[] = [];

			for (const element of elements) {
				if (!element) {
					allLiterals = false;
					break;
				}

				const methodName = getNamespaceMethodName(element, namespaceAlias);
				if (methodName !== 'literal') {
					allLiterals = false;
					break;
				}

				// Get the literal value
				const literalArgs = element.arguments as AstNode[] | undefined;
				if (!literalArgs || literalArgs.length === 0) {
					allLiterals = false;
					break;
				}

				const literalArg = literalArgs[0];
				// Check if it's a string literal
				if (literalArg.type === 'StringLiteral' ||
					(literalArg.type === 'Literal' && typeof literalArg.value === 'string')) {
					literalValues.push(literalArg.value as string);
				} else {
					allLiterals = false;
					break;
				}
			}

			if (allLiterals && literalValues.length >= 2) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: 'Use v.picklist() instead of v.union() with string literals',
					ruleId: 'valibot/prefer-picklist',
					tip: 'v.picklist() is more concise and performs better for string enums',
					example: `${namespaceAlias}.picklist([${literalValues.map(v => `'${v}'`).join(', ')}])`,
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
