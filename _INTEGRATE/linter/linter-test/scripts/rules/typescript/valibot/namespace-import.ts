/**
 * Rule: valibot/namespace-import
 *
 * Enforces that Valibot is imported as a namespace (import * as v from 'valibot').
 *
 * ❌ Bad:
 *   import { object, string } from 'valibot';
 *   import valibot from 'valibot';
 *
 * ✅ Good:
 *   import * as v from 'valibot';
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/namespace-import',
	description: 'Valibot must be imported as a namespace: import * as v from "valibot"',
	categories: ['typescript', 'valibot', 'imports'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		ImportDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const source = (node.source as { value?: string })?.value;
			if (source !== VALIBOT_MODULE) return results;

			const specifiers = node.specifiers as AstNode[] | undefined;
			if (!specifiers || specifiers.length === 0) return results;

			let hasNamespaceImport = false;
			let hasNamedImports = false;
			let hasDefaultImport = false;

			for (const spec of specifiers) {
				if (spec.type === 'ImportNamespaceSpecifier') {
					hasNamespaceImport = true;
					// Check if the alias is 'v'
					const local = spec.local as AstNode | undefined;
					const alias = local?.name as string | undefined;
					if (alias && alias !== 'v') {
						results.push({
							file: context.file,
							line: node.loc.start.line,
							column: node.loc.start.column + 1,
							severity: 'warning',
							message: `Valibot namespace import uses '${alias}' instead of conventional 'v'`,
							ruleId: 'valibot/namespace-import',
							tip: "Use 'v' as the namespace alias for consistency",
							example: "import * as v from 'valibot';",
						});
					}
				} else if (spec.type === 'ImportSpecifier') {
					hasNamedImports = true;
				} else if (spec.type === 'ImportDefaultSpecifier') {
					hasDefaultImport = true;
				}
			}

			if (hasNamedImports) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: 'Valibot must be imported as a namespace, not with named imports',
					ruleId: 'valibot/namespace-import',
					tip: 'Use namespace import for better tree-shaking and consistency',
					example: "import * as v from 'valibot';",
				});
			}

			if (hasDefaultImport && !hasNamespaceImport) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: 'Valibot does not have a default export; use namespace import',
					ruleId: 'valibot/namespace-import',
					tip: 'Use namespace import instead',
					example: "import * as v from 'valibot';",
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
