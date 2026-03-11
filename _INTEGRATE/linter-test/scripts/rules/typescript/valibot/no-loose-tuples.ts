/**
 * Rule: valibot/no-loose-tuples
 *
 * Enforces use of v.strictTuple() over v.tuple() for strict validation.
 *
 * ❌ Bad:
 *   const PointSchema = v.tuple([v.number(), v.number()]);
 *   const DataSchema = v.looseTuple([v.string(), v.number()]);
 *
 * ✅ Good:
 *   const PointSchema = v.strictTuple([v.number(), v.number()]);
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-loose-tuples',
	description: 'Use v.strictTuple() instead of v.tuple() for strict validation',
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

			if (isNamespaceMethodCall(node, namespaceAlias, 'tuple')) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: "Use 'strictTuple' instead of 'tuple' to catch extra elements",
					ruleId: 'valibot/no-loose-tuples',
					tip: 'strictTuple rejects tuples with extra elements, improving type safety',
					example: `${namespaceAlias}.strictTuple([...])`,
				});
			}

			if (isNamespaceMethodCall(node, namespaceAlias, 'looseTuple')) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: "'looseTuple' allows extra elements - consider using 'strictTuple'",
					ruleId: 'valibot/no-loose-tuples',
					tip: 'looseTuple ignores extra elements which may hide bugs',
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
