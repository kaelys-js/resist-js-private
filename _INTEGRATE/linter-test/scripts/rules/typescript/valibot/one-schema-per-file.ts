/**
 * Rule: valibot/one-schema-per-file
 *
 * Recommends splitting large schema files (many schemas) into separate files.
 *
 * This improves:
 *   - Code organization and discoverability
 *   - Tree-shaking (only import what you need)
 *   - Testing (test schemas individually)
 *
 * ⚠️ Warning (>5 schemas):
 *   Consider splitting schemas into separate files
 *
 * Note: Simple helper schemas or related schemas can stay together.
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getSchemaDefinitions } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const WARNING_THRESHOLD = 5;
const ERROR_THRESHOLD = 10;

const rule: TypeScriptRule = {
	id: 'valibot/one-schema-per-file',
	description: 'Large schema files should be split for better organization',
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
			const schemaCount = schemas.size;

			if (schemaCount > ERROR_THRESHOLD) {
				const schemaNames = Array.from(schemas.keys());
				results.push({
					file: context.file,
					line: 1,
					column: 1,
					severity: 'warning',
					message: `File contains ${schemaCount} schemas - consider splitting into separate files`,
					ruleId: 'valibot/one-schema-per-file',
					tip: `Split into: ${schemaNames.slice(0, 3).map((n) => n.replace('Schema', '.schema.ts')).join(', ')}...`,
				});
			} else if (schemaCount > WARNING_THRESHOLD) {
				results.push({
					file: context.file,
					line: 1,
					column: 1,
					severity: 'info',
					message: `File contains ${schemaCount} schemas - might benefit from splitting`,
					ruleId: 'valibot/one-schema-per-file',
					tip: 'Group related schemas or split large schemas into separate files',
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
