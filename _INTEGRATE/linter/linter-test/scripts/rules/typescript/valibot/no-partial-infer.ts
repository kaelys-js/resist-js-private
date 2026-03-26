/**
 * Rule: valibot/no-partial-infer
 *
 * Don't use Partial<v.InferOutput<...>> - define a partial schema instead.
 *
 * Using TypeScript utilities on Valibot types breaks the schema-type sync.
 *
 * ❌ Bad:
 *   type PartialUser = Partial<v.InferOutput<typeof UserSchema>>;
 *   type RequiredUser = Required<v.InferOutput<typeof UserSchema>>;
 *
 * ✅ Good:
 *   const PartialUserSchema = v.partial(UserSchema);
 *   type PartialUser = v.InferOutput<typeof PartialUserSchema>;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const TS_UTILITY_TYPES = ['Partial', 'Required', 'Readonly'];

const rule: TypeScriptRule = {
	id: 'valibot/no-partial-infer',
	description: "Don't use Partial<v.InferOutput<...>> - use v.partial() schema instead",
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

			// Check for Partial<v.InferOutput<...>>, Required<...>, Readonly<...>
			for (const utilityType of TS_UTILITY_TYPES) {
				const pattern = new RegExp(
					`${utilityType}\\s*<\\s*${namespaceAlias}\\.(InferOutput|InferInput|Output|Input)`,
					'i'
				);

				if (pattern.test(typeText)) {
					const valibotMethod = utilityType.toLowerCase();

					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `Don't use ${utilityType}<v.InferOutput<...>> - use v.${valibotMethod}() schema`,
						ruleId: 'valibot/no-partial-infer',
						tip: 'Create a schema with v.partial(), v.required(), or v.readonly() and infer from that',
						example: `const ${typeName}Schema = ${namespaceAlias}.${valibotMethod}(OriginalSchema);\ntype ${typeName} = ${namespaceAlias}.InferOutput<typeof ${typeName}Schema>;`,
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
