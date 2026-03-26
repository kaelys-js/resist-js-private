/**
 * Rule: valibot/require-type-annotation
 *
 * Enforces that all variable declarations and function signatures use
 * type annotations derived from Valibot schemas (via type aliases).
 *
 * The pattern is:
 *   1. Define a schema: const UserSchema = v.object({ ... })
 *   2. Derive a type: type User = v.InferOutput<typeof UserSchema>
 *   3. Use the type: const user: User = { ... }
 *
 * This rule does NOT require inline v.InferOutput<> usage.
 * It requires that types come from Valibot-derived type aliases.
 *
 * Checks:
 *   - const/let declarations
 *   - Destructuring patterns
 *   - Function parameters
 *   - Function return types
 *   - Arrow function parameters and returns
 *   - Class properties
 *   - Class method parameters and returns
 *
 * Skips:
 *   - Schema definitions (variables ending with Schema/schema)
 *   - Type alias declarations (they define types)
 *   - Loop iteration variables (for-of, for-in)
 *   - Catch clause variables
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../types.js';
import { getTypeAnnotation, typeReferencesModule } from '../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Common TypeScript types that should be replaced with Valibot types
const COMMON_TS_TYPES = [
	// Primitives
	'string',
	'number',
	'boolean',
	'bigint',
	'symbol',
	'undefined',
	'null',
	'void',
	'never',

	// Objects
	'object',
	'Object',
	'Function',

	// Collections
	'Array',
	'Record',
	'Map',
	'Set',
	'WeakMap',
	'WeakSet',

	// Utility types
	'Partial',
	'Required',
	'Readonly',
	'Pick',
	'Omit',
	'Exclude',
	'Extract',
	'NonNullable',
	'Parameters',
	'ReturnType',
	'InstanceType',
	'ThisType',
	'Awaited',
	'Uppercase',
	'Lowercase',
	'Capitalize',
	'Uncapitalize',

	// Async
	'Promise',
	'PromiseLike',

	// Other built-ins
	'Date',
	'RegExp',
	'Error',
	'JSON',

	// Typed arrays
	'ArrayBuffer',
	'SharedArrayBuffer',
	'DataView',
	'Int8Array',
	'Uint8Array',
	'Uint8ClampedArray',
	'Int16Array',
	'Uint16Array',
	'Int32Array',
	'Uint32Array',
	'Float32Array',
	'Float64Array',
	'BigInt64Array',
	'BigUint64Array',

	// Escape hatches
	'any',
	'unknown',
];

/**
 * Check if a name is a schema definition (ends with Schema/schema)
 */
function isSchemaDefinition(name: string): boolean {
	return name.endsWith('Schema') || name.endsWith('schema');
}

/**
 * Check if a type is a common TypeScript type
 */
function isCommonTsType(typeText: string): boolean {
	return COMMON_TS_TYPES.some(
		(t) => typeText === t || typeText.startsWith(t + '<') || typeText.startsWith(t + '[')
	);
}

/**
 * Create a lint result for missing type annotation
 */
function createMissingTypeResult(
	context: VisitorContext,
	node: AstNode,
	name: string,
	kind: 'variable' | 'parameter' | 'return' | 'property'
): LintResult {
	const kindLabel = {
		variable: 'Variable',
		parameter: 'Parameter',
		return: 'Return type',
		property: 'Property',
	}[kind];

	return {
		file: context.file,
		line: node.loc.start.line,
		column: node.loc.start.column + 1,
		severity: 'error',
		message: `${kindLabel} '${name}' must have a type annotation`,
		ruleId: 'valibot/require-type-annotation',
		tip: 'Define a Valibot schema and derive a type with: type Name = v.InferOutput<typeof NameSchema>',
		example:
			kind === 'variable' || kind === 'property'
				? `const ${name}Schema = v.object({ ... });\ntype ${capitalize(name)} = v.InferOutput<typeof ${name}Schema>;\nconst ${name}: ${capitalize(name)} = ...`
				: undefined,
	};
}

/**
 * Create a lint result for incorrect type (common TS type)
 */
function createCommonTypeResult(
	context: VisitorContext,
	node: AstNode,
	name: string,
	typeText: string,
	kind: 'variable' | 'parameter' | 'return' | 'property'
): LintResult {
	const kindLabel = {
		variable: 'Variable',
		parameter: 'Parameter',
		return: 'Return type',
		property: 'Property',
	}[kind];

	return {
		file: context.file,
		line: node.loc.start.line,
		column: node.loc.start.column + 1,
		severity: 'error',
		message: `${kindLabel} '${name}' uses TypeScript type '${typeText}' - must use a Valibot-derived type`,
		ruleId: 'valibot/require-type-annotation',
		tip: 'Define a Valibot schema and derive a type from it',
		example: `const ${name}Schema = v.${typeText === 'string' ? 'string()' : typeText === 'number' ? 'number()' : 'object({ ... })'};\ntype ${capitalize(name)} = v.InferOutput<typeof ${name}Schema>;`,
	};
}

/**
 * Create a lint result for non-Valibot type
 */
function createNonValibotTypeResult(
	context: VisitorContext,
	node: AstNode,
	name: string,
	typeText: string,
	kind: 'variable' | 'parameter' | 'return' | 'property'
): LintResult {
	const kindLabel = {
		variable: 'Variable',
		parameter: 'Parameter',
		return: 'Return type',
		property: 'Property',
	}[kind];

	return {
		file: context.file,
		line: node.loc.start.line,
		column: node.loc.start.column + 1,
		severity: 'warning',
		message: `${kindLabel} '${name}' has type '${typeText}' which may not be derived from a Valibot schema`,
		ruleId: 'valibot/require-type-annotation',
		tip: 'Consider defining a Valibot schema and using v.InferOutput<typeof Schema> for type safety',
	};
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Check a single variable declarator
 */
function checkDeclarator(
	declarator: AstNode,
	context: VisitorContext,
	results: LintResult[]
): void {
	const id = declarator.id as AstNode | undefined;
	if (!id) return;

	// Handle destructuring patterns
	if (id.type === 'ObjectPattern' || id.type === 'ArrayPattern') {
		checkDestructuringPattern(declarator, id, context, results);
		return;
	}

	// Get variable name
	const name = (id.name as string) || context.getNodeText(id);

	// Skip schema definitions
	if (isSchemaDefinition(name)) return;

	// Get initializer to check if it's a function
	const init = declarator.init as AstNode | undefined;

	// Arrow functions are checked separately via their own visitor
	if (init?.type === 'ArrowFunctionExpression') {
		checkArrowFunction(init, name, context, results);
		return;
	}

	// Function expressions are checked separately
	if (init?.type === 'FunctionExpression') {
		checkFunctionExpression(init, name, context, results);
		return;
	}

	// Check for type annotation on the variable
	const typeAnnotation = getTypeAnnotation(id, context.content);
	checkTypeAnnotation(context, id, name, typeAnnotation, 'variable', results);
}

/**
 * Check destructuring patterns
 */
function checkDestructuringPattern(
	declarator: AstNode,
	pattern: AstNode,
	context: VisitorContext,
	results: LintResult[]
): void {
	// The type annotation should be on the declarator's id (the pattern itself)
	const typeAnnotation = getTypeAnnotation(declarator.id as AstNode, context.content);

	// Get a name for the pattern (use first property or "destructured")
	let patternName = 'destructured';
	if (pattern.type === 'ObjectPattern') {
		const properties = pattern.properties as AstNode[] | undefined;
		if (properties && properties.length > 0) {
			const firstProp = properties[0];
			const key = firstProp.key as AstNode | undefined;
			if (key && key.name) {
				patternName = `{ ${key.name}, ... }`;
			}
		}
	} else if (pattern.type === 'ArrayPattern') {
		patternName = '[...]';
	}

	checkTypeAnnotation(context, pattern, patternName, typeAnnotation, 'variable', results);
}

/**
 * Check an arrow function
 */
function checkArrowFunction(
	node: AstNode,
	name: string,
	context: VisitorContext,
	results: LintResult[]
): void {
	// Check parameters
	const params = node.params as AstNode[] | undefined;
	if (params) {
		for (const param of params) {
			checkFunctionParameter(param, context, results);
		}
	}

	// Check return type
	const returnType = node.returnType as AstNode | undefined;
	const returnTypeText = returnType
		? context.content.slice(
				(returnType.typeAnnotation as AstNode)?.start ?? returnType.start,
				(returnType.typeAnnotation as AstNode)?.end ?? returnType.end
			)
		: null;

	checkTypeAnnotation(context, node, `${name} return`, returnTypeText, 'return', results);
}

/**
 * Check a function expression
 */
function checkFunctionExpression(
	node: AstNode,
	name: string,
	context: VisitorContext,
	results: LintResult[]
): void {
	// Check parameters
	const params = node.params as AstNode[] | undefined;
	if (params) {
		for (const param of params) {
			checkFunctionParameter(param, context, results);
		}
	}

	// Check return type
	const returnType = node.returnType as AstNode | undefined;
	const returnTypeText = returnType
		? context.content.slice(
				(returnType.typeAnnotation as AstNode)?.start ?? returnType.start,
				(returnType.typeAnnotation as AstNode)?.end ?? returnType.end
			)
		: null;

	checkTypeAnnotation(context, node, `${name} return`, returnTypeText, 'return', results);
}

/**
 * Check a function parameter
 */
function checkFunctionParameter(
	param: AstNode,
	context: VisitorContext,
	results: LintResult[]
): void {
	// Handle rest parameters
	if (param.type === 'RestElement') {
		const argument = param.argument as AstNode | undefined;
		if (argument) {
			const name = (argument.name as string) || context.getNodeText(argument);
			const typeAnnotation = getTypeAnnotation(param, context.content);
			checkTypeAnnotation(context, param, name, typeAnnotation, 'parameter', results);
		}
		return;
	}

	// Handle assignment patterns (default values)
	if (param.type === 'AssignmentPattern') {
		const left = param.left as AstNode | undefined;
		if (left) {
			const name = (left.name as string) || context.getNodeText(left);
			const typeAnnotation = getTypeAnnotation(left, context.content);
			checkTypeAnnotation(context, param, name, typeAnnotation, 'parameter', results);
		}
		return;
	}

	// Handle destructuring in parameters
	if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
		const typeAnnotation = getTypeAnnotation(param, context.content);
		const patternName = param.type === 'ObjectPattern' ? '{ ... }' : '[...]';
		checkTypeAnnotation(context, param, patternName, typeAnnotation, 'parameter', results);
		return;
	}

	// Regular identifier parameter
	const name = (param.name as string) || context.getNodeText(param);
	const typeAnnotation = getTypeAnnotation(param, context.content);
	checkTypeAnnotation(context, param, name, typeAnnotation, 'parameter', results);
}

/**
 * Check a type annotation and add results if needed
 */
function checkTypeAnnotation(
	context: VisitorContext,
	node: AstNode,
	name: string,
	typeAnnotation: string | null,
	kind: 'variable' | 'parameter' | 'return' | 'property',
	results: LintResult[]
): void {
	if (!typeAnnotation) {
		results.push(createMissingTypeResult(context, node, name, kind));
		return;
	}

	// Check if type references valibot
	const isValibotType = typeReferencesModule(typeAnnotation, VALIBOT_MODULE, context.imports);

	if (!isValibotType) {
		if (isCommonTsType(typeAnnotation)) {
			results.push(createCommonTypeResult(context, node, name, typeAnnotation, kind));
		} else {
			// Custom type - warn but don't error (it might be derived from Valibot in another file)
			results.push(createNonValibotTypeResult(context, node, name, typeAnnotation, kind));
		}
	}
}

const rule: TypeScriptRule = {
	id: 'valibot/require-type-annotation',
	description:
		'All variable declarations and function signatures must use Valibot-derived type annotations',
	categories: ['typescript', 'valibot', 'types'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			// Check both const and let (skip var for legacy reasons)
			if (node.kind !== 'const' && node.kind !== 'let') return results;

			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return results;

			for (const declarator of declarations) {
				checkDeclarator(declarator, context, results);
			}

			return results;
		},

		FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			// Get function name
			const id = node.id as AstNode | undefined;
			const name = (id?.name as string) || 'anonymous';

			// Skip schema-related functions
			if (isSchemaDefinition(name)) return results;

			// Check parameters
			const params = node.params as AstNode[] | undefined;
			if (params) {
				for (const param of params) {
					checkFunctionParameter(param, context, results);
				}
			}

			// Check return type
			const returnType = node.returnType as AstNode | undefined;
			const returnTypeText = returnType
				? context.content.slice(
						(returnType.typeAnnotation as AstNode)?.start ?? returnType.start,
						(returnType.typeAnnotation as AstNode)?.end ?? returnType.end
					)
				: null;

			checkTypeAnnotation(context, node, `${name} return`, returnTypeText, 'return', results);

			return results;
		},

		ClassDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const body = node.body as AstNode | undefined;
			if (!body) return results;

			const bodyItems = body.body as AstNode[] | undefined;
			if (!bodyItems) return results;

			for (const item of bodyItems) {
				// Check class properties
				if (item.type === 'PropertyDefinition' || item.type === 'ClassProperty') {
					const key = item.key as AstNode | undefined;
					const name = (key?.name as string) || context.getNodeText(key || item);

					// Skip schema definitions
					if (isSchemaDefinition(name)) continue;

					const typeAnnotation = getTypeAnnotation(item, context.content);
					checkTypeAnnotation(context, item, name, typeAnnotation, 'property', results);
				}

				// Check class methods
				if (item.type === 'MethodDefinition') {
					const key = item.key as AstNode | undefined;
					const methodName = (key?.name as string) || 'method';

					// Skip constructor, getters, setters for now
					if (item.kind === 'constructor' || item.kind === 'get' || item.kind === 'set') {
						continue;
					}

					const value = item.value as AstNode | undefined;
					if (!value) continue;

					// Check parameters
					const params = value.params as AstNode[] | undefined;
					if (params) {
						for (const param of params) {
							checkFunctionParameter(param, context, results);
						}
					}

					// Check return type
					const returnType = value.returnType as AstNode | undefined;
					const returnTypeText = returnType
						? context.content.slice(
								(returnType.typeAnnotation as AstNode)?.start ?? returnType.start,
								(returnType.typeAnnotation as AstNode)?.end ?? returnType.end
							)
						: null;

					checkTypeAnnotation(
						context,
						value,
						`${methodName} return`,
						returnTypeText,
						'return',
						results
					);
				}
			}

			return results;
		},
	},

	async check() {
		// TypeScript rules use the visitor pattern, not check()
		return [];
	},
};

export default rule;
