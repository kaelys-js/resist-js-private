/**
 * Rule: valibot/require-min-length
 *
 * String and array schemas should have minLength to prevent empty values.
 *
 * ❌ Bad:
 *   const NameSchema = v.string();  // Allows empty string ""
 *   const ItemsSchema = v.array(v.string());  // Allows empty array []
 *
 * ✅ Good:
 *   const NameSchema = v.pipe(v.string(), v.minLength(1));
 *   const ItemsSchema = v.pipe(v.array(v.string()), v.minLength(1));
 *
 * Note: Use v.optional() explicitly if empty is intentionally allowed.
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/require-min-length',
	description: 'String/array schemas should have minLength to prevent empty values',
	categories: ['typescript', 'valibot', 'strict'],
	stages: ['lint', 'check'],
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
				if (!name || !name.endsWith('Schema')) continue;

				// Check if it's a bare string() or array() without pipe
				const methodName = getNamespaceMethodName(init, namespaceAlias);

				if (methodName === 'string') {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `Schema '${name}' allows empty strings - consider adding minLength(1)`,
						ruleId: 'valibot/require-min-length',
						tip: 'Use v.pipe(v.string(), v.minLength(1)) to require non-empty strings',
						example: `const ${name} = ${namespaceAlias}.pipe(${namespaceAlias}.string(), ${namespaceAlias}.minLength(1));`,
					});
				}

				if (methodName === 'array') {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'info',
						message: `Schema '${name}' allows empty arrays - consider adding minLength(1) if needed`,
						ruleId: 'valibot/require-min-length',
						tip: 'Use v.pipe(v.array(...), v.minLength(1)) to require non-empty arrays',
					});
				}

				// Check if it's a pipe that starts with string/array but has no minLength
				if (methodName === 'pipe') {
					const pipeArgs = init.arguments as AstNode[] | undefined;
					if (!pipeArgs || pipeArgs.length === 0) continue;

					const firstArg = pipeArgs[0];
					const firstMethod = getNamespaceMethodName(firstArg, namespaceAlias);

					if (firstMethod === 'string' || firstMethod === 'array') {
						// Check if any arg is minLength
						let hasMinLength = false;
						for (const arg of pipeArgs) {
							const argMethod = getNamespaceMethodName(arg, namespaceAlias);
							if (argMethod === 'minLength' || argMethod === 'nonEmpty') {
								hasMinLength = true;
								break;
							}
						}

						if (!hasMinLength && firstMethod === 'string') {
							results.push({
								file: context.file,
								line: node.loc.start.line,
								column: node.loc.start.column + 1,
								severity: 'info',
								message: `Schema '${name}' pipe has no minLength - empty strings allowed`,
								ruleId: 'valibot/require-min-length',
								tip: 'Add v.minLength(1) or v.nonEmpty() to the pipe',
							});
						}
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
