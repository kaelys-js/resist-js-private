/**
 * Rule: valibot/no-yup
 *
 * Disallows Yup imports when using Valibot.
 *
 * ❌ Bad:
 *   import * as yup from 'yup';
 *   import { object, string } from 'yup';
 *
 * ✅ Good:
 *   import * as v from 'valibot';
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const rule: TypeScriptRule = {
	id: 'valibot/no-yup',
	description: 'Disallow Yup imports - use Valibot instead',
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
			if (source !== 'yup') return results;

			results.push({
				file: context.file,
				line: node.loc.start.line,
				column: node.loc.start.column + 1,
				severity: 'error',
				message: "Yup is not allowed - use Valibot instead",
				ruleId: 'valibot/no-yup',
				tip: 'Migrate to Valibot for better TypeScript support and type inference',
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
