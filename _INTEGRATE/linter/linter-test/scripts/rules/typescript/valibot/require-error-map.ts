/**
 * Rule: valibot/require-error-map
 *
 * Requires that every *.schema.ts file has a corresponding *.errors.ts file.
 * This ensures error messages are externalized for i18n support.
 *
 * ❌ Bad:
 *   user.schema.ts exists
 *   user.errors.ts does NOT exist
 *
 * ✅ Good:
 *   user.schema.ts exists
 *   user.errors.ts exists (colocated)
 *
 * The errors file should export a LocalizedErrorMap for each schema:
 *   export const UserErrors: LocalizedErrorMap = { ... };
 */

import type { TypeScriptRule, LintResult, VisitorContext } from '../../types.js';
import { hasImport } from '../../oxc-runner.js';
import * as fs from 'fs';
import * as path from 'path';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/require-error-map',
	description: 'Schema files must have a corresponding *.errors.ts file',
	categories: ['typescript', 'valibot', 'i18n', 'errors'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.schema.ts', '**/*.schema.tsx'],
	},

	visitor: {},

	async check(context: VisitorContext): Promise<LintResult[]> {
		const results: LintResult[] = [];

		// Only check schema files
		if (!context.file.endsWith('.schema.ts') && !context.file.endsWith('.schema.tsx')) {
			return results;
		}

		// Only check files that import valibot
		if (!hasImport(VALIBOT_MODULE, context.imports)) {
			return results;
		}

		// Determine the expected errors file path
		const schemaFile = context.file;
		const errorsFile = schemaFile.replace(/\.schema\.(ts|tsx)$/, '.errors.$1');

		// Check if errors file exists
		try {
			fs.accessSync(errorsFile, fs.constants.F_OK);
		} catch {
			const fileName = path.basename(schemaFile);
			const expectedErrorsFile = path.basename(errorsFile);

			results.push({
				file: context.file,
				line: 1,
				column: 1,
				severity: 'error',
				message: `Missing error map file: ${expectedErrorsFile}`,
				ruleId: 'valibot/require-error-map',
				tip: `Create ${expectedErrorsFile} with LocalizedErrorMap exports for i18n support`,
				example: `// ${expectedErrorsFile}
import type { LocalizedErrorMap } from '@/schemas/errors';

export const UserErrors: LocalizedErrorMap = {
  en: {
    name: { string: 'Name is required' },
    email: { string: 'Email is required', email: 'Invalid email' },
  },
  es: {
    name: { string: 'Nombre requerido' },
    email: { string: 'Email requerido', email: 'Email inválido' },
  },
};`,
			});
		}

		return results;
	},
};

export default rule;
