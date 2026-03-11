/**
 * Rule: valibot/no-ignore-issues
 *
 * Enforces that .issues from safeParse results are handled, not ignored.
 *
 * ❌ Bad:
 *   const result = v.safeParse(Schema, input);
 *   if (!result.success) {
 *     return null;  // Issues ignored!
 *   }
 *
 * ✅ Good:
 *   const result = v.safeParse(Schema, input);
 *   if (!result.success) {
 *     console.error('Validation failed:', result.issues);
 *     throw new ValidationError(result.issues);
 *   }
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-ignore-issues',
	description: "Don't ignore .issues from safeParse results",
	categories: ['typescript', 'valibot', 'errors'],
	stages: ['lint', 'check'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return results;

			for (const declarator of declarations) {
				const id = declarator.id as AstNode | undefined;
				const init = declarator.init as AstNode | undefined;

				if (!id || !init) continue;

				const varName = id.name as string | undefined;
				if (!varName) continue;

				// Check if this is a safeParse call
				if (!isNamespaceMethodCallAny(init, namespaceAlias, ['safeParse', 'safeParseAsync'])) {
					continue;
				}

				// Search the rest of the file for usage of .issues on this variable
				const restOfFile = context.content.slice(node.end);

				// Check if .issues is ever accessed
				const issuesAccess = new RegExp(`${varName}\\.issues`, 'g');
				const hasIssuesAccess = issuesAccess.test(restOfFile);

				// Check if the result is destructured with issues
				if (id.type === 'ObjectPattern') {
					const properties = id.properties as AstNode[] | undefined;
					if (properties) {
						for (const prop of properties) {
							const key = prop.key as AstNode | undefined;
							if (key?.name === 'issues') {
								return results; // issues is destructured, assuming it's used
							}
						}
					}
				}

				if (!hasIssuesAccess) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `safeParse result '${varName}' - .issues is never accessed`,
						ruleId: 'valibot/no-ignore-issues',
						tip: 'When validation fails, log or return the issues for debugging',
						example: `if (!${varName}.success) {\n  console.error(${varName}.issues);\n}`,
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
