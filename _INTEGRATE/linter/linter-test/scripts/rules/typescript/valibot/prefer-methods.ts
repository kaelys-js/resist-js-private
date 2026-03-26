/**
 * Rule: valibot/prefer-methods
 *
 * Suggests using built-in Valibot methods instead of custom transforms.
 *
 * ❌ Bad:
 *   v.transform(val => val.trim())
 *   v.transform(val => val.toLowerCase())
 *   v.transform(val => parseInt(val, 10))
 *
 * ✅ Good:
 *   v.trim()
 *   v.toLowerCase()
 *   v.pipe(v.string(), v.transform(s => parseInt(s, 10)))  // No built-in for this
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Patterns in transforms that have built-in equivalents
const BUILTIN_EQUIVALENTS: Array<{
	pattern: RegExp;
	builtin: string;
	description: string;
}> = [
	{ pattern: /\.trim\(\)/, builtin: 'v.trim()', description: 'trimming strings' },
	{ pattern: /\.toLowerCase\(\)/, builtin: 'v.toLowerCase()', description: 'lowercase conversion' },
	{ pattern: /\.toUpperCase\(\)/, builtin: 'v.toUpperCase()', description: 'uppercase conversion' },
	{ pattern: /\.trimStart\(\)/, builtin: 'v.trimStart()', description: 'trimming start' },
	{ pattern: /\.trimEnd\(\)/, builtin: 'v.trimEnd()', description: 'trimming end' },
	{ pattern: /Math\.floor\(/, builtin: 'v.integer()', description: 'integer validation' },
	{ pattern: /Math\.round\(/, builtin: 'v.integer()', description: 'integer validation' },
	{ pattern: /Number\.isFinite/, builtin: 'v.finite()', description: 'finite number check' },
	{ pattern: /Number\.isSafeInteger/, builtin: 'v.safeInteger()', description: 'safe integer check' },
	{ pattern: /Number\.isNaN/, builtin: 'NaN validation in schema', description: 'NaN check' },
];

const rule: TypeScriptRule = {
	id: 'valibot/prefer-methods',
	description: 'Use built-in Valibot methods instead of custom transforms where available',
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

			if (!isNamespaceMethodCall(node, namespaceAlias, 'transform')) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length === 0) return results;

			const transformFn = args[0];
			const fnText = context.content.slice(transformFn.start, transformFn.end);

			for (const { pattern, builtin, description } of BUILTIN_EQUIVALENTS) {
				if (pattern.test(fnText)) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'info',
						message: `Custom transform for ${description} - consider using ${builtin}`,
						ruleId: 'valibot/prefer-methods',
						tip: `Valibot has built-in ${builtin.replace('v.', `${namespaceAlias}.`)} for this`,
					});
					break; // Only report first match
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
