/**
 * Rule: valibot/schema-type-pair
 *
 * Enforces that every XxxSchema has a corresponding type Xxx derived from it.
 *
 * ❌ Bad:
 *   const UserSchema = v.strictObject({ ... });
 *   // Missing: type User = v.InferOutput<typeof UserSchema>;
 *
 * ✅ Good:
 *   const UserSchema = v.strictObject({ ... });
 *   type User = v.InferOutput<typeof UserSchema>;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import {
	getNamespaceAlias,
	getSchemaDefinitions,
	getTypeAliases,
	extractSchemaNameFromInfer,
} from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/schema-type-pair',
	description: 'Every XxxSchema must have a corresponding type Xxx = v.InferOutput<typeof XxxSchema>',
	categories: ['typescript', 'valibot', 'types'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		// We need to check at Program level to see all schemas and types
		Program(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			// Get all schemas and type aliases
			const schemas = getSchemaDefinitions(node, context.content, namespaceAlias);
			const typeAliases = getTypeAliases(node);

			// For each schema, check if there's a corresponding type
			for (const [schemaName, schemaNode] of schemas) {
				// Expected type name: UserSchema -> User
				const expectedTypeName = schemaName.replace(/Schema$/, '').replace(/schema$/, '');

				// Check if type exists
				const typeAlias = typeAliases.get(expectedTypeName);

				if (!typeAlias) {
					results.push({
						file: context.file,
						line: schemaNode.loc.start.line,
						column: schemaNode.loc.start.column + 1,
						severity: 'error',
						message: `Schema '${schemaName}' is missing corresponding type '${expectedTypeName}'`,
						ruleId: 'valibot/schema-type-pair',
						tip: 'Define a type alias derived from the schema',
						example: `type ${expectedTypeName} = ${namespaceAlias}.InferOutput<typeof ${schemaName}>;`,
					});
				} else {
					// Check if type is correctly derived from schema
					const typeAnnotation = typeAlias.typeAnnotation as AstNode | undefined;
					if (typeAnnotation) {
						const typeText = context.content.slice(typeAnnotation.start, typeAnnotation.end);

						// Check if it references the correct schema
						const referencedSchema = extractSchemaNameFromInfer(typeText);

						if (referencedSchema && referencedSchema !== schemaName) {
							results.push({
								file: context.file,
								line: typeAlias.loc.start.line,
								column: typeAlias.loc.start.column + 1,
								severity: 'warning',
								message: `Type '${expectedTypeName}' references '${referencedSchema}' instead of '${schemaName}'`,
								ruleId: 'valibot/schema-type-pair',
								tip: 'Ensure the type is derived from the matching schema',
							});
						}

						// Check if it uses InferOutput
						if (
							!typeText.includes('InferOutput') &&
							!typeText.includes('InferInput') &&
							!typeText.includes('Output') &&
							!typeText.includes('Input')
						) {
							results.push({
								file: context.file,
								line: typeAlias.loc.start.line,
								column: typeAlias.loc.start.column + 1,
								severity: 'warning',
								message: `Type '${expectedTypeName}' should be derived from '${schemaName}' using v.InferOutput`,
								ruleId: 'valibot/schema-type-pair',
								tip: 'Use v.InferOutput<typeof Schema> to keep type in sync with schema',
								example: `type ${expectedTypeName} = ${namespaceAlias}.InferOutput<typeof ${schemaName}>;`,
							});
						}
					}
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
