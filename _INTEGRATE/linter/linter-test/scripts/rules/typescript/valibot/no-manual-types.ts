/**
 * Rule: valibot/no-manual-types
 *
 * Disallows manually written type literals in variable/function annotations.
 *
 * ❌ Bad:
 *   const user: { name: string; email: string } = { ... };
 *   function process(data: { id: number }): void { ... }
 *
 * ✅ Good:
 *   type User = v.InferOutput<typeof UserSchema>;
 *   const user: User = { ... };
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getTypeAnnotation } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

function hasManualObjectType(typeAnnotation: AstNode | undefined): boolean {
	if (!typeAnnotation) return false;

	// Direct object literal
	if (typeAnnotation.type === 'TSTypeLiteral') return true;

	// Check nested in union/intersection
	if (typeAnnotation.type === 'TSUnionType' || typeAnnotation.type === 'TSIntersectionType') {
		const types = typeAnnotation.types as AstNode[] | undefined;
		if (types) {
			return types.some((t) => hasManualObjectType(t));
		}
	}

	// Check if it's TSTypeAnnotation wrapper
	const innerType = typeAnnotation.typeAnnotation as AstNode | undefined;
	if (innerType) {
		return hasManualObjectType(innerType);
	}

	return false;
}

const rule: TypeScriptRule = {
	id: 'valibot/no-manual-types',
	description: 'Disallow manually written type literals - use Valibot-derived types',
	categories: ['typescript', 'valibot', 'types'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return results;

			for (const declarator of declarations) {
				const id = declarator.id as AstNode | undefined;
				if (!id) continue;

				const typeAnnotationNode = id.typeAnnotation as AstNode | undefined;
				if (!typeAnnotationNode) continue;

				if (hasManualObjectType(typeAnnotationNode)) {
					const name = (id.name as string) || 'variable';
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `Variable '${name}' uses inline object type - use a Valibot-derived type alias`,
						ruleId: 'valibot/no-manual-types',
						tip: 'Define a schema and type alias, then use that type',
						example: `const ${name}Schema = v.strictObject({ ... });\ntype ${capitalize(name)} = v.InferOutput<typeof ${name}Schema>;\nconst ${name}: ${capitalize(name)} = ...`,
					});
				}
			}

			return results;
		},

		FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			// Check parameters
			const params = node.params as AstNode[] | undefined;
			if (params) {
				for (const param of params) {
					const typeAnnotationNode = param.typeAnnotation as AstNode | undefined;
					if (hasManualObjectType(typeAnnotationNode)) {
						const paramName = (param.name as string) || 'param';
						results.push({
							file: context.file,
							line: param.loc.start.line,
							column: param.loc.start.column + 1,
							severity: 'error',
							message: `Parameter '${paramName}' uses inline object type - use a Valibot-derived type`,
							ruleId: 'valibot/no-manual-types',
							tip: 'Define a schema and derive a type for the parameter',
						});
					}
				}
			}

			// Check return type
			const returnType = node.returnType as AstNode | undefined;
			if (hasManualObjectType(returnType)) {
				const funcId = node.id as AstNode | undefined;
				const funcName = (funcId?.name as string) || 'function';
				results.push({
					file: context.file,
					line: returnType!.loc.start.line,
					column: returnType!.loc.start.column + 1,
					severity: 'error',
					message: `Function '${funcName}' has inline object return type - use a Valibot-derived type`,
					ruleId: 'valibot/no-manual-types',
					tip: 'Define a schema and derive a type for the return value',
				});
			}

			return results;
		},

		ClassDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const body = node.body as AstNode | undefined;
			if (!body) return results;

			const bodyItems = body.body as AstNode[] | undefined;
			if (!bodyItems) return results;

			for (const item of bodyItems) {
				if (item.type === 'PropertyDefinition' || item.type === 'ClassProperty') {
					const typeAnnotationNode = item.typeAnnotation as AstNode | undefined;
					if (hasManualObjectType(typeAnnotationNode)) {
						const key = item.key as AstNode | undefined;
						const propName = (key?.name as string) || 'property';
						results.push({
							file: context.file,
							line: item.loc.start.line,
							column: item.loc.start.column + 1,
							severity: 'error',
							message: `Property '${propName}' uses inline object type - use a Valibot-derived type`,
							ruleId: 'valibot/no-manual-types',
							tip: 'Define a schema and derive a type for the property',
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

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export default rule;
