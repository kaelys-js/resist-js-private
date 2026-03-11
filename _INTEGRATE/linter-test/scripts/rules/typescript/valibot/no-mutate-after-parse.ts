/**
 * Rule: valibot/no-mutate-after-parse
 *
 * Disallows mutation of variables that hold parsed/validated data.
 *
 * Mutating validated data bypasses the schema and can introduce invalid state.
 *
 * ❌ Bad:
 *   const user = v.parse(UserSchema, input);
 *   user.name = "hacked";           // Mutation!
 *   user.role = "admin";            // Security issue!
 *   user.permissions.push("admin"); // Array mutation!
 *
 * ✅ Good:
 *   const user = v.parse(UserSchema, input);
 *   const updated = { ...user, name: "new name" };  // Create new object
 *   const validatedUpdate = v.parse(UserSchema, updated);  // Re-validate
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const PARSE_METHODS = ['parse', 'parseAsync', 'safeParse', 'safeParseAsync'];

// Mutating array methods
const MUTATING_METHODS = [
	'push',
	'pop',
	'shift',
	'unshift',
	'splice',
	'sort',
	'reverse',
	'fill',
	'copyWithin',
];

const rule: TypeScriptRule = {
	id: 'valibot/no-mutate-after-parse',
	description: 'Disallow mutation of parsed/validated data',
	categories: ['typescript', 'valibot', 'immutability', 'security'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		Program(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			// Track variables that hold parsed data
			const parsedVariables = new Set<string>();

			// First pass: find all variables assigned from parse()
			findParsedVariables(node, namespaceAlias, parsedVariables, context);

			// Second pass: find mutations of those variables
			findMutations(node, parsedVariables, results, context);

			return results;
		},
	},

	async check() {
		return [];
	},
};

function findParsedVariables(
	node: AstNode,
	namespaceAlias: string,
	parsedVariables: Set<string>,
	context: VisitorContext
): void {
	walkNode(node, (child) => {
		if (child.type === 'VariableDeclaration') {
			const declarations = child.declarations as AstNode[] | undefined;
			if (!declarations) return;

			for (const decl of declarations) {
				const id = decl.id as AstNode | undefined;
				const init = decl.init as AstNode | undefined;

				if (!id || !init) continue;

				// Check if init is a parse call
				if (isNamespaceMethodCallAny(init, namespaceAlias, PARSE_METHODS)) {
					const name = id.name as string | undefined;
					if (name) {
						parsedVariables.add(name);
					}
				}

				// Check for destructured safeParse: const { output } = v.safeParse(...)
				if (id.type === 'ObjectPattern' && isNamespaceMethodCallAny(init, namespaceAlias, ['safeParse', 'safeParseAsync'])) {
					const properties = id.properties as AstNode[] | undefined;
					if (properties) {
						for (const prop of properties) {
							const key = prop.key as AstNode | undefined;
							if (key?.name === 'output') {
								const value = prop.value as AstNode | undefined;
								const outputName = (value?.name as string) || (key.name as string);
								if (outputName) {
									parsedVariables.add(outputName);
								}
							}
						}
					}
				}

				// Check for: const data = result.output where result is from safeParse
				if (init.type === 'MemberExpression') {
					const property = init.property as AstNode | undefined;
					if (property?.name === 'output') {
						const name = id.name as string | undefined;
						if (name) {
							parsedVariables.add(name);
						}
					}
				}
			}
		}
	});
}

function findMutations(
	node: AstNode,
	parsedVariables: Set<string>,
	results: LintResult[],
	context: VisitorContext
): void {
	if (parsedVariables.size === 0) return;

	walkNode(node, (child) => {
		// Check for property assignment: user.name = "value"
		if (child.type === 'AssignmentExpression') {
			const left = child.left as AstNode | undefined;
			if (left?.type === 'MemberExpression') {
				const object = left.object as AstNode | undefined;
				const objectName = object?.name as string | undefined;

				if (objectName && parsedVariables.has(objectName)) {
					const property = left.property as AstNode | undefined;
					const propName = (property?.name as string) || 'property';

					results.push({
						file: context.file,
						line: child.loc.start.line,
						column: child.loc.start.column + 1,
						severity: 'error',
						message: `Mutation of parsed data: '${objectName}.${propName}' - this bypasses validation`,
						ruleId: 'valibot/no-mutate-after-parse',
						tip: 'Create a new object and re-validate instead of mutating',
						example: `const updated = { ...${objectName}, ${propName}: newValue };\nconst validated = v.parse(Schema, updated);`,
					});
				}

				// Check for nested mutation: user.address.city = "value"
				if (object?.type === 'MemberExpression') {
					const rootObject = (object.object as AstNode)?.name as string | undefined;
					if (rootObject && parsedVariables.has(rootObject)) {
						results.push({
							file: context.file,
							line: child.loc.start.line,
							column: child.loc.start.column + 1,
							severity: 'error',
							message: `Nested mutation of parsed data: '${rootObject}...' - this bypasses validation`,
							ruleId: 'valibot/no-mutate-after-parse',
							tip: 'Create a new object with spread operator and re-validate',
						});
					}
				}
			}
		}

		// Check for mutating method calls: user.items.push(...)
		if (child.type === 'CallExpression') {
			const callee = child.callee as AstNode | undefined;
			if (callee?.type === 'MemberExpression') {
				const property = callee.property as AstNode | undefined;
				const methodName = property?.name as string | undefined;

				if (methodName && MUTATING_METHODS.includes(methodName)) {
					const object = callee.object as AstNode | undefined;

					// Check if object is a member of a parsed variable: user.items.push()
					if (object?.type === 'MemberExpression') {
						const rootObject = (object.object as AstNode)?.name as string | undefined;
						if (rootObject && parsedVariables.has(rootObject)) {
							const arrayProp = (object.property as AstNode)?.name as string | undefined;

							results.push({
								file: context.file,
								line: child.loc.start.line,
								column: child.loc.start.column + 1,
								severity: 'error',
								message: `Mutating method '${methodName}()' on parsed data: '${rootObject}.${arrayProp}'`,
								ruleId: 'valibot/no-mutate-after-parse',
								tip: `Use immutable alternative: [...${rootObject}.${arrayProp}, newItem] instead of ${methodName}()`,
							});
						}
					}

					// Direct mutation: parsedArray.push()
					const directObject = object?.name as string | undefined;
					if (directObject && parsedVariables.has(directObject)) {
						results.push({
							file: context.file,
							line: child.loc.start.line,
							column: child.loc.start.column + 1,
							severity: 'error',
							message: `Mutating method '${methodName}()' on parsed data: '${directObject}'`,
							ruleId: 'valibot/no-mutate-after-parse',
							tip: `Use immutable alternative and re-validate after changes`,
						});
					}
				}
			}
		}

		// Check for delete: delete user.field
		if (child.type === 'UnaryExpression' && child.operator === 'delete') {
			const argument = child.argument as AstNode | undefined;
			if (argument?.type === 'MemberExpression') {
				const object = argument.object as AstNode | undefined;
				const objectName = object?.name as string | undefined;

				if (objectName && parsedVariables.has(objectName)) {
					results.push({
						file: context.file,
						line: child.loc.start.line,
						column: child.loc.start.column + 1,
						severity: 'error',
						message: `Delete on parsed data: '${objectName}' - this bypasses validation`,
						ruleId: 'valibot/no-mutate-after-parse',
						tip: 'Create a new object without the property instead of deleting',
					});
				}
			}
		}
	});
}

function walkNode(node: unknown, callback: (node: AstNode) => void): void {
	if (!node || typeof node !== 'object') return;

	const astNode = node as AstNode;

	if (astNode.type) {
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
