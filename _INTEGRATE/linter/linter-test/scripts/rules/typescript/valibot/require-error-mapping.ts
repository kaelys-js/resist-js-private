/**
 * Rule: valibot/require-error-mapping
 *
 * Requires using mapIssues() after v.safeParse() failures.
 * This ensures validation errors are properly localized before being returned.
 *
 * ❌ Bad:
 *   const result = v.safeParse(UserSchema, data);
 *   if (!result.success) {
 *     return err(result.issues);  // Raw issues, not localized!
 *   }
 *
 * ❌ Bad:
 *   const result = v.safeParse(UserSchema, data);
 *   if (!result.success) {
 *     return { errors: result.issues };  // Raw issues!
 *   }
 *
 * ✅ Good:
 *   const result = v.safeParse(UserSchema, data);
 *   if (!result.success) {
 *     return err(mapIssues(result.issues, UserErrors, locale));
 *   }
 *
 * The rule detects when result.issues is accessed without being passed
 * through mapIssues() first.
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCall } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const rule: TypeScriptRule = {
	id: 'valibot/require-error-mapping',
	description: 'Use mapIssues() to localize validation errors after safeParse failures',
	categories: ['typescript', 'valibot', 'i18n', 'errors'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		MemberExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			// Check for accessing .issues on a safeParse result
			const property = node.property as AstNode | undefined;
			if (!property) return results;

			const propertyName = (property.name as string) || (property.value as string);
			if (propertyName !== 'issues') return results;

			// Get the object being accessed
			const object = node.object as AstNode | undefined;
			if (!object) return results;

			// Check if this is likely a safeParse result
			// We look for patterns like: result.issues, parseResult.issues, etc.
			const objectName = getIdentifierName(object);

			// Check if this .issues access is inside a mapIssues call
			if (isInsideMapIssuesCall(node, context)) {
				return results; // Good - it's being mapped
			}

			// Check if the variable was assigned from safeParse
			if (objectName && isLikelySafeParseResult(objectName, context)) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'error',
					message: `Direct use of ${objectName}.issues - use mapIssues() for i18n support`,
					ruleId: 'valibot/require-error-mapping',
					tip: `Replace with: mapIssues(${objectName}.issues, SchemaErrors, locale)`,
					example: `import { mapIssues } from '@/schemas/errors';
import { SchemaErrors } from './schema.errors';

const errors = mapIssues(${objectName}.issues, SchemaErrors, locale);`,
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
 * Get the name of an identifier node.
 */
function getIdentifierName(node: AstNode): string | null {
	if (node.type === 'Identifier') {
		return node.name as string;
	}
	return null;
}

/**
 * Check if a node is inside a mapIssues() call.
 */
function isInsideMapIssuesCall(node: AstNode, context: VisitorContext): boolean {
	// Get surrounding code and check if we're inside mapIssues(...)
	const start = Math.max(0, node.start - 100);
	const end = Math.min(context.content.length, node.end + 10);
	const surrounding = context.content.slice(start, end);

	// Check for mapIssues pattern before our node
	const beforeNode = context.content.slice(start, node.start);
	return /mapIssues\s*\(\s*$/.test(beforeNode) || /mapIssuesNested\s*\(\s*$/.test(beforeNode);
}

/**
 * Check if a variable name is likely a safeParse result.
 * Uses naming conventions and context analysis.
 */
function isLikelySafeParseResult(varName: string, context: VisitorContext): boolean {
	// Common naming patterns for safeParse results
	const patterns = [
		/result$/i,
		/parseResult$/i,
		/parsed$/i,
		/validation$/i,
		/validated$/i,
		/safeParseResult$/i,
	];

	if (patterns.some((p) => p.test(varName))) {
		return true;
	}

	// Check if the variable is assigned from v.safeParse in the file
	const safeParsePattern = new RegExp(
		`(?:const|let|var)\\s+${varName}\\s*=\\s*(?:\\w+\\.)?safeParse\\s*\\(`,
		'i'
	);

	return safeParsePattern.test(context.content);
}

export default rule;
