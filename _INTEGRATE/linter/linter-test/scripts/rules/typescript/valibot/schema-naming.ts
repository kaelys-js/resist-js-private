/**
 * Rule: valibot/schema-naming
 *
 * Enforces that Valibot schema variables end with 'Schema' suffix.
 *
 * ❌ Bad:
 *   const user = v.object({ ... });
 *   const userValidator = v.object({ ... });
 *
 * ✅ Good:
 *   const UserSchema = v.object({ ... });
 *   const userSchema = v.object({ ... });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Valibot methods that create schemas
const SCHEMA_METHODS = [
	// Primitives
	'string',
	'number',
	'boolean',
	'bigint',
	'symbol',
	'undefined_',
	'null_',
	'void_',
	'never',
	'any',
	'unknown',
	'nan',
	'date',
	'blob',
	'file',

	// Complex types
	'object',
	'strictObject',
	'looseObject',
	'objectWithRest',
	'array',
	'tuple',
	'strictTuple',
	'looseTuple',
	'tupleWithRest',
	'record',
	'map',
	'set',
	'enum_',
	'picklist',
	'literal',

	// Unions & intersections
	'union',
	'variant',
	'intersect',

	// Special
	'lazy',
	'recursive',
	'instance',
	'custom',
	'special',

	// Wrappers
	'optional',
	'nullable',
	'nullish',
	'nonOptional',
	'nonNullable',
	'nonNullish',

	// Transformers that return schemas
	'pipe',
	'brand',
	'transform',
	'fallback',
];

const rule: TypeScriptRule = {
	id: 'valibot/schema-naming',
	description: 'Valibot schema variables must end with Schema suffix',
	categories: ['typescript', 'valibot', 'naming'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			if (node.kind !== 'const') return results;

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return results;

			for (const declarator of declarations) {
				const id = declarator.id as AstNode | undefined;
				const init = declarator.init as AstNode | undefined;

				if (!id || !init) continue;

				const name = id.name as string | undefined;
				if (!name) continue;

				// Skip if already ends with Schema
				if (name.endsWith('Schema') || name.endsWith('schema')) continue;

				// Check if init is a valibot schema call
				const methodName = getNamespaceMethodName(init, namespaceAlias);
				if (methodName && SCHEMA_METHODS.includes(methodName)) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `Schema variable '${name}' must end with 'Schema' suffix`,
						ruleId: 'valibot/schema-naming',
						tip: 'Rename the variable to include Schema suffix',
						example: `const ${name}Schema = ${namespaceAlias}.${methodName}(...)`,
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
