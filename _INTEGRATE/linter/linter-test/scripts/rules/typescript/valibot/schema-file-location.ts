/**
 * Rule: valibot/schema-file-location
 *
 * Enforces that schemas are defined in designated locations.
 *
 * Schemas should be in:
 *   - `schemas/` directory
 *   - `*.schema.ts` files
 *   - `*.schemas.ts` files
 *
 * ❌ Bad:
 *   // user.ts
 *   export const UserSchema = v.strictObject({ ... });
 *
 * ✅ Good:
 *   // schemas/user.ts or user.schema.ts
 *   export const UserSchema = v.strictObject({ ... });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getSchemaDefinitions } from '../../oxc-runner.js';
import * as path from 'path';

const VALIBOT_MODULE = 'valibot';

// Allowed file patterns for schemas
const ALLOWED_PATTERNS = [
	/\/schemas?\//i, // schemas/ or schema/ directory
	/\.schemas?\.ts$/i, // *.schema.ts or *.schemas.ts
	/\/types?\//i, // types/ directory (often colocated)
	/\.types?\.ts$/i, // *.types.ts
	/\/models?\//i, // models/ directory
	/\.models?\.ts$/i, // *.model.ts
	/\/contracts?\//i, // contracts/ directory
	/\.contracts?\.ts$/i, // *.contract.ts
	/\/validators?\//i, // validators/ directory
	/\.validators?\.ts$/i, // *.validator.ts
];

const rule: TypeScriptRule = {
	id: 'valibot/schema-file-location',
	description: 'Schemas should be in schemas/ directory or *.schema.ts files',
	categories: ['typescript', 'valibot', 'organization'],
	stages: ['lint', 'check'],
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

			// If no schemas in this file, no issue
			if (schemas.size === 0) return results;

			// Check if file path matches allowed patterns
			const filePath = context.file;
			const isAllowedLocation = ALLOWED_PATTERNS.some((pattern) => pattern.test(filePath));

			if (!isAllowedLocation) {
				const schemaNames = Array.from(schemas.keys());
				const fileName = path.basename(filePath);

				results.push({
					file: context.file,
					line: 1,
					column: 1,
					severity: 'warning',
					message: `Schemas (${schemaNames.join(', ')}) should be in schemas/ directory or *.schema.ts file`,
					ruleId: 'valibot/schema-file-location',
					tip: `Move to schemas/${fileName.replace('.ts', '.schema.ts')} or rename file`,
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
