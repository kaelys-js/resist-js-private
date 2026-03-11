/**
 * Rule: valibot/handle-parse-errors
 *
 * Enforces that v.safeParse() results check .success before accessing .output.
 *
 * ❌ Bad:
 *   const result = v.safeParse(Schema, input);
 *   const data = result.output; // May be undefined if !success
 *
 * ✅ Good:
 *   const result = v.safeParse(Schema, input);
 *   if (result.success) {
 *     const data = result.output;
 *   } else {
 *     // Handle result.issues
 *   }
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/handle-parse-errors',
	description: 'Check .success before accessing .output on safeParse results',
	categories: ['typescript', 'valibot', 'errors'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		MemberExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const property = node.property as AstNode | undefined;
			const propertyName = property?.name as string | undefined;

			// Check for .output access
			if (propertyName === 'output') {
				const object = node.object as AstNode | undefined;

				// Check if object is a safeParse call
				if (object?.type === 'CallExpression') {
					if (isNamespaceMethodCallAny(object, namespaceAlias, ['safeParse', 'safeParseAsync'])) {
						results.push({
							file: context.file,
							line: node.loc.start.line,
							column: node.loc.start.column + 1,
							severity: 'error',
							message: 'Accessing .output directly on safeParse result - check .success first',
							ruleId: 'valibot/handle-parse-errors',
							tip: 'safeParse returns { success, output?, issues? } - output is only present when success is true',
							example: `const result = ${namespaceAlias}.safeParse(Schema, input);\nif (result.success) {\n  // result.output is safely typed here\n}`,
						});
					}
				}

				// Also check for identifier that might be a safeParse result
				// This is heuristic - we check if variable name suggests it's a result
				if (object?.type === 'Identifier') {
					const objectName = (object.name as string)?.toLowerCase() || '';
					if (
						objectName.includes('result') ||
						objectName.includes('parsed') ||
						objectName.includes('validated')
					) {
						// This is a warning since we can't be certain
						results.push({
							file: context.file,
							line: node.loc.start.line,
							column: node.loc.start.column + 1,
							severity: 'info',
							message: `Accessing .output on '${object.name}' - ensure .success is checked first`,
							ruleId: 'valibot/handle-parse-errors',
							tip: 'If this is a safeParse result, check .success before accessing .output',
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
