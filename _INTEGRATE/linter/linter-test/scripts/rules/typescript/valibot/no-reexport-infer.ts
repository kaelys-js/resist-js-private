/**
 * Rule: valibot/no-reexport-infer
 *
 * Don't re-export v.InferOutput. Export the concrete type instead.
 *
 * ❌ Bad:
 *   export type { InferOutput } from 'valibot';
 *   export { InferOutput as ValibotInfer } from 'valibot';
 *
 * ✅ Good:
 *   // Export concrete types derived from schemas
 *   export type User = v.InferOutput<typeof UserSchema>;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const VALIBOT_MODULE = 'valibot';

const INFER_EXPORTS = ['InferOutput', 'InferInput', 'Output', 'Input'];

const rule: TypeScriptRule = {
	id: 'valibot/no-reexport-infer',
	description: "Don't re-export v.InferOutput; export concrete types instead",
	categories: ['typescript', 'valibot', 'exports'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const source = (node.source as { value?: string })?.value;
			if (source !== VALIBOT_MODULE) return results;

			const specifiers = node.specifiers as AstNode[] | undefined;
			if (!specifiers) return results;

			for (const spec of specifiers) {
				const imported = spec.local as AstNode | undefined;
				const importedName = imported?.name as string | undefined;

				if (importedName && INFER_EXPORTS.includes(importedName)) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `Don't re-export '${importedName}' from valibot - export concrete types instead`,
						ruleId: 'valibot/no-reexport-infer',
						tip: 'Define and export concrete types derived from your schemas',
						example: `export type User = v.InferOutput<typeof UserSchema>;`,
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
