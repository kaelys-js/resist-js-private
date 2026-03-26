/**
 * Rule: valibot/no-unsafe-parse
 *
 * Prefer v.safeParse() over v.parse() for graceful error handling.
 *
 * v.parse() throws on invalid input, while v.safeParse() returns a result object.
 *
 * ❌ Bad (throws on invalid input):
 *   const data = v.parse(Schema, input);
 *
 * ✅ Good (handles errors gracefully):
 *   const result = v.safeParse(Schema, input);
 *   if (result.success) {
 *     const data = result.output;
 *   } else {
 *     // Handle result.issues
 *   }
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-unsafe-parse',
	description: 'Prefer v.safeParse() over v.parse() for graceful error handling',
	categories: ['typescript', 'valibot', 'errors'],
	stages: ['lint', 'check'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			if (isNamespaceMethodCall(node, namespaceAlias, 'parse')) {
				// Check if it's wrapped in try-catch (heuristic)
				// We can't easily determine this from AST context, so we just warn

				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: "v.parse() throws on invalid input - consider v.safeParse() for graceful handling",
					ruleId: 'valibot/no-unsafe-parse',
					tip: 'safeParse() returns { success, output, issues } instead of throwing',
					example: `const result = ${namespaceAlias}.safeParse(Schema, input);\nif (result.success) { /* use result.output */ }`,
				});
			}

			// Also check for parseAsync
			if (isNamespaceMethodCall(node, namespaceAlias, 'parseAsync')) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: "v.parseAsync() throws on invalid input - consider v.safeParseAsync()",
					ruleId: 'valibot/no-unsafe-parse',
					tip: 'safeParseAsync() returns a result object instead of throwing',
					example: `const result = await ${namespaceAlias}.safeParseAsync(Schema, input);`,
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
