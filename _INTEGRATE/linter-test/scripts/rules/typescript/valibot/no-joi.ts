/**
 * Rule: valibot/no-joi
 *
 * Disallows Joi imports when using Valibot.
 *
 * ❌ Bad:
 *   import Joi from 'joi';
 *   import * as Joi from 'joi';
 *
 * ✅ Good:
 *   import * as v from 'valibot';
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const rule: TypeScriptRule = {
	id: 'valibot/no-joi',
	description: 'Disallow Joi imports - use Valibot instead',
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
			if (source !== 'joi') return results;

			results.push({
				file: context.file,
				line: node.loc.start.line,
				column: node.loc.start.column + 1,
				severity: 'error',
				message: "Joi is not allowed - use Valibot instead",
				ruleId: 'valibot/no-joi',
				tip: 'Migrate to Valibot for TypeScript-first validation with better type inference',
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
