/**
 * Rule: valibot/no-io-ts
 *
 * Disallows io-ts imports when using Valibot.
 *
 * ❌ Bad:
 *   import * as t from 'io-ts';
 *   import { type, string } from 'io-ts';
 *
 * ✅ Good:
 *   import * as v from 'valibot';
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const rule: TypeScriptRule = {
	id: 'valibot/no-io-ts',
	description: 'Disallow io-ts imports - use Valibot instead',
	categories: ['typescript', 'valibot', 'migration'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const source = (node.source as { value?: string })?.value;
			if (source !== 'io-ts') return results;

			results.push({
				file: context.file,
				line: node.loc.start.line,
				column: node.loc.start.column + 1,
				severity: 'error',
				message: "io-ts is not allowed - use Valibot instead",
				ruleId: 'valibot/no-io-ts',
				tip: 'Migrate to Valibot for simpler API and better developer experience',
				example: "import * as v from 'valibot';",
			});

			return results;
		},
	},

	async check() {
		return [];
	},
};

export default rule;
