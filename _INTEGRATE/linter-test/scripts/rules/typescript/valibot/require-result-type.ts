/**
 * Rule: valibot/require-result-type
 *
 * Requires that exported functions return Result<T, E> type instead of
 * throwing errors or returning raw data that might fail.
 *
 * This enforces Rust-style error handling where errors are explicit
 * in the return type, making error handling "infectious" - callers
 * must handle the Result before accessing the data.
 *
 * ❌ Bad:
 *   export function parseUser(data: unknown): User {
 *     const result = v.parse(UserSchema, data);  // throws!
 *     return result;
 *   }
 *
 * ❌ Bad:
 *   export async function createUser(data: unknown): Promise<User> {
 *     const validated = v.parse(UserSchema, data);
 *     return await db.insert(validated);  // What if db fails?
 *   }
 *
 * ✅ Good:
 *   export function parseUser(data: unknown): Result<User, ValidationErrors> {
 *     const result = v.safeParse(UserSchema, data);
 *     if (!result.success) {
 *       return err(mapIssues(result.issues, UserErrors, locale));
 *     }
 *     return ok(result.output);
 *   }
 *
 * ✅ Good:
 *   export async function createUser(data: unknown): Promise<Result<User, ApiError>> {
 *     const validated = parseUser(data);
 *     if (!validated.success) return validated;
 *     return fromPromise(db.insert(validated.data), mapDbError);
 *   }
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const rule: TypeScriptRule = {
	id: 'valibot/require-result-type',
	description: 'Exported functions should return Result<T, E> for explicit error handling',
	categories: ['typescript', 'valibot', 'errors', 'types'],
	stages: ['lint', 'check'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		ExportNamedDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const declaration = node.declaration as AstNode | undefined;
			if (!declaration) return results;

			// Handle function declarations
			if (declaration.type === 'FunctionDeclaration') {
				const result = checkFunctionReturnType(declaration, context);
				if (result) results.push(result);
			}

			// Handle variable declarations with arrow functions
			if (declaration.type === 'VariableDeclaration') {
				const declarations = declaration.declarations as AstNode[] | undefined;
				if (!declarations) return results;

				for (const decl of declarations) {
					const init = decl.init as AstNode | undefined;
					if (
						init &&
						(init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
					) {
						const funcName = (decl.id as AstNode)?.name as string | undefined;
						const result = checkFunctionReturnType(init, context, funcName);
						if (result) results.push(result);
					}
				}
			}

			return results;
		},

		ExportDefaultDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const declaration = node.declaration as AstNode | undefined;
			if (!declaration) return results;

			if (
				declaration.type === 'FunctionDeclaration' ||
				declaration.type === 'ArrowFunctionExpression' ||
				declaration.type === 'FunctionExpression'
			) {
				const result = checkFunctionReturnType(declaration, context);
				if (result) results.push(result);
			}

			return results;
		},
	},

	async check() {
		return [];
	},
};

/**
 * Check if a function has Result return type and report if not.
 */
function checkFunctionReturnType(
	node: AstNode,
	context: VisitorContext,
	funcName?: string
): LintResult | null {
	// Skip if no return type annotation
	const returnType = node.returnType as AstNode | undefined;
	if (!returnType) {
		// Could report missing return type, but that's a different rule
		return null;
	}

	// Get the actual type annotation
	const typeAnnotation = returnType.typeAnnotation as AstNode | undefined;
	if (!typeAnnotation) return null;

	const name = funcName || (node.id as AstNode)?.name || 'anonymous';

	// Check if it's a Result type
	if (isResultType(typeAnnotation)) {
		return null; // Good - has Result type
	}

	// Check if it's Promise<Result<...>>
	if (isPromiseOfResult(typeAnnotation)) {
		return null; // Good - async with Result
	}

	// Check if this function does validation (uses v.safeParse or v.parse)
	const funcBody = node.body as AstNode | undefined;
	if (!funcBody) return null;

	const bodyText = context.content.slice(funcBody.start, funcBody.end);
	const doesValidation = /\.(safeParse|parse)\s*\(/.test(bodyText);

	if (!doesValidation) {
		// Function doesn't do validation - might not need Result
		// Only warn for functions that look like they could fail
		if (!mightFail(bodyText)) {
			return null;
		}
	}

	return {
		file: context.file,
		line: node.loc.start.line,
		column: node.loc.start.column + 1,
		severity: 'error',
		message: `Function '${name}' should return Result<T, E> for explicit error handling`,
		ruleId: 'valibot/require-result-type',
		tip: 'Use Result type to make errors explicit in the return type',
		example: `import { Result, ok, err } from '@/schemas/result';

export function ${name}(...): Result<DataType, ErrorType> {
  // ... validation/operation
  if (failed) return err(errors);
  return ok(data);
}`,
	};
}

/**
 * Check if a type is Result<T, E>.
 */
function isResultType(node: AstNode): boolean {
	if (node.type === 'TSTypeReference') {
		const typeName = node.typeName as AstNode | undefined;
		if (!typeName) return false;

		const name = (typeName.name as string) || '';
		return (
			name === 'Result' ||
			name === 'ValidationResult' ||
			name === 'ApiResult' ||
			name === 'Ok' ||
			name === 'Err'
		);
	}

	// Handle union types like Ok<T> | Err<E>
	if (node.type === 'TSUnionType') {
		const types = node.types as AstNode[] | undefined;
		if (!types) return false;

		return types.some((t) => {
			if (t.type === 'TSTypeReference') {
				const typeName = t.typeName as AstNode | undefined;
				const name = (typeName?.name as string) || '';
				return name === 'Ok' || name === 'Err';
			}
			return false;
		});
	}

	return false;
}

/**
 * Check if a type is Promise<Result<T, E>>.
 */
function isPromiseOfResult(node: AstNode): boolean {
	if (node.type !== 'TSTypeReference') return false;

	const typeName = node.typeName as AstNode | undefined;
	if (!typeName) return false;

	const name = (typeName.name as string) || '';
	if (name !== 'Promise') return false;

	// Check type parameters
	const typeParams = node.typeParameters as AstNode | undefined;
	if (!typeParams) return false;

	const params = typeParams.params as AstNode[] | undefined;
	if (!params || params.length === 0) return false;

	return isResultType(params[0]);
}

/**
 * Check if function body might fail (has try/catch, await, etc.).
 */
function mightFail(body: string): boolean {
	return (
		/await\s+/.test(body) ||
		/\.then\s*\(/.test(body) ||
		/fetch\s*\(/.test(body) ||
		/throw\s+/.test(body) ||
		/try\s*\{/.test(body) ||
		/\.parse\s*\(/.test(body) ||
		/db\./.test(body) ||
		/database/.test(body) ||
		/api/.test(body)
	);
}

export default rule;
