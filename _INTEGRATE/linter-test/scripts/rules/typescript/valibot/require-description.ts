/**
 * Rule: valibot/require-description
 *
 * Enforces that schemas have descriptions for documentation.
 *
 * ❌ Bad:
 *   const UserSchema = v.object({ ... });
 *
 * ✅ Good:
 *   const UserSchema = v.pipe(
 *     v.object({ ... }),
 *     v.description('A user account in the system')
 *   );
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Schema-creating methods that should have descriptions
const SCHEMA_METHODS = [
	'object',
	'strictObject',
	'array',
	'tuple',
	'strictTuple',
	'record',
	'map',
	'set',
	'union',
	'variant',
	'intersect',
];

const rule: TypeScriptRule = {
	id: 'valibot/require-description',
	description: 'Schemas should have descriptions for documentation',
	categories: ['typescript', 'valibot', 'docs'],
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
				if (!name) continue;

				// Only check exported schemas (public API)
				// This is a heuristic - we'll check if name ends with Schema
				if (!name.endsWith('Schema')) continue;

				// Check if init is a complex schema that should have description
				const methodName = getNamespaceMethodName(init, namespaceAlias);

				if (methodName && SCHEMA_METHODS.includes(methodName)) {
					// Check if it's wrapped in pipe with description
					const hasDescription = checkHasDescription(init, namespaceAlias, context);

					if (!hasDescription) {
						results.push({
							file: context.file,
							line: node.loc.start.line,
							column: node.loc.start.column + 1,
							severity: 'info',
							message: `Schema '${name}' should have a description for documentation`,
							ruleId: 'valibot/require-description',
							tip: "Wrap in v.pipe() with v.description('...') for self-documenting schemas",
							example: `const ${name} = v.pipe(\n  v.${methodName}({ ... }),\n  v.description('Description here')\n);`,
						});
					}
				}

				// Also check if it's already a pipe
				if (methodName === 'pipe') {
					const hasDescription = checkPipeHasDescription(init, namespaceAlias);
					if (!hasDescription) {
						results.push({
							file: context.file,
							line: node.loc.start.line,
							column: node.loc.start.column + 1,
							severity: 'info',
							message: `Schema '${name}' should include v.description() in pipe`,
							ruleId: 'valibot/require-description',
							tip: "Add v.description('...') to the pipe for documentation",
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

/**
 * Check if a schema call has a description wrapper
 */
function checkHasDescription(
	node: AstNode,
	namespaceAlias: string,
	_context: VisitorContext
): boolean {
	// For now, we can't easily check if this is wrapped in a parent pipe
	// So we'll just return false for direct schema calls
	return false;
}

/**
 * Check if a pipe call includes description
 */
function checkPipeHasDescription(node: AstNode, namespaceAlias: string): boolean {
	const args = node.arguments as AstNode[] | undefined;
	if (!args) return false;

	for (const arg of args) {
		if (arg.type === 'CallExpression') {
			const methodName = getNamespaceMethodName(arg, namespaceAlias);
			if (methodName === 'description') {
				return true;
			}
		}
	}

	return false;
}

export default rule;
