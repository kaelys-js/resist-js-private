/**
 * Rule: valibot/no-class-validator
 *
 * Disallows class-validator decorators when using Valibot.
 *
 * ❌ Bad:
 *   import { IsString, IsEmail } from 'class-validator';
 *   class User {
 *     @IsString()
 *     name: string;
 *   }
 *
 * ✅ Good:
 *   import * as v from 'valibot';
 *   const UserSchema = v.strictObject({ name: v.string() });
 *   type User = v.InferOutput<typeof UserSchema>;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const CLASS_VALIDATOR_MODULES = ['class-validator', 'class-transformer'];

const rule: TypeScriptRule = {
	id: 'valibot/no-class-validator',
	description: 'Disallow class-validator - use Valibot schemas instead',
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
			if (!source || !CLASS_VALIDATOR_MODULES.includes(source)) return results;

			results.push({
				file: context.file,
				line: node.loc.start.line,
				column: node.loc.start.column + 1,
				severity: 'error',
				message: `'${source}' is not allowed - use Valibot schemas instead of decorators`,
				ruleId: 'valibot/no-class-validator',
				tip: 'Replace decorator-based validation with Valibot schemas for better type inference',
				example: "import * as v from 'valibot';\nconst Schema = v.strictObject({ ... });",
			});

			return results;
		},
	},

	async check() {
		return [];
	},
};

export default rule;
