/**
 * Rule: valibot/consistent-infer
 *
 * Enforces consistent use of v.InferOutput over v.InferInput unless intentional.
 *
 * v.InferOutput is for the parsed/validated output type.
 * v.InferInput is for the raw input type before validation/transformation.
 *
 * Most of the time, you want InferOutput. InferInput is only needed when
 * dealing with form inputs or raw API data before validation.
 *
 * ✅ Good (common case):
 *   type User = v.InferOutput<typeof UserSchema>;
 *
 * ⚠️ Needs review:
 *   type UserInput = v.InferInput<typeof UserSchema>;  // Make sure this is intentional
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/consistent-infer',
	description: 'Use v.InferOutput consistently; InferInput only when intentional',
	categories: ['typescript', 'valibot', 'style'],
	stages: ['lint', 'check'],
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
			const name = id?.name as string | undefined;
			if (!name) return results;

			const typeAnnotation = node.typeAnnotation as AstNode | undefined;
			if (!typeAnnotation) return results;

			const typeText = context.content.slice(typeAnnotation.start, typeAnnotation.end);

			// Check for InferInput usage
			if (
				typeText.includes(`${namespaceAlias}.InferInput`) ||
				typeText.includes(`${namespaceAlias}.Input`)
			) {
				// Check if the name suggests it's intentional
				const isIntentional =
					name.toLowerCase().includes('input') ||
					name.toLowerCase().includes('raw') ||
					name.toLowerCase().includes('form') ||
					name.toLowerCase().includes('request');

				if (!isIntentional) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `Type '${name}' uses InferInput - did you mean InferOutput?`,
						ruleId: 'valibot/consistent-infer',
						tip: 'InferInput is for raw input types before transformation. Use InferOutput for validated types.',
						example: `type ${name} = ${namespaceAlias}.InferOutput<...>; // For validated output\ntype ${name}Input = ${namespaceAlias}.InferInput<...>; // For raw input`,
					});
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
