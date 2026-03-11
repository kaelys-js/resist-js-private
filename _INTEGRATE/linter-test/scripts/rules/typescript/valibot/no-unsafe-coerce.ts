/**
 * Rule: valibot/no-unsafe-coerce
 *
 * Warns about v.coerce() usage which can hide invalid input.
 *
 * v.coerce() attempts to convert input to the target type, which can
 * mask data quality issues and produce unexpected results.
 *
 * ⚠️ Warning:
 *   const AgeSchema = v.coerce(v.number(), Number);
 *   // "abc" becomes NaN instead of error
 *   // "123abc" becomes 123 - partial coercion!
 *
 * ✅ Better:
 *   const AgeSchema = v.pipe(v.string(), v.transform(s => {
 *     const n = parseInt(s, 10);
 *     if (isNaN(n)) throw new Error('Invalid number');
 *     return n;
 *   }));
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-unsafe-coerce',
	description: 'v.coerce() can hide invalid input - consider explicit transform',
	categories: ['typescript', 'valibot', 'strict', 'security'],
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

			if (!isNamespaceMethodCall(node, namespaceAlias, 'coerce')) return results;

			results.push({
				file: context.file,
				line: node.loc.start.line,
				column: node.loc.start.column + 1,
				severity: 'warning',
				message: 'v.coerce() can produce unexpected results - consider explicit transform',
				ruleId: 'valibot/no-unsafe-coerce',
				tip: 'Use v.pipe() with v.transform() for explicit, controlled type conversion',
				example: `${namespaceAlias}.pipe(${namespaceAlias}.string(), ${namespaceAlias}.transform(val => { /* explicit conversion with validation */ }))`,
			});

			return results;
		},
	},

	async check() {
		return [];
	},
};

export default rule;
