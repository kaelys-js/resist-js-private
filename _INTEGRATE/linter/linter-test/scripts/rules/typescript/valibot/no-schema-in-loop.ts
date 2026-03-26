/**
 * Rule: valibot/no-schema-in-loop
 *
 * Warns about creating schemas inside loops, which is inefficient.
 *
 * ❌ Bad:
 *   for (const item of items) {
 *     const Schema = v.strictObject({ name: v.string() });  // Created every iteration!
 *     const validated = v.parse(Schema, item);
 *   }
 *
 * ✅ Good:
 *   const Schema = v.strictObject({ name: v.string() });  // Created once
 *   for (const item of items) {
 *     const validated = v.parse(Schema, item);
 *   }
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const SCHEMA_METHODS = [
	'object',
	'strictObject',
	'looseObject',
	'array',
	'tuple',
	'strictTuple',
	'union',
	'variant',
	'intersect',
	'record',
	'map',
	'set',
	'pipe',
];

const LOOP_TYPES = [
	'ForStatement',
	'ForInStatement',
	'ForOfStatement',
	'WhileStatement',
	'DoWhileStatement',
];

const rule: TypeScriptRule = {
	id: 'valibot/no-schema-in-loop',
	description: "Don't create schemas inside loops - define them outside for efficiency",
	categories: ['typescript', 'valibot', 'performance'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		ForStatement(node: AstNode, context: VisitorContext): LintResult[] {
			return checkLoopBody(node, context);
		},

		ForInStatement(node: AstNode, context: VisitorContext): LintResult[] {
			return checkLoopBody(node, context);
		},

		ForOfStatement(node: AstNode, context: VisitorContext): LintResult[] {
			return checkLoopBody(node, context);
		},

		WhileStatement(node: AstNode, context: VisitorContext): LintResult[] {
			return checkLoopBody(node, context);
		},
	},

	async check() {
		return [];
	},
};

function checkLoopBody(loopNode: AstNode, context: VisitorContext): LintResult[] {
	const results: LintResult[] = [];

	const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
	if (!namespaceAlias) return results;

	const body = loopNode.body as AstNode | undefined;
	if (!body) return results;

	// Walk the loop body looking for schema definitions
	walkNode(body, (node) => {
		if (node.type === 'VariableDeclaration') {
			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return;

			for (const decl of declarations) {
				const id = decl.id as AstNode | undefined;
				const init = decl.init as AstNode | undefined;

				if (!id || !init) continue;

				const methodName = getNamespaceMethodName(init, namespaceAlias);

				if (methodName && SCHEMA_METHODS.includes(methodName)) {
					const varName = (id.name as string) || 'schema';

					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'warning',
						message: `Schema '${varName}' is created inside a loop - move it outside for efficiency`,
						ruleId: 'valibot/no-schema-in-loop',
						tip: 'Schemas are immutable - define once outside the loop and reuse',
					});
				}
			}
		}
	});

	return results;
}

function walkNode(node: unknown, callback: (node: AstNode) => void): void {
	if (!node || typeof node !== 'object') return;

	const astNode = node as AstNode;

	if (astNode.type) {
		// Don't recurse into nested functions/loops
		if (
			astNode.type === 'FunctionDeclaration' ||
			astNode.type === 'FunctionExpression' ||
			astNode.type === 'ArrowFunctionExpression'
		) {
			return;
		}

		callback(astNode);
	}

	for (const key of Object.keys(astNode)) {
		const value = astNode[key];

		if (Array.isArray(value)) {
			for (const item of value) {
				walkNode(item, callback);
			}
		} else if (value && typeof value === 'object') {
			walkNode(value, callback);
		}
	}
}

export default rule;
