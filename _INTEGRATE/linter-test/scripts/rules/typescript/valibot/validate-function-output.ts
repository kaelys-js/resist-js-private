/**
 * Rule: valibot/validate-function-output
 *
 * Suggests validating return values for functions that return complex types.
 *
 * This ensures the function's output matches the declared schema, catching
 * bugs where internal logic produces invalid data.
 *
 * ❌ Bad:
 *   function createUser(input: UserInput): User {
 *     return {
 *       ...input,
 *       id: generateId(),
 *       // Bug: might be missing required fields!
 *     };
 *   }
 *
 * ✅ Good:
 *   function createUser(input: UserInput): User {
 *     const result = {
 *       ...input,
 *       id: generateId(),
 *     };
 *     return v.parse(UserSchema, result);  // Validates output
 *   }
 *
 * Note: This is an informational rule - output validation adds overhead.
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Return types that should be validated
const COMPLEX_RETURN_PATTERNS = [
	// Valibot-inferred types
	/InferOutput/,
	/InferInput/,
	// Common domain types
	/User/,
	/Account/,
	/Order/,
	/Product/,
	/Config/,
	/Settings/,
	/Response/,
	/Result/,
	/Data$/,
	/Entity$/,
	/Model$/,
	/DTO$/,
];

// Functions that don't need output validation
const SKIP_PATTERNS = [
	/^get[A-Z]/,  // Getters typically just return stored data
	/^is[A-Z]/,   // Boolean checks
	/^has[A-Z]/,  // Boolean checks
	/^can[A-Z]/,  // Boolean checks
	/^should[A-Z]/, // Boolean checks
];

const rule: TypeScriptRule = {
	id: 'valibot/validate-function-output',
	description: 'Consider validating return values for functions returning complex types',
	categories: ['typescript', 'valibot', 'validation'],
	stages: ['lint', 'check'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const id = node.id as AstNode | undefined;
			const name = (id?.name as string) || '';

			// Skip simple getters/checkers
			if (SKIP_PATTERNS.some((p) => p.test(name))) return results;

			// Check return type
			const returnType = node.returnType as AstNode | undefined;
			if (!returnType) return results;

			const returnTypeText = context.content.slice(
				(returnType.typeAnnotation as AstNode)?.start ?? returnType.start,
				(returnType.typeAnnotation as AstNode)?.end ?? returnType.end
			);

			// Check if return type matches complex patterns
			const isComplexReturn = COMPLEX_RETURN_PATTERNS.some((p) => p.test(returnTypeText));
			if (!isComplexReturn) return results;

			// Check function body for return validation
			const body = node.body as AstNode | undefined;
			if (!body) return results;

			const bodyText = context.content.slice(body.start, body.end);

			// Look for v.parse() wrapping a return
			const hasReturnValidation =
				bodyText.includes(`return ${namespaceAlias}.parse(`) ||
				bodyText.includes(`return ${namespaceAlias}.safeParse(`) ||
				// Check for pattern: const result = v.parse(...); return result;
				(bodyText.includes(`${namespaceAlias}.parse(`) && /return\s+\w+;?\s*$/.test(bodyText));

			if (!hasReturnValidation) {
				// Count return statements to see if this is complex
				const returnCount = (bodyText.match(/\breturn\b/g) || []).length;

				// Only suggest for functions with multiple returns or complex logic
				if (returnCount > 1 || bodyText.length > 200) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'info',
						message: `Function '${name}' returns '${returnTypeText}' but doesn't validate output`,
						ruleId: 'valibot/validate-function-output',
						tip: 'Consider wrapping return value with v.parse(Schema, result) to catch bugs',
						example: `return ${namespaceAlias}.parse(${returnTypeText.replace(/\W/g, '')}Schema, result);`,
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
