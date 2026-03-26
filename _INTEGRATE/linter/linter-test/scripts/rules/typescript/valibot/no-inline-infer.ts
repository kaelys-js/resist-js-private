/**
 * Rule: valibot/no-inline-infer
 *
 * Disallows inline v.InferOutput<> usage. Require declaring a type alias first.
 *
 * ❌ Bad:
 *   const user: v.InferOutput<typeof UserSchema> = { ... };
 *   function getUser(): v.InferOutput<typeof UserSchema> { ... }
 *
 * ✅ Good:
 *   type User = v.InferOutput<typeof UserSchema>;
 *   const user: User = { ... };
 *   function getUser(): User { ... }
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getTypeAnnotation } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Pattern to match v.InferOutput<...> or v.InferInput<...>
function isInlineInfer(typeText: string, namespaceAlias: string): boolean {
	return (
		typeText.includes(`${namespaceAlias}.InferOutput<`) ||
		typeText.includes(`${namespaceAlias}.InferInput<`) ||
		typeText.includes(`${namespaceAlias}.Output<`) ||
		typeText.includes(`${namespaceAlias}.Input<`)
	);
}

function extractSchemaName(typeText: string): string | null {
	const match = typeText.match(/typeof\s+(\w+)/);
	return match ? match[1] : null;
}

const rule: TypeScriptRule = {
	id: 'valibot/no-inline-infer',
	description: "Don't use v.InferOutput<> inline; declare a type alias first",
	categories: ['typescript', 'valibot', 'style'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return results;

			for (const declarator of declarations) {
				const id = declarator.id as AstNode | undefined;
				if (!id) continue;

				const typeAnnotation = getTypeAnnotation(id, context.content);
				if (!typeAnnotation) continue;

				if (isInlineInfer(typeAnnotation, namespaceAlias)) {
					const schemaName = extractSchemaName(typeAnnotation);
					const suggestedTypeName = schemaName
						? schemaName.replace(/Schema$/, '')
						: 'TypeName';

					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: 'Avoid inline v.InferOutput<> - declare a type alias instead',
						ruleId: 'valibot/no-inline-infer',
						tip: 'Define a type alias for reusability and readability',
						example: `type ${suggestedTypeName} = ${typeAnnotation};\nconst x: ${suggestedTypeName} = ...`,
					});
				}
			}

			return results;
		},

		FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			// Check parameters
			const params = node.params as AstNode[] | undefined;
			if (params) {
				for (const param of params) {
					const typeAnnotation = getTypeAnnotation(param, context.content);
					if (typeAnnotation && isInlineInfer(typeAnnotation, namespaceAlias)) {
						const paramName = (param.name as string) || 'param';
						results.push({
							file: context.file,
							line: param.loc.start.line,
							column: param.loc.start.column + 1,
							severity: 'error',
							message: `Parameter '${paramName}' uses inline v.InferOutput<> - declare a type alias`,
							ruleId: 'valibot/no-inline-infer',
							tip: 'Define a type alias for function parameters',
						});
					}
				}
			}

			// Check return type
			const returnType = node.returnType as AstNode | undefined;
			if (returnType) {
				const returnTypeText = context.content.slice(
					(returnType.typeAnnotation as AstNode)?.start ?? returnType.start,
					(returnType.typeAnnotation as AstNode)?.end ?? returnType.end
				);

				if (isInlineInfer(returnTypeText, namespaceAlias)) {
					results.push({
						file: context.file,
						line: returnType.loc.start.line,
						column: returnType.loc.start.column + 1,
						severity: 'error',
						message: 'Return type uses inline v.InferOutput<> - declare a type alias',
						ruleId: 'valibot/no-inline-infer',
						tip: 'Define a type alias for function return types',
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
