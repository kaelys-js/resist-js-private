/**
 * Rule: valibot/no-schema-in-component
 *
 * Disallows defining Valibot schemas inside Svelte components.
 *
 * Schemas should be:
 *   - Defined in separate .ts files
 *   - Imported into components
 *
 * This ensures:
 *   - Schemas are reusable
 *   - Better tree-shaking
 *   - Cleaner component code
 *
 * ❌ Bad:
 *   <!-- Component.svelte -->
 *   <script>
 *     const FormSchema = v.strictObject({ ... });
 *   </script>
 *
 * ✅ Good:
 *   <!-- Component.svelte -->
 *   <script>
 *     import { FormSchema } from './form.schema';
 *   </script>
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getSchemaDefinitions } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-schema-in-component',
	description: "Don't define schemas inside Svelte components - import them instead",
	categories: ['typescript', 'valibot', 'organization', 'svelte'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.svelte'],
	},

	visitor: {
		Program(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const schemas = getSchemaDefinitions(node, context.content, namespaceAlias);

			for (const [schemaName, schemaNode] of schemas) {
				results.push({
					file: context.file,
					line: schemaNode.loc.start.line,
					column: schemaNode.loc.start.column + 1,
					severity: 'error',
					message: `Schema '${schemaName}' should not be defined in a component`,
					ruleId: 'valibot/no-schema-in-component',
					tip: 'Move schema to a separate .schema.ts file and import it',
					example: `// ${schemaName.replace('Schema', '.schema.ts')}\nexport const ${schemaName} = ...\n\n// Component.svelte\nimport { ${schemaName} } from './${schemaName.replace('Schema', '.schema')}';`,
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
