/**
 * Rule: valibot/validate-boundaries
 *
 * Enforces that external inputs are validated with v.parse() or v.safeParse().
 *
 * System boundaries (where validation is required):
 *   - API request handlers
 *   - Environment variable access
 *   - File reads (JSON.parse results)
 *   - External API responses
 *   - User input (forms, query params)
 *
 * This rule checks for common patterns where validation should occur.
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Functions that indicate untrusted data
const UNTRUSTED_SOURCES = [
	'JSON.parse',
	'fetch',
	'axios',
	'request',
	'readFile',
	'readFileSync',
	'process.env',
	'localStorage.getItem',
	'sessionStorage.getItem',
	'URLSearchParams',
];

const rule: TypeScriptRule = {
	id: 'valibot/validate-boundaries',
	description: 'External inputs must be validated with v.parse() or v.safeParse()',
	categories: ['typescript', 'valibot', 'security'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);

			// Check for JSON.parse without validation
			if (isJsonParse(node)) {
				// Look at the parent to see if result is being validated
				const callText = context.getNodeText(node);

				// This is a heuristic - we can't easily check parent context
				// So we warn about JSON.parse usage in general
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: 'JSON.parse returns untyped data - validate with v.parse() or v.safeParse()',
					ruleId: 'valibot/validate-boundaries',
					tip: 'Parse JSON data through a Valibot schema for type safety',
					example: namespaceAlias
						? `const data = ${namespaceAlias}.parse(DataSchema, JSON.parse(text));`
						: 'const data = v.parse(DataSchema, JSON.parse(text));',
				});
			}

			// Check for process.env access
			if (isProcessEnvAccess(node, context)) {
				results.push({
					file: context.file,
					line: node.loc.start.line,
					column: node.loc.start.column + 1,
					severity: 'warning',
					message: 'Environment variables should be validated at startup',
					ruleId: 'valibot/validate-boundaries',
					tip: 'Create an env schema and validate process.env once at app startup',
					example: namespaceAlias
						? `const EnvSchema = ${namespaceAlias}.strictObject({ ... });\nconst env = ${namespaceAlias}.parse(EnvSchema, process.env);`
						: undefined,
				});
			}

			return results;
		},

		// Check for request handlers without validation
		FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const id = node.id as AstNode | undefined;
			const name = (id?.name as string)?.toLowerCase() || '';

			// Common handler names
			const isHandler =
				name.includes('handler') ||
				name.includes('controller') ||
				name.includes('endpoint') ||
				name.startsWith('get') ||
				name.startsWith('post') ||
				name.startsWith('put') ||
				name.startsWith('delete') ||
				name.startsWith('patch');

			if (isHandler) {
				const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);

				// Check if function body contains validation
				const body = node.body as AstNode | undefined;
				if (body) {
					const bodyText = context.content.slice(body.start, body.end);
					const hasValidation =
						bodyText.includes('.parse(') ||
						bodyText.includes('.safeParse(') ||
						bodyText.includes('validate(');

					if (!hasValidation) {
						results.push({
							file: context.file,
							line: node.loc.start.line,
							column: node.loc.start.column + 1,
							severity: 'info',
							message: `Handler '${id?.name}' may need input validation`,
							ruleId: 'valibot/validate-boundaries',
							tip: 'Validate request body/params with v.safeParse() for type-safe handlers',
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

function isJsonParse(node: AstNode): boolean {
	const callee = node.callee as AstNode | undefined;
	if (!callee || callee.type !== 'MemberExpression') return false;

	const object = callee.object as AstNode | undefined;
	const property = callee.property as AstNode | undefined;

	return object?.name === 'JSON' && property?.name === 'parse';
}

function isProcessEnvAccess(node: AstNode, context: VisitorContext): boolean {
	const callee = node.callee as AstNode | undefined;
	if (!callee) return false;

	// Check for direct process.env.X access (though this would be MemberExpression)
	const nodeText = context.getNodeText(node);
	return nodeText.includes('process.env');
}

export default rule;
