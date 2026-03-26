/**
 * Rule: valibot/no-ignore-result
 *
 * Detects when a function returns a Result but the caller ignores it.
 * This means errors are being silently swallowed.
 *
 * ❌ Bad:
 *   parseUser(data);  // Result returned but not assigned!
 *
 * ❌ Bad:
 *   await saveUser(user);  // Promise<Result> returned but not assigned!
 *
 * ✅ Good:
 *   const result = parseUser(data);
 *   if (!result.success) { ... }
 *
 * ✅ Good:
 *   const result = await saveUser(user);
 *   if (!result.success) { ... }
 *
 * ✅ Good (propagating):
 *   return parseUser(data);  // Returning to caller to handle
 *
 * The rule identifies functions that return Result by:
 * - Function name patterns (parse*, validate*, create*, etc.)
 * - Type annotations in the file
 * - Import analysis
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

// Function name patterns that likely return Result
const RESULT_FUNCTION_PATTERNS = [
	/^parse/i,
	/^validate/i,
	/^create/i,
	/^update/i,
	/^delete/i,
	/^save/i,
	/^fetch/i,
	/^load/i,
	/^submit/i,
	/^process/i,
	/^handle/i,
	/^execute/i,
	/^run/i,
	/^check/i,
	/^verify/i,
];

// Patterns in the file that indicate Result usage
const RESULT_IMPORT_PATTERNS = [
	/@\/schemas\/result/,
	/from\s+['"].*result['"]/i,
	/Result\s*</,
	/ValidationResult/,
	/ApiResult/,
];

const rule: TypeScriptRule = {
	id: 'valibot/no-ignore-result',
	description: 'Do not ignore Result return values - errors might be silently lost',
	categories: ['typescript', 'valibot', 'errors', 'safety'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		ExpressionStatement(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const expression = node.expression as AstNode | undefined;
			if (!expression) return results;

			// Check for function calls or await expressions that are not assigned
			const callExpr = getCallExpression(expression);
			if (!callExpr) return results;

			const funcName = getFunctionName(callExpr);
			if (!funcName) return results;

			// Check if this function likely returns a Result
			if (!likelyReturnsResult(funcName, context)) {
				return results;
			}

			results.push({
				file: context.file,
				line: node.loc.start.line,
				column: node.loc.start.column + 1,
				severity: 'error',
				message: `Result from ${funcName}() is not handled - errors may be lost`,
				ruleId: 'valibot/no-ignore-result',
				tip: 'Assign the Result and check .success, or return it to the caller',
				example: `const result = ${funcName}(...);
if (!result.success) {
  // Handle error
  return err(result.errors);
}
// Use result.data`,
			});

			return results;
		},
	},

	async check() {
		return [];
	},
};

/**
 * Get the CallExpression from an expression, handling await.
 */
function getCallExpression(node: AstNode): AstNode | null {
	if (node.type === 'CallExpression') {
		return node;
	}

	if (node.type === 'AwaitExpression') {
		const argument = node.argument as AstNode | undefined;
		if (argument?.type === 'CallExpression') {
			return argument;
		}
	}

	return null;
}

/**
 * Get the function name from a CallExpression.
 */
function getFunctionName(node: AstNode): string | null {
	const callee = node.callee as AstNode | undefined;
	if (!callee) return null;

	// Direct function call: funcName()
	if (callee.type === 'Identifier') {
		return callee.name as string;
	}

	// Method call: obj.method()
	if (callee.type === 'MemberExpression') {
		const property = callee.property as AstNode | undefined;
		if (property?.type === 'Identifier') {
			return property.name as string;
		}
	}

	return null;
}

/**
 * Check if a function likely returns a Result.
 */
function likelyReturnsResult(funcName: string, context: VisitorContext): boolean {
	// Check function name patterns
	if (RESULT_FUNCTION_PATTERNS.some((p) => p.test(funcName))) {
		// Also check if file uses Result types
		if (RESULT_IMPORT_PATTERNS.some((p) => p.test(context.content))) {
			return true;
		}
	}

	// Check if the function is defined in this file with Result return type
	const funcDefPattern = new RegExp(
		`(?:function\\s+${funcName}|const\\s+${funcName}\\s*=)[^{]*:\\s*(?:Promise\\s*<\\s*)?Result\\s*<`,
		'i'
	);

	if (funcDefPattern.test(context.content)) {
		return true;
	}

	// Check for type annotations that indicate Result
	const typeAnnotationPattern = new RegExp(
		`${funcName}\\s*\\([^)]*\\)\\s*:\\s*(?:Promise\\s*<\\s*)?(?:Result|ValidationResult|ApiResult)`,
		'i'
	);

	if (typeAnnotationPattern.test(context.content)) {
		return true;
	}

	return false;
}

export default rule;
