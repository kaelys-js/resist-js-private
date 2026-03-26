/**
 * Rule: valibot/type-alias-from-schema
 *
 * Enforces that type aliases are derived from Valibot schemas using v.InferOutput.
 *
 * ❌ Bad:
 *   type User = { name: string; email: string };
 *   interface Config { debug: boolean };
 *
 * ✅ Good:
 *   const UserSchema = v.strictObject({ ... });
 *   type User = v.InferOutput<typeof UserSchema>;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/type-alias-from-schema',
	description: 'Type aliases must be derived from Valibot schemas using v.InferOutput',
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
			// If valibot isn't imported, this file might not need to follow valibot patterns
			if (!namespaceAlias) return results;

			const id = node.id as AstNode | undefined;
			const name = id?.name as string | undefined;
			if (!name) return results;

			// Skip type parameters (generics)
			const typeParameters = node.typeParameters as AstNode | undefined;
			if (typeParameters) {
				// Generic types are allowed as they might be utility types
				return results;
			}

			const typeAnnotation = node.typeAnnotation as AstNode | undefined;
			if (!typeAnnotation) return results;

			const typeText = context.content.slice(typeAnnotation.start, typeAnnotation.end);

			// Check if type is derived from valibot
			const isValibotDerived =
				typeText.includes(`${namespaceAlias}.InferOutput`) ||
				typeText.includes(`${namespaceAlias}.InferInput`) ||
				typeText.includes(`${namespaceAlias}.Output`) ||
				typeText.includes(`${namespaceAlias}.Input`);

			if (!isValibotDerived) {
				// Check what kind of type it is
				if (typeAnnotation.type === 'TSTypeLiteral') {
					// Object type literal: { name: string }
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `Type alias '${name}' is a manual object type - derive it from a Valibot schema`,
						ruleId: 'valibot/type-alias-from-schema',
						tip: 'Define a schema first, then use v.InferOutput<typeof Schema>',
						example: `const ${name}Schema = v.strictObject({ ... });\ntype ${name} = v.InferOutput<typeof ${name}Schema>;`,
					});
				} else if (typeAnnotation.type === 'TSUnionType') {
					// Union type
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `Type alias '${name}' is a manual union type - consider deriving from a Valibot schema`,
						ruleId: 'valibot/type-alias-from-schema',
						tip: 'Use v.union() or v.variant() schema and derive the type',
					});
				} else if (typeAnnotation.type === 'TSIntersectionType') {
					// Intersection type
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `Type alias '${name}' is a manual intersection type - consider deriving from a Valibot schema`,
						ruleId: 'valibot/type-alias-from-schema',
						tip: 'Use v.intersect() schema and derive the type',
					});
				} else if (typeAnnotation.type === 'TSArrayType' || typeAnnotation.type === 'TSTypeReference' && typeText.startsWith('Array')) {
					// Array type
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `Type alias '${name}' is a manual array type - consider deriving from a Valibot schema`,
						ruleId: 'valibot/type-alias-from-schema',
						tip: 'Use v.array() schema and derive the type',
					});
				}
				// For other types (primitives, type references), we don't warn
				// as they might be intentional utility types
			}

			return results;
		},

		TSInterfaceDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const id = node.id as AstNode | undefined;
			const name = id?.name as string | undefined;
			if (!name) return results;

			// Interfaces can't be derived from schemas, so warn about them
			results.push({
				file: context.file,
				line: node.loc.start.line,
				column: node.loc.start.column + 1,
				severity: 'warning',
				message: `Interface '${name}' cannot be derived from a Valibot schema - use a type alias instead`,
				ruleId: 'valibot/type-alias-from-schema',
				tip: 'Convert interface to type alias derived from a schema for runtime validation',
				example: `const ${name}Schema = v.strictObject({ ... });\ntype ${name} = v.InferOutput<typeof ${name}Schema>;`,
			});

			return results;
		},
	},

	async check() {
		return [];
	},
};

export default rule;
