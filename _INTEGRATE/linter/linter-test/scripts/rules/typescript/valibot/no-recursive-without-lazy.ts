/**
 * Rule: valibot/no-recursive-without-lazy
 *
 * Enforces use of v.lazy() for recursive schemas to prevent stack overflow.
 *
 * ❌ Bad:
 *   const TreeSchema = v.object({
 *     value: v.string(),
 *     children: v.array(TreeSchema),  // Direct reference causes issues
 *   });
 *
 * ✅ Good:
 *   const TreeSchema: v.GenericSchema = v.object({
 *     value: v.string(),
 *     children: v.array(v.lazy(() => TreeSchema)),
 *   });
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/no-recursive-without-lazy',
	description: 'Recursive schemas must use v.lazy() to prevent stack overflow',
	categories: ['typescript', 'valibot', 'performance'],
	stages: ['lint', 'check', 'ci'],
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

				const schemaName = id.name as string | undefined;
				if (!schemaName) continue;

				// Only check schema definitions
				if (!schemaName.endsWith('Schema')) continue;

				// Get the schema definition text
				const schemaText = context.content.slice(init.start, init.end);

				// Check if schema references itself without v.lazy()
				const selfReference = new RegExp(`\\b${schemaName}\\b`, 'g');
				const lazyWrapped = new RegExp(`\\.lazy\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*${schemaName}`, 'g');

				const selfRefs = schemaText.match(selfReference) || [];
				const lazyRefs = schemaText.match(lazyWrapped) || [];

				// If there are self-references but not all are wrapped in lazy
				if (selfRefs.length > lazyRefs.length) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `Schema '${schemaName}' references itself without v.lazy() - this may cause stack overflow`,
						ruleId: 'valibot/no-recursive-without-lazy',
						tip: 'Wrap recursive references in v.lazy(() => Schema)',
						example: `${namespaceAlias}.lazy(() => ${schemaName})`,
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
