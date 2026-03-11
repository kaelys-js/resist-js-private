/**
 * Rule: valibot/no-expensive-regex
 *
 * Warns about potentially expensive regex patterns in v.regex().
 *
 * Patterns that can cause ReDoS (Regular Expression Denial of Service):
 *   - Nested quantifiers: (a+)+
 *   - Overlapping alternatives: (a|a)+
 *   - Catastrophic backtracking patterns
 *
 * ⚠️ Warning:
 *   v.regex(/^(a+)+$/)  // Nested quantifiers
 *   v.regex(/(.*a){10}/) // Repeated .* with suffix
 *
 * ✅ Good:
 *   v.regex(/^[a-z]+$/)  // Simple patterns
 *   v.regex(/^\d{4}-\d{2}-\d{2}$/)  // Fixed quantifiers
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Patterns that indicate potentially expensive regex
const DANGEROUS_PATTERNS = [
	// Nested quantifiers
	{ pattern: /\([^)]*[+*][^)]*\)[+*]/, name: 'nested quantifiers' },
	{ pattern: /\[[^\]]*\][+*]\)[+*]/, name: 'nested quantifiers with character class' },

	// Repeated .* or .+
	{ pattern: /\(\.\*\)[+*{]/, name: 'repeated .*' },
	{ pattern: /\(\.\+\)[+*{]/, name: 'repeated .+' },

	// Overlapping alternatives (simplified check)
	{ pattern: /\([^|)]+\|[^|)]+\)[+*]/, name: 'potentially overlapping alternatives' },

	// Catastrophic patterns with . and quantifiers
	{ pattern: /\.\*\.\*/, name: 'multiple .* in sequence' },
	{ pattern: /\.\+\.\+/, name: 'multiple .+ in sequence' },

	// Lookbehind with variable length (can be slow)
	{ pattern: /\(\?\<[=!].*[+*]/, name: 'variable length lookbehind' },
];

const rule: TypeScriptRule = {
	id: 'valibot/no-expensive-regex',
	description: 'Warn about potentially expensive regex patterns in v.regex()',
	categories: ['typescript', 'valibot', 'performance', 'security'],
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

			if (!isNamespaceMethodCall(node, namespaceAlias, 'regex')) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length === 0) return results;

			const regexArg = args[0];

			// Get the regex pattern as string
			let regexPattern: string;

			if (regexArg.type === 'Literal' && regexArg.regex) {
				// Regex literal: /pattern/flags
				regexPattern = (regexArg.regex as { pattern: string }).pattern || '';
			} else if (regexArg.type === 'RegExpLiteral') {
				regexPattern = (regexArg.pattern as string) || '';
			} else {
				// Can't analyze dynamic regex
				return results;
			}

			// Check against dangerous patterns
			for (const { pattern, name } of DANGEROUS_PATTERNS) {
				if (pattern.test(regexPattern)) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `Regex may be expensive - contains ${name}`,
						ruleId: 'valibot/no-expensive-regex',
						tip: 'Avoid patterns that cause catastrophic backtracking (ReDoS vulnerability)',
					});
					break; // Only report first issue per regex
				}
			}

			// Check for very long regex (may indicate complexity)
			if (regexPattern.length > 200) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'info',
					message: `Regex is very long (${regexPattern.length} chars) - consider simplifying or documenting`,
					ruleId: 'valibot/no-expensive-regex',
					tip: 'Long regex patterns are harder to maintain and may have performance issues',
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
