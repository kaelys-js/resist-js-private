/**
 * Rule: valibot/no-orphan-schemas
 *
 * Enforces that schemas have exported type aliases.
 *
 * A schema without a type alias means the type can only be inferred inline,
 * reducing reusability.
 *
 * ❌ Bad:
 *   export const UserSchema = v.strictObject({ ... });
 *   // Missing type export
 *
 * ✅ Good:
 *   export const UserSchema = v.strictObject({ ... });
 *   export type User = v.InferOutput<typeof UserSchema>;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import {
	getNamespaceAlias,
	getSchemaDefinitions,
	getTypeAliases,
	getExports,
} from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-orphan-schemas',
	description: 'Schemas must have exported type aliases',
	categories: ['typescript', 'valibot', 'types'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		Program(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const schemas = getSchemaDefinitions(node, context.content, namespaceAlias);
			const typeAliases = getTypeAliases(node);
			const exports = getExports(node);

			// Check each exported schema
			for (const [schemaName, schemaNode] of schemas) {
				// Check if schema is exported
				const isExported = exports.named.has(schemaName);

				// If schema is exported, check for corresponding exported type
				if (isExported) {
					const expectedTypeName = schemaName.replace(/Schema$/, '').replace(/schema$/, '');

					const typeAlias = typeAliases.get(expectedTypeName);
					const typeIsExported = exports.named.has(expectedTypeName);

					if (!typeAlias) {
						results.push({
							file: context.file,
							line: schemaNode.loc.start.line,
							column: schemaNode.loc.start.column + 1,
							severity: 'error',
							message: `Exported schema '${schemaName}' is missing type alias '${expectedTypeName}'`,
							ruleId: 'valibot/no-orphan-schemas',
							tip: 'Add an exported type alias for better API ergonomics',
							example: `export type ${expectedTypeName} = ${namespaceAlias}.InferOutput<typeof ${schemaName}>;`,
						});
					} else if (!typeIsExported) {
						results.push({
							file: context.file,
							line: typeAlias.loc.start.line,
							column: typeAlias.loc.start.column + 1,
							severity: 'warning',
							message: `Type '${expectedTypeName}' should be exported alongside schema '${schemaName}'`,
							ruleId: 'valibot/no-orphan-schemas',
							tip: 'Export the type so consumers can use it',
							example: `export type ${expectedTypeName} = ...`,
						});
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
