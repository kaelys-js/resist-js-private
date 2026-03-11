/**
 * Rule: valibot/error-map-complete
 *
 * Validates that error maps cover all fields and validation types in the schema.
 * Parses both the *.schema.ts and *.errors.ts files to compare them.
 *
 * ❌ Bad:
 *   // user.schema.ts
 *   const UserSchema = v.strictObject({
 *     name: v.pipe(v.string(), v.minLength(1)),
 *     email: v.pipe(v.string(), v.email()),
 *   });
 *
 *   // user.errors.ts - missing 'email' field!
 *   const UserErrors = {
 *     en: { name: { string: '...', minLength: '...' } },
 *   };
 *
 * ✅ Good:
 *   // user.errors.ts - covers all fields and validations
 *   const UserErrors = {
 *     en: {
 *       name: { string: '...', minLength: '...' },
 *       email: { string: '...', email: '...' },
 *     },
 *   };
 *
 * This rule parses the schema file to extract fields and validation types,
 * then validates that the error map has messages for each combination.
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';
import * as fs from 'fs';
import * as path from 'path';

const VALIBOT_MODULE = 'valibot';

// Validation types that require error messages
const VALIDATION_TYPES = [
	'string',
	'number',
	'boolean',
	'bigint',
	'date',
	'email',
	'url',
	'uuid',
	'regex',
	'minLength',
	'maxLength',
	'length',
	'nonEmpty',
	'minValue',
	'maxValue',
	'integer',
	'finite',
	'safeInteger',
	'multipleOf',
	'minDate',
	'maxDate',
	'check',
	'custom',
];

interface SchemaField {
	name: string;
	validations: string[];
}

const rule: TypeScriptRule = {
	id: 'valibot/error-map-complete',
	description: 'Error map must cover all schema fields and validation types',
	categories: ['typescript', 'valibot', 'i18n', 'errors'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.errors.ts', '**/*.errors.tsx'],
	},

	visitor: {},

	async check(context: VisitorContext): Promise<LintResult[]> {
		const results: LintResult[] = [];

		// Only check errors files
		if (!context.file.endsWith('.errors.ts') && !context.file.endsWith('.errors.tsx')) {
			return results;
		}

		// Find the corresponding schema file
		const errorsFile = context.file;
		const schemaFile = errorsFile.replace(/\.errors\.(ts|tsx)$/, '.schema.$1');

		// Check if schema file exists
		let schemaContent: string;
		try {
			schemaContent = fs.readFileSync(schemaFile, 'utf-8');
		} catch {
			// Schema file doesn't exist - different rule handles that
			return results;
		}

		// Parse schema to extract fields and validations
		const schemaFields = extractSchemaFields(schemaContent);
		if (schemaFields.length === 0) {
			return results;
		}

		// Parse error map to extract covered fields
		const coveredFields = extractErrorMapFields(context.content);

		// Compare and report missing fields
		for (const field of schemaFields) {
			const covered = coveredFields.get(field.name);

			if (!covered) {
				results.push({
					file: context.file,
					line: 1,
					column: 1,
					severity: 'error',
					message: `Error map missing field: '${field.name}'`,
					ruleId: 'valibot/error-map-complete',
					tip: `Add error messages for '${field.name}' with validations: ${field.validations.join(', ')}`,
				});
				continue;
			}

			// Check for missing validations
			const missingValidations = field.validations.filter((v) => !covered.has(v));
			if (missingValidations.length > 0) {
				results.push({
					file: context.file,
					line: 1,
					column: 1,
					severity: 'warning',
					message: `Error map for '${field.name}' missing validations: ${missingValidations.join(', ')}`,
					ruleId: 'valibot/error-map-complete',
					tip: `Add messages for: ${missingValidations.map((v) => `${field.name}.${v}`).join(', ')}`,
				});
			}
		}

		return results;
	},
};

/**
 * Extract schema fields and their validation types from schema content.
 * Uses simple regex parsing - not full AST parsing for performance.
 */
function extractSchemaFields(content: string): SchemaField[] {
	const fields: SchemaField[] = [];

	// Find object/strictObject definitions
	const objectMatch = content.match(/v\.(strict)?Object\s*\(\s*\{([^}]+)\}/s);
	if (!objectMatch) return fields;

	const objectBody = objectMatch[2];

	// Extract each field
	const fieldRegex = /(\w+)\s*:\s*v\.([^,\n]+)/g;
	let match;

	while ((match = fieldRegex.exec(objectBody)) !== null) {
		const fieldName = match[1];
		const fieldDef = match[2];

		const validations = extractValidations(fieldDef);
		if (validations.length > 0) {
			fields.push({ name: fieldName, validations });
		}
	}

	return fields;
}

/**
 * Extract validation types from a field definition.
 */
function extractValidations(fieldDef: string): string[] {
	const validations: string[] = [];

	// Check for pipe with multiple validations
	if (fieldDef.includes('pipe')) {
		// Extract all method calls inside pipe
		const methodRegex = /v\.(\w+)/g;
		let match;
		while ((match = methodRegex.exec(fieldDef)) !== null) {
			const method = match[1];
			if (VALIDATION_TYPES.includes(method)) {
				validations.push(method);
			}
		}
	} else {
		// Single validation
		const singleMatch = fieldDef.match(/^(\w+)/);
		if (singleMatch && VALIDATION_TYPES.includes(singleMatch[1])) {
			validations.push(singleMatch[1]);
		}
	}

	return validations;
}

/**
 * Extract fields and their validation types from error map content.
 * Returns Map of field name to Set of validation types.
 */
function extractErrorMapFields(content: string): Map<string, Set<string>> {
	const fields = new Map<string, Set<string>>();

	// Find the first locale's error map (all locales should have same structure)
	// Look for pattern: en: { field: { validation: 'message' } }
	const localeMatch = content.match(/en\s*:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
	if (!localeMatch) return fields;

	const localeBody = localeMatch[1];

	// Extract fields and their validations
	const fieldRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
	let match;

	while ((match = fieldRegex.exec(localeBody)) !== null) {
		const fieldName = match[1];
		const fieldBody = match[2];

		const validations = new Set<string>();

		// Extract validation types from field body
		const validationRegex = /(\w+)\s*:/g;
		let valMatch;
		while ((valMatch = validationRegex.exec(fieldBody)) !== null) {
			validations.add(valMatch[1]);
		}

		fields.set(fieldName, validations);
	}

	return fields;
}

export default rule;
