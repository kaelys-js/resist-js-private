/**
 * Rule: valibot/no-orphan-types
 *
 * Disallows type aliases without corresponding Valibot schemas.
 *
 * Types should be derived from schemas for runtime validation support.
 *
 * ❌ Bad:
 *   type User = { name: string };  // No schema, no runtime validation
 *
 * ✅ Good:
 *   const UserSchema = v.strictObject({ name: v.string() });
 *   type User = v.InferOutput<typeof UserSchema>;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import {
	getNamespaceAlias,
	getSchemaDefinitions,
	getTypeAliases,
} from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Types that are allowed to exist without schemas
const ALLOWED_ORPHAN_PATTERNS = [
	// Utility types
	/^_/, // Internal types
	/Props$/, // React props (may come from components)
	/State$/, // State types
	/Context$/, // Context types
	/Ref$/, // Ref types
	/Event$/, // Event types
	/Handler$/, // Handler types
	/Callback$/, // Callback types
	/Options$/, // Options types (often library types)
	/Config$/, // Config might be validated elsewhere
];

const rule: TypeScriptRule = {
	id: 'valibot/no-orphan-types',
	description: 'Types should have corresponding Valibot schemas for runtime validation',
	categories: ['typescript', 'valibot', 'types'],
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
			const typeAliases = getTypeAliases(node);

			// Build set of schema-derived type names
			const schemaTypeNames = new Set<string>();
			for (const schemaName of schemas.keys()) {
				// UserSchema -> User
				const typeName = schemaName.replace(/Schema$/, '').replace(/schema$/, '');
				schemaTypeNames.add(typeName);
			}

			// Check each type alias
			for (const [typeName, typeNode] of typeAliases) {
				// Skip if this type has a corresponding schema
				if (schemaTypeNames.has(typeName)) continue;

				// Skip allowed patterns
				if (ALLOWED_ORPHAN_PATTERNS.some((pattern) => pattern.test(typeName))) continue;

				// Check if type is derived from valibot (InferOutput)
				const typeAnnotation = typeNode.typeAnnotation as AstNode | undefined;
				if (typeAnnotation) {
					const typeText = context.content.slice(typeAnnotation.start, typeAnnotation.end);
					if (
						typeText.includes('InferOutput') ||
						typeText.includes('InferInput') ||
						typeText.includes(`${namespaceAlias}.`)
					) {
						// Type is derived from valibot, that's fine
						continue;
					}
				}

				// Skip generic types (they're usually utility types)
				const typeParams = typeNode.typeParameters as AstNode | undefined;
				if (typeParams) continue;

				// Check what kind of type it is
				if (typeAnnotation?.type === 'TSTypeLiteral') {
					results.push({
						file: context.file,
						line: typeNode.loc.start.line,
						column: typeNode.loc.start.column + 1,
						severity: 'warning',
						message: `Type '${typeName}' has no corresponding schema - consider adding '${typeName}Schema'`,
						ruleId: 'valibot/no-orphan-types',
						tip: 'Create a schema to enable runtime validation',
						example: `const ${typeName}Schema = ${namespaceAlias}.strictObject({ ... });\ntype ${typeName} = ${namespaceAlias}.InferOutput<typeof ${typeName}Schema>;`,
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
