/**
 * Rule: valibot/import-type-only
 *
 * Enforces using `import type` for type-only imports for better tree-shaking.
 *
 * ❌ Bad:
 *   import { User } from './user';  // If User is only used as a type
 *
 * ✅ Good:
 *   import type { User } from './user';
 *   import { UserSchema } from './user';  // Schema is used at runtime
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const rule: TypeScriptRule = {
	id: 'valibot/import-type-only',
	description: 'Use import type for type-only imports for better tree-shaking',
	categories: ['typescript', 'valibot', 'imports'],
	stages: ['lint', 'check'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			// Skip if it's already a type import
			if (node.importKind === 'type') return results;

			const specifiers = node.specifiers as AstNode[] | undefined;
			if (!specifiers) return results;

			// Collect imported names
			const importedNames: string[] = [];
			for (const spec of specifiers) {
				if (spec.type === 'ImportSpecifier') {
					const local = spec.local as AstNode | undefined;
					const name = local?.name as string | undefined;
					if (name) importedNames.push(name);
				}
			}

			// Check if any imported name looks like a type (PascalCase, not ending in Schema)
			// This is a heuristic - we can't do full type analysis
			for (const name of importedNames) {
				// Skip schemas (runtime values)
				if (name.endsWith('Schema')) continue;

				// Check if it's PascalCase (likely a type)
				if (/^[A-Z][a-zA-Z]*$/.test(name)) {
					// Search file content to see if it's used as a type only
					const content = context.content;

					// Count type usages (after : or as type arg)
					const typeUsagePattern = new RegExp(`[:\\<]\\s*${name}(?:[\\s,\\>\\[\\|\\&])`, 'g');
					const typeUsages = (content.match(typeUsagePattern) || []).length;

					// Count value usages (not in type position)
					// This is approximate - look for name not preceded by : or <
					const valueUsagePattern = new RegExp(`(?<![:><])\\b${name}\\b(?!\\s*[:\\<])`, 'g');
					const valueUsages = (content.match(valueUsagePattern) || []).length;

					// Subtract the import line itself
					const adjustedValueUsages = Math.max(0, valueUsages - 1);

					if (typeUsages > 0 && adjustedValueUsages === 0) {
						results.push({
							file: context.file,
							line: node.loc.start.line,
							column: node.loc.start.column + 1,
							severity: 'info',
							message: `'${name}' appears to be used only as a type - use 'import type'`,
							ruleId: 'valibot/import-type-only',
							tip: "Use 'import type' to improve tree-shaking and make intent clear",
							example: `import type { ${name} } from '...';`,
						});
					}
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
