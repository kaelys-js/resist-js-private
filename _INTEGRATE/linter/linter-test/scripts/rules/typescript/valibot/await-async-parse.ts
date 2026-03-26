/**
 * Rule: valibot/await-async-parse
 *
 * Enforces that v.parseAsync() and v.safeParseAsync() are awaited.
 *
 * ❌ Bad:
 *   const result = v.safeParseAsync(Schema, input);  // Missing await!
 *   const data = v.parseAsync(Schema, input);  // Missing await!
 *
 * ✅ Good:
 *   const result = await v.safeParseAsync(Schema, input);
 *   const data = await v.parseAsync(Schema, input);
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const ASYNC_METHODS = ['parseAsync', 'safeParseAsync'];

const rule: TypeScriptRule = {
	id: 'valibot/await-async-parse',
	description: 'v.parseAsync() and v.safeParseAsync() must be awaited',
	categories: ['typescript', 'valibot', 'async'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			if (!isNamespaceMethodCallAny(node, namespaceAlias, ASYNC_METHODS)) return results;

			// Check if this call is inside an AwaitExpression
			// We need to look at the characters before this node
			const beforeNode = context.content.slice(Math.max(0, node.start - 10), node.start);
			const isAwaited = /await\s*$/.test(beforeNode);

			// Also check if it's being returned (return await is often omitted intentionally)
			const beforeMore = context.content.slice(Math.max(0, node.start - 20), node.start);
			const isReturned = /return\s*$/.test(beforeMore) || /return\s+await\s*$/.test(beforeMore);

			// Check if it's in a .then() chain
			const afterNode = context.content.slice(node.end, Math.min(context.content.length, node.end + 10));
			const hasThen = /^\s*\.then/.test(afterNode);

			if (!isAwaited && !isReturned && !hasThen) {
				const methodName = context.content.slice(node.start, node.end).match(/\.(parseAsync|safeParseAsync)/)?.[1];

				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: `${methodName || 'Async parse'}() must be awaited`,
					ruleId: 'valibot/await-async-parse',
					tip: 'Add await before the call or handle the Promise with .then()',
					example: `await ${namespaceAlias}.${methodName || 'safeParseAsync'}(Schema, input)`,
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
