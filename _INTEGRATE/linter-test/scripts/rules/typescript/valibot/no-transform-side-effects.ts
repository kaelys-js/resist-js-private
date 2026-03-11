/**
 * Rule: valibot/no-transform-side-effects
 *
 * Warns about potential side effects in v.transform() functions.
 *
 * Transform functions should be pure - they should only transform data,
 * not produce side effects like logging, API calls, or mutations.
 *
 * ❌ Bad:
 *   v.transform(val => {
 *     console.log(val);        // Side effect: logging
 *     fetch('/api/log', ...);  // Side effect: network
 *     globalState.push(val);   // Side effect: mutation
 *     return val;
 *   });
 *
 * ✅ Good:
 *   v.transform(val => val.trim().toLowerCase());  // Pure transformation
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Patterns that indicate side effects
const SIDE_EFFECT_PATTERNS = [
	/\bconsole\./,
	/\bfetch\(/,
	/\baxios\./,
	/\blocalStorage\./,
	/\bsessionStorage\./,
	/\bdocument\./,
	/\bwindow\./,
	/\bprocess\.env/,
	/\.push\(/,
	/\.pop\(/,
	/\.shift\(/,
	/\.unshift\(/,
	/\.splice\(/,
	/\bdelete\s+/,
	/\bthrow\s+new\s+Error/,  // May want to allow this one
	/\bawait\s+/,  // Async in transform is suspicious
];

const rule: TypeScriptRule = {
	id: 'valibot/no-transform-side-effects',
	description: 'v.transform() functions should be pure - no side effects',
	categories: ['typescript', 'valibot', 'purity'],
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

			if (!isNamespaceMethodCall(node, namespaceAlias, 'transform')) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length === 0) return results;

			const transformFn = args[0];
			if (
				transformFn.type !== 'ArrowFunctionExpression' &&
				transformFn.type !== 'FunctionExpression'
			) {
				return results;
			}

			const fnBody = context.content.slice(transformFn.start, transformFn.end);

			for (const pattern of SIDE_EFFECT_PATTERNS) {
				if (pattern.test(fnBody)) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: 'v.transform() may contain side effects - transforms should be pure',
						ruleId: 'valibot/no-transform-side-effects',
						tip: 'Transform functions should only transform data, not log, fetch, or mutate state',
					});
					break; // Only report once per transform
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
