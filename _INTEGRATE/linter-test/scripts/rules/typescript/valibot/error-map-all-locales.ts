/**
 * Rule: valibot/error-map-all-locales
 *
 * Validates that error maps include all supported locales defined in config.
 * Reads SUPPORTED_LOCALES from packages/config/src/index.ts.
 *
 * ❌ Bad:
 *   // SUPPORTED_LOCALES = ['en', 'es'] in config
 *   const UserErrors: LocalizedErrorMap = {
 *     en: { ... },  // Missing 'es'!
 *   };
 *
 * ✅ Good:
 *   const UserErrors: LocalizedErrorMap = {
 *     en: { ... },
 *     es: { ... },
 *   };
 *
 * The rule reads the config file to get the list of supported locales,
 * then validates that every LocalizedErrorMap export has all of them.
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import * as fs from 'fs';
import * as path from 'path';

// Path to config file (relative to repo root)
const CONFIG_PATH = 'packages/config/src/index.ts';

// Cache for supported locales
let supportedLocalesCache: string[] | null = null;

const rule: TypeScriptRule = {
	id: 'valibot/error-map-all-locales',
	description: 'Error maps must include all supported locales from config',
	categories: ['typescript', 'valibot', 'i18n', 'errors'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.errors.ts', '**/*.errors.tsx'],
	},

	visitor: {
		VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			// Only check errors files
			if (!context.file.endsWith('.errors.ts') && !context.file.endsWith('.errors.tsx')) {
				return results;
			}

			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return results;

			for (const decl of declarations) {
				const id = decl.id as AstNode | undefined;
				const init = decl.init as AstNode | undefined;

				if (!id || !init) continue;

				// Check if this is a LocalizedErrorMap (by name convention *Errors)
				const name = id.name as string | undefined;
				if (!name || !name.endsWith('Errors')) continue;

				// Check if init is an object expression
				if (init.type !== 'ObjectExpression') continue;

				// Get the locales defined in this error map
				const definedLocales = extractDefinedLocales(init);

				// Get supported locales from config
				const supportedLocales = getSupportedLocales(context.file);

				// Find missing locales
				const missingLocales = supportedLocales.filter((l) => !definedLocales.includes(l));

				if (missingLocales.length > 0) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `${name} missing locales: ${missingLocales.join(', ')}`,
						ruleId: 'valibot/error-map-all-locales',
						tip: `Add translations for all supported locales: ${supportedLocales.join(', ')}`,
						example: generateLocaleExample(name, missingLocales),
					});
				}

				// Check if any unknown locales are defined
				const unknownLocales = definedLocales.filter((l) => !supportedLocales.includes(l));
				if (unknownLocales.length > 0) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `${name} has unsupported locales: ${unknownLocales.join(', ')}`,
						ruleId: 'valibot/error-map-all-locales',
						tip: `Add these locales to SUPPORTED_LOCALES in config, or remove them from the error map`,
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

/**
 * Extract locale keys from an ObjectExpression.
 */
function extractDefinedLocales(node: AstNode): string[] {
	const locales: string[] = [];

	const properties = node.properties as AstNode[] | undefined;
	if (!properties) return locales;

	for (const prop of properties) {
		if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') continue;

		const key = prop.key as AstNode | undefined;
		if (!key) continue;

		// Get key name
		const keyName = (key.name as string) || (key.value as string);
		if (keyName) {
			locales.push(keyName);
		}
	}

	return locales;
}

/**
 * Get supported locales from the config file.
 * Uses caching to avoid re-reading the file.
 */
function getSupportedLocales(currentFile: string): string[] {
	if (supportedLocalesCache !== null) {
		return supportedLocalesCache;
	}

	// Try to find the config file by walking up directories
	let dir = path.dirname(currentFile);
	let configFile: string | null = null;

	for (let i = 0; i < 10; i++) {
		// Max 10 levels up
		const candidate = path.join(dir, CONFIG_PATH);
		try {
			fs.accessSync(candidate, fs.constants.F_OK);
			configFile = candidate;
			break;
		} catch {
			const parent = path.dirname(dir);
			if (parent === dir) break; // Reached root
			dir = parent;
		}
	}

	// Also try relative from package root markers
	if (!configFile) {
		const packageJsonPath = findPackageJsonRoot(currentFile);
		if (packageJsonPath) {
			const candidate = path.join(path.dirname(packageJsonPath), CONFIG_PATH);
			try {
				fs.accessSync(candidate, fs.constants.F_OK);
				configFile = candidate;
			} catch {
				// Not found
			}
		}
	}

	if (!configFile) {
		// Default to common locales if config not found
		console.warn('Could not find config file for supported locales, using defaults');
		supportedLocalesCache = ['en', 'es'];
		return supportedLocalesCache;
	}

	try {
		const configContent = fs.readFileSync(configFile, 'utf-8');
		const locales = parseConfigLocales(configContent);
		supportedLocalesCache = locales;
		return locales;
	} catch (error) {
		console.warn('Error reading config file:', error);
		supportedLocalesCache = ['en', 'es'];
		return supportedLocalesCache;
	}
}

/**
 * Find package.json root by walking up directories.
 */
function findPackageJsonRoot(startPath: string): string | null {
	let dir = path.dirname(startPath);

	for (let i = 0; i < 10; i++) {
		const candidate = path.join(dir, 'package.json');
		try {
			const content = fs.readFileSync(candidate, 'utf-8');
			const pkg = JSON.parse(content);
			// Look for root package (has workspaces or name without @)
			if (pkg.workspaces || !pkg.name?.startsWith('@')) {
				return candidate;
			}
		} catch {
			// Not found, continue
		}

		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	return null;
}

/**
 * Parse SUPPORTED_LOCALES from config content.
 */
function parseConfigLocales(content: string): string[] {
	// Match: export const SUPPORTED_LOCALES = ['en', 'es'] as const;
	const match = content.match(/SUPPORTED_LOCALES\s*=\s*\[([^\]]+)\]/);
	if (!match) return ['en', 'es'];

	const localesStr = match[1];
	const locales: string[] = [];

	// Extract quoted strings
	const strRegex = /['"](\w+)['"]/g;
	let strMatch;
	while ((strMatch = strRegex.exec(localesStr)) !== null) {
		locales.push(strMatch[1]);
	}

	return locales.length > 0 ? locales : ['en', 'es'];
}

/**
 * Generate example code for missing locales.
 */
function generateLocaleExample(errorMapName: string, missingLocales: string[]): string {
	const examples = missingLocales
		.map(
			(locale) => `  ${locale}: {
    // Copy structure from 'en' and translate
    fieldName: { validationType: 'Translated message' },
  },`
		)
		.join('\n');

	return `Add to ${errorMapName}:\n${examples}`;
}

export default rule;
