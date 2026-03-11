/**
 * Rule: valibot/no-omit-pick-infer
 *
 * Don't use Omit/Pick on inferred types - use schema composition instead.
 *
 * ❌ Bad:
 *   type UserWithoutPassword = Omit<v.InferOutput<typeof UserSchema>, 'password'>;
 *   type UserName = Pick<v.InferOutput<typeof UserSchema>, 'name'>;
 *
 * ✅ Good:
 *   const UserWithoutPasswordSchema = v.omit(UserSchema, ['password']);
 *   type UserWithoutPassword = v.InferOutput<typeof UserWithoutPasswordSchema>;
 *
 *   const UserNameSchema = v.pick(UserSchema, ['name']);
 *   type UserName = v.InferOutput<typeof UserNameSchema>;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-omit-pick-infer',
	description: "Don't use Omit/Pick on inferred types - use v.omit()/v.pick() schemas",
	categories: ['typescript', 'valibot', 'types'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		TSTypeAliasDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const id = node.id as AstNode | undefined;
			const typeName = id?.name as string | undefined;
			if (!typeName) return results;

			const typeAnnotation = node.typeAnnotation as AstNode | undefined;
			if (!typeAnnotation) return results;

			const typeText = context.content.slice(typeAnnotation.start, typeAnnotation.end);

			// Check for Omit<v.InferOutput<...>, ...>
			const omitPattern = new RegExp(
				`Omit\\s*<\\s*${namespaceAlias}\\.(InferOutput|InferInput|Output|Input)`,
				'i'
			);

			if (omitPattern.test(typeText)) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: "Don't use Omit<v.InferOutput<...>, ...> - use v.omit() schema",
					ruleId: 'valibot/no-omit-pick-infer',
					tip: 'Create a schema with v.omit() and infer from that for runtime validation',
					example: `const ${typeName}Schema = ${namespaceAlias}.omit(OriginalSchema, ['fieldToOmit']);\ntype ${typeName} = ${namespaceAlias}.InferOutput<typeof ${typeName}Schema>;`,
				});
			}

			// Check for Pick<v.InferOutput<...>, ...>
			const pickPattern = new RegExp(
				`Pick\\s*<\\s*${namespaceAlias}\\.(InferOutput|InferInput|Output|Input)`,
				'i'
			);

			if (pickPattern.test(typeText)) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: "Don't use Pick<v.InferOutput<...>, ...> - use v.pick() schema",
					ruleId: 'valibot/no-omit-pick-infer',
					tip: 'Create a schema with v.pick() and infer from that for runtime validation',
					example: `const ${typeName}Schema = ${namespaceAlias}.pick(OriginalSchema, ['fieldToPick']);\ntype ${typeName} = ${namespaceAlias}.InferOutput<typeof ${typeName}Schema>;`,
				});
			}

			// Check for Exclude/Extract on inferred types
			const excludePattern = new RegExp(
				`(Exclude|Extract)\\s*<\\s*${namespaceAlias}\\.(InferOutput|InferInput)`,
				'i'
			);

			if (excludePattern.test(typeText)) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: 'Using Exclude/Extract on inferred types - consider schema composition',
					ruleId: 'valibot/no-omit-pick-infer',
					tip: 'Define separate schemas for each variant for runtime validation support',
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
