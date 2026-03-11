/**
 * Rule: valibot/export-schema-and-type
 *
 * If a schema is exported, its corresponding type must also be exported.
 *
 * ❌ Bad:
 *   export const UserSchema = v.strictObject({ ... });
 *   type User = v.InferOutput<typeof UserSchema>;  // Not exported
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
	id: 'valibot/export-schema-and-type',
	description: 'If schema is exported, type must be exported too',
	categories: ['typescript', 'valibot', 'exports'],
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

			for (const [schemaName, schemaNode] of schemas) {
				const isSchemaExported = exports.named.has(schemaName);
				if (!isSchemaExported) continue;

				const expectedTypeName = schemaName.replace(/Schema$/, '').replace(/schema$/, '');
				const typeAlias = typeAliases.get(expectedTypeName);

				if (typeAlias && !exports.named.has(expectedTypeName)) {
					results.push({
						file: context.file,
						line: typeAlias.loc.start.line,
						column: typeAlias.loc.start.column + 1,
						severity: 'error',
						message: `Type '${expectedTypeName}' must be exported when schema '${schemaName}' is exported`,
						ruleId: 'valibot/export-schema-and-type',
						tip: 'Add export keyword to the type alias',
						example: `export type ${expectedTypeName} = ${namespaceAlias}.InferOutput<typeof ${schemaName}>;`,
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
