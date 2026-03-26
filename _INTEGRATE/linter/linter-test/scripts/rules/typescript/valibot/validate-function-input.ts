/**
 * Rule: valibot/validate-function-input
 *
 * Enforces that function parameters are validated at the start of the function.
 *
 * Types alone don't guarantee runtime safety - external inputs must be validated.
 *
 * ❌ Bad:
 *   function createUser(input: UserInput): User {
 *     // Trusts input blindly - no runtime validation!
 *     return { ...input, id: generateId() };
 *   }
 *
 * ✅ Good:
 *   function createUser(input: unknown): User {
 *     const validated = v.parse(UserInputSchema, input);
 *     return { ...validated, id: generateId() };
 *   }
 *
 * Note: This rule focuses on exported functions and handlers (public API boundaries).
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Function names that indicate they're handlers/entry points
const HANDLER_PATTERNS = [
	/^handle/i,
	/^on[A-Z]/,
	/handler$/i,
	/controller$/i,
	/^(get|post|put|patch|delete|create|update|remove)/i,
	/^process/i,
	/^validate/i,
	/^parse/i,
	/action$/i,
	/endpoint$/i,
	/api$/i,
];

const rule: TypeScriptRule = {
	id: 'valibot/validate-function-input',
	description: 'Function parameters should be validated with v.parse() at the start',
	categories: ['typescript', 'valibot', 'security', 'validation'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		FunctionDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			return checkFunction(node, context, false);
		},

		// Also check exported arrow functions
		VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return results;

			for (const declarator of declarations) {
				const init = declarator.init as AstNode | undefined;
				if (!init) continue;

				if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
					const id = declarator.id as AstNode | undefined;
					const name = id?.name as string | undefined;

					// Check if it's a handler pattern
					if (name && HANDLER_PATTERNS.some((p) => p.test(name))) {
						const funcResults = checkArrowFunction(init, name, context);
						results.push(...funcResults);
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

function checkFunction(node: AstNode, context: VisitorContext, isExported: boolean): LintResult[] {
	const results: LintResult[] = [];

	const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
	if (!namespaceAlias) return results;

	const id = node.id as AstNode | undefined;
	const name = (id?.name as string) || '';

	// Only check handlers and exported functions
	const isHandler = HANDLER_PATTERNS.some((p) => p.test(name));
	if (!isHandler && !isExported) return results;

	const params = node.params as AstNode[] | undefined;
	if (!params || params.length === 0) return results;

	const body = node.body as AstNode | undefined;
	if (!body) return results;

	const bodyText = context.content.slice(body.start, body.end);

	// Check if any parameter is validated
	let hasValidation = false;
	const validatePatterns = [
		new RegExp(`${namespaceAlias}\\.parse\\(`),
		new RegExp(`${namespaceAlias}\\.safeParse\\(`),
		new RegExp(`${namespaceAlias}\\.parseAsync\\(`),
		new RegExp(`${namespaceAlias}\\.safeParseAsync\\(`),
	];

	for (const pattern of validatePatterns) {
		if (pattern.test(bodyText)) {
			hasValidation = true;
			break;
		}
	}

	if (!hasValidation) {
		// Get parameter names for the message
		const paramNames = params
			.map((p) => {
				if (p.type === 'Identifier') return p.name as string;
				if (p.type === 'ObjectPattern') return '{ ... }';
				if (p.type === 'ArrayPattern') return '[...]';
				return 'param';
			})
			.filter(Boolean);

		results.push({
			file: context.file,
			line: node.loc.start.line,
			column: node.loc.start.column + 1,
			severity: 'warning',
			message: `Function '${name}' does not validate input parameters`,
			ruleId: 'valibot/validate-function-input',
			tip: 'Validate input at the start of the function with v.parse() or v.safeParse()',
			example: `function ${name}(${paramNames[0] || 'input'}: unknown) {\n  const validated = ${namespaceAlias}.parse(Schema, ${paramNames[0] || 'input'});\n  // ...\n}`,
		});
	}

	return results;
}

function checkArrowFunction(node: AstNode, name: string, context: VisitorContext): LintResult[] {
	const results: LintResult[] = [];

	const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
	if (!namespaceAlias) return results;

	const params = node.params as AstNode[] | undefined;
	if (!params || params.length === 0) return results;

	const body = node.body as AstNode | undefined;
	if (!body) return results;

	const bodyText = context.content.slice(body.start, body.end);

	// Check for validation
	const validatePatterns = [
		new RegExp(`${namespaceAlias}\\.parse\\(`),
		new RegExp(`${namespaceAlias}\\.safeParse\\(`),
	];

	let hasValidation = false;
	for (const pattern of validatePatterns) {
		if (pattern.test(bodyText)) {
			hasValidation = true;
			break;
		}
	}

	if (!hasValidation) {
		results.push({
			file: context.file,
			line: node.loc.start.line,
			column: node.loc.start.column + 1,
			severity: 'warning',
			message: `Handler '${name}' does not validate input parameters`,
			ruleId: 'valibot/validate-function-input',
			tip: 'Validate input with v.parse() or v.safeParse() at the start',
		});
	}

	return results;
}

export default rule;
