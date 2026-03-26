/**
 * Rule: valibot/colocate-schema-type
 *
 * Enforces that schema and its type alias are defined in the same file.
 *
 * This is a file-level check that ensures schema/type pairs are colocated.
 *
 * ❌ Bad:
 *   // user-schema.ts
 *   export const UserSchema = v.strictObject({ ... });
 *
 *   // user-types.ts (separate file)
 *   export type User = v.InferOutput<typeof UserSchema>;
 *
 * ✅ Good:
 *   // user.ts (same file)
 *   export const UserSchema = v.strictObject({ ... });
 *   export type User = v.InferOutput<typeof UserSchema>;
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
	id: 'valibot/colocate-schema-type',
	description: 'Schema and its type alias must be in the same file',
	categories: ['typescript', 'valibot', 'organization'],
	stages: ['lint', 'check'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		// Check type aliases that reference schemas from other files
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

			// Check if type references a schema
			const referencedSchema = extractSchemaNameFromInfer(typeText);
			if (!referencedSchema) return results;

			// Get schemas defined in this file
			const schemas = getSchemaDefinitions(context.ast, context.content, namespaceAlias);

			// If the referenced schema is not in this file, warn
			if (!schemas.has(referencedSchema)) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: `Type '${typeName}' references schema '${referencedSchema}' from another file`,
					ruleId: 'valibot/colocate-schema-type',
					tip: 'Move the type alias to the same file as the schema, or import and re-export both together',
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
