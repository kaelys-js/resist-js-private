/**
 * Rule: valibot/revalidate-on-change
 *
 * If modifying validated data with spread, suggest re-validating the result.
 *
 * ❌ Bad:
 *   const user = v.parse(UserSchema, input);
 *   const updated = { ...user, role: "admin" };  // Not re-validated!
 *
 * ✅ Good:
 *   const user = v.parse(UserSchema, input);
 *   const updated = v.parse(UserSchema, { ...user, role: "admin" });
 *
 * This ensures that any modifications still conform to the schema.
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const PARSE_METHODS = ['parse', 'parseAsync', 'safeParse', 'safeParseAsync'];

const rule: TypeScriptRule = {
	id: 'valibot/revalidate-on-change',
	description: 'Re-validate data after modifications to ensure schema compliance',
	categories: ['typescript', 'valibot', 'validation'],
	stages: ['lint', 'check'],
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
			walkNode(node, (child) => {
				if (child.type === 'VariableDeclaration') {
					const declarations = child.declarations as AstNode[] | undefined;
					if (!declarations) return;

					for (const decl of declarations) {
						const id = decl.id as AstNode | undefined;
						const init = decl.init as AstNode | undefined;

						if (!id || !init) continue;

						if (isNamespaceMethodCallAny(init, namespaceAlias, PARSE_METHODS)) {
							const name = id.name as string | undefined;
							if (name) {
								parsedVariables.add(name);
							}
						}

						// Also track .output from safeParse
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

			if (parsedVariables.size === 0) return results;

			// Second pass: find spread operations using parsed variables
			walkNode(node, (child) => {
				if (child.type === 'VariableDeclaration') {
					const declarations = child.declarations as AstNode[] | undefined;
					if (!declarations) return;

					for (const decl of declarations) {
						const id = decl.id as AstNode | undefined;
						const init = decl.init as AstNode | undefined;

						if (!id || !init) continue;

						// Skip if the init itself is a parse call (already validated)
						if (isNamespaceMethodCallAny(init, namespaceAlias, PARSE_METHODS)) continue;

						// Check for object expression with spread of parsed variable
						if (init.type === 'ObjectExpression') {
							const properties = init.properties as AstNode[] | undefined;
							if (!properties) continue;

							for (const prop of properties) {
								if (prop.type === 'SpreadElement') {
									const argument = prop.argument as AstNode | undefined;
									const spreadName = argument?.name as string | undefined;

									if (spreadName && parsedVariables.has(spreadName)) {
										// Check if there are additional properties (modifications)
										const hasModifications = properties.some(
											(p) => p.type === 'Property' || p.type === 'ObjectProperty'
										);

										if (hasModifications) {
											const newVarName = id.name as string | undefined;

											results.push({
												file: context.file,
												line: child.loc.start.line,
												column: child.loc.start.column + 1,
												severity: 'warning',
												message: `Spreading parsed data '${spreadName}' with modifications - consider re-validating`,
												ruleId: 'valibot/revalidate-on-change',
												tip: 'Wrap the spread expression in v.parse() to ensure modifications are valid',
												example: `const ${newVarName || 'updated'} = ${namespaceAlias}.parse(Schema, { ...${spreadName}, /* changes */ });`,
											});
										}
									}
								}
							}
						}
					}
				}
			});

			return results;
		},
	},

	async check() {
		return [];
	},
};

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
