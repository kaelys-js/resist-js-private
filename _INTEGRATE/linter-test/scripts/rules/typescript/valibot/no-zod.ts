/**
 * Rule: valibot/no-zod
 *
 * Disallows Zod imports when migrating to Valibot.
 *
 * ❌ Bad:
 *   import { z } from 'zod';
 *   import * as z from 'zod';
 *
 * ✅ Good:
 *   import * as v from 'valibot';
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const rule: TypeScriptRule = {
	id: 'valibot/no-zod',
	description: 'Disallow Zod imports - use Valibot instead',
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
			if (source !== 'zod') return results;

			results.push({
				file: context.file,
				line: node.loc.start.line,
				column: node.loc.start.column + 1,
				severity: 'error',
				message: "Zod is not allowed - use Valibot instead",
				ruleId: 'valibot/no-zod',
				tip: 'Migrate to Valibot for smaller bundle size and better tree-shaking',
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
