/**
 * Rule: valibot/no-type-cast-after-parse
 *
 * Disallows type casting (as Type) after v.parse() or v.safeParse().
 *
 * Valibot already infers the correct type - casting defeats the purpose.
 *
 * ❌ Bad:
 *   const data = v.parse(UserSchema, input) as User;
 *   const result = v.safeParse(UserSchema, input);
 *   const user = result.output as User;
 *
 * ✅ Good:
 *   const data = v.parse(UserSchema, input); // Already typed correctly
 *   type User = v.InferOutput<typeof UserSchema>;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-type-cast-after-parse',
	description: "Don't cast types after v.parse() - trust the inferred type",
	categories: ['typescript', 'valibot', 'types'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		// Check for: v.parse(...) as Type
		TSAsExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const expression = node.expression as AstNode | undefined;
			if (!expression) return results;

			// Check if expression is a parse call
			if (expression.type === 'CallExpression') {
				if (
					isNamespaceMethodCallAny(expression, namespaceAlias, [
						'parse',
						'parseAsync',
						'safeParse',
						'safeParseAsync',
					])
				) {
					const typeAnnotation = node.typeAnnotation as AstNode | undefined;
					const typeName = typeAnnotation
						? context.content.slice(typeAnnotation.start, typeAnnotation.end)
						: 'Type';

					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `Type cast 'as ${typeName}' after parse() is unnecessary - Valibot infers the type`,
						ruleId: 'valibot/no-type-cast-after-parse',
						tip: 'Remove the type cast and let Valibot infer the type from the schema',
						example: `const data = ${namespaceAlias}.parse(Schema, input); // Type is inferred`,
					});
				}
			}

			// Check if expression is a member access like result.output
			if (expression.type === 'MemberExpression') {
				const property = expression.property as AstNode | undefined;
				if (property?.name === 'output') {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: 'Type cast on .output is unnecessary if result is from safeParse',
						ruleId: 'valibot/no-type-cast-after-parse',
						tip: 'The output type is already inferred from the schema',
					});
				}
			}

			return results;
		},

		// Also check for TSTypeAssertion (older syntax: <Type>value)
		TSTypeAssertion(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const expression = node.expression as AstNode | undefined;
			if (!expression || expression.type !== 'CallExpression') return results;

			if (
				isNamespaceMethodCallAny(expression, namespaceAlias, [
					'parse',
					'parseAsync',
					'safeParse',
					'safeParseAsync',
				])
			) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: 'Type assertion after parse() is unnecessary - Valibot infers the type',
					ruleId: 'valibot/no-type-cast-after-parse',
					tip: 'Remove the type assertion and let Valibot infer the type',
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
