/**
 * Rule: valibot/handle-result
 *
 * Detects when a Result is assigned but its .success is never checked.
 * This means the errors might be silently ignored.
 *
 * ❌ Bad:
 *   const result = parseUser(data);
 *   // No check of result.success!
 *   await db.insert(result.data);  // result.data might not exist!
 *
 * ❌ Bad:
 *   const result = parseUser(data);
 *   return result.data;  // Accessing .data without checking .success
 *
 * ✅ Good:
 *   const result = parseUser(data);
 *   if (!result.success) {
 *     return response(400, result.errors);
 *   }
 *   await db.insert(result.data);  // Safe - we know it's Ok
 *
 * ✅ Good:
 *   const result = parseUser(data);
 *   if (isErr(result)) {
 *     return result;  // Propagate error
 *   }
 *   return result.data;
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

// Patterns that indicate a Result variable
const RESULT_PATTERNS = [
	/Result$/,
	/result$/,
	/parsed$/i,
	/validated$/i,
	/validation$/i,
];

// Patterns that indicate Result is being properly checked
const CHECK_PATTERNS = [
	/\.success\b/,
	/isOk\s*\(/,
	/isErr\s*\(/,
	/!.*\.success/,
	/\.success\s*===?\s*(true|false)/,
	/\.success\s*!==?\s*(true|false)/,
];

const rule: TypeScriptRule = {
	id: 'valibot/handle-result',
	description: 'Result must be checked before accessing .data or .errors',
	categories: ['typescript', 'valibot', 'errors', 'safety'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		MemberExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			// Check for accessing .data or .errors on a Result
			const property = node.property as AstNode | undefined;
			if (!property) return results;

			const propertyName = (property.name as string) || (property.value as string);
			if (propertyName !== 'data' && propertyName !== 'errors') return results;

			// Get the object being accessed
			const object = node.object as AstNode | undefined;
			if (!object) return results;

			const objectName = getIdentifierName(object);
			if (!objectName) return results;

			// Check if this looks like a Result variable
			if (!isLikelyResultVariable(objectName)) return results;

			// Check if this variable's .success has been checked before this point
			const hasCheck = hasSuccessCheckBefore(objectName, node, context);

			if (!hasCheck) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: `Accessing ${objectName}.${propertyName} without checking .success first`,
					ruleId: 'valibot/handle-result',
					tip: `Check ${objectName}.success before accessing .${propertyName}`,
					example: `if (!${objectName}.success) {
  return ${objectName}.errors;
}
// Now safe to access ${objectName}.data`,
				});
			}

			return results;
		},
	},

	async check() {
		return [];
	},
};

/**
 * Get identifier name from a node.
 */
function getIdentifierName(node: AstNode): string | null {
	if (node.type === 'Identifier') {
		return node.name as string;
	}
	return null;
}

/**
 * Check if a variable name looks like a Result.
 */
function isLikelyResultVariable(name: string): boolean {
	return RESULT_PATTERNS.some((p) => p.test(name));
}

/**
 * Check if there's a .success check before this node for the given variable.
 */
function hasSuccessCheckBefore(
	varName: string,
	node: AstNode,
	context: VisitorContext
): boolean {
	// Get the code before this node
	const beforeCode = context.content.slice(0, node.start);

	// Find where the variable was declared
	const declPattern = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=`, 'g');
	const declMatch = declPattern.exec(beforeCode);
	if (!declMatch) return false;

	// Get code between declaration and current node
	const codeSinceDeclare = beforeCode.slice(declMatch.index);

	// Check for success checks
	for (const pattern of CHECK_PATTERNS) {
		const checkPattern = new RegExp(`${varName}${pattern.source}`);
		if (checkPattern.test(codeSinceDeclare)) {
			return true;
		}
	}

	// Check for if statements that check the result
	const ifCheckPattern = new RegExp(
		`if\\s*\\([^)]*${varName}\\.success[^)]*\\)`,
		'i'
	);
	if (ifCheckPattern.test(codeSinceDeclare)) {
		return true;
	}

	// Check for early return patterns after error check
	const earlyReturnPattern = new RegExp(
		`if\\s*\\([^)]*!${varName}\\.success[^)]*\\)\\s*\\{[^}]*return`,
		's'
	);
	if (earlyReturnPattern.test(codeSinceDeclare)) {
		return true;
	}

	// Check for isOk/isErr guards
	const guardPattern = new RegExp(`(isOk|isErr)\\s*\\(\\s*${varName}\\s*\\)`);
	if (guardPattern.test(codeSinceDeclare)) {
		return true;
	}

	return false;
}

export default rule;
