/**
 * Rule: valibot/no-inline-error-message
 *
 * Disallows inline error messages in Valibot validation methods.
 * Error messages should be externalized into separate *.errors.ts files
 * for i18n support and maintainability.
 *
 * ❌ Bad:
 *   v.string('Name is required')
 *   v.pipe(v.string(), v.minLength(1, 'Name cannot be empty'))
 *   v.email('Please enter a valid email')
 *
 * ✅ Good:
 *   v.string()
 *   v.pipe(v.string(), v.minLength(1))
 *   v.email()
 *
 * Error messages should be in a colocated *.errors.ts file:
 *   export const UserErrors: LocalizedErrorMap = {
 *     en: { name: { string: 'Name is required', minLength: 'Name cannot be empty' } },
 *     es: { name: { string: 'Nombre requerido', minLength: 'Nombre no puede estar vacío' } },
 *   };
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Methods where the FIRST argument can be an error message
const FIRST_ARG_MESSAGE_METHODS = [
	'string',
	'number',
	'boolean',
	'bigint',
	'date',
	'symbol',
	'blob',
	'file',
	'null_',
	'undefined_',
	'void_',
	'never',
	'any',
	'unknown',
];

// Methods where the LAST argument can be an error message
const LAST_ARG_MESSAGE_METHODS = [
	// Validation methods with required args + optional message
	'email',
	'url',
	'uuid',
	'cuid2',
	'ulid',
	'regex',
	'emoji',
	'ipv4',
	'ipv6',
	'ip',
	'mac',
	'hexColor',
	'hexadecimal',
	'base64',

	// Length validations
	'length',
	'minLength',
	'maxLength',
	'nonEmpty',

	// Value validations
	'minValue',
	'maxValue',
	'value',
	'notValue',

	// Size validations
	'size',
	'minSize',
	'maxSize',

	// Number validations
	'integer',
	'finite',
	'safeInteger',
	'multipleOf',

	// Date validations
	'minDate',
	'maxDate',

	// Custom validations
	'check',
	'custom',

	// Container schemas (schema + optional message)
	'array',
	'object',
	'strictObject',
	'looseObject',
	'tuple',
	'strictTuple',
	'looseTuple',
	'record',
	'map',
	'set',
	'union',
	'variant',
	'intersect',
	'instance',
	'enum_',
	'picklist',
	'literal',
];

const rule: TypeScriptRule = {
	id: 'valibot/no-inline-error-message',
	description: 'Disallow inline error messages - use externalized error maps for i18n support',
	categories: ['typescript', 'valibot', 'i18n', 'errors'],
	stages: ['lint', 'check', 'ci'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const methodName = getNamespaceMethodName(node, namespaceAlias);
			if (!methodName) return results;

			const args = node.arguments as AstNode[] | undefined;
			if (!args || args.length === 0) return results;

			// Check first argument for type methods
			if (FIRST_ARG_MESSAGE_METHODS.includes(methodName)) {
				if (args.length > 0 && isStringArgument(args[0])) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `Inline error message in ${namespaceAlias}.${methodName}() - externalize to *.errors.ts file`,
						ruleId: 'valibot/no-inline-error-message',
						tip: 'Create a colocated *.errors.ts file with LocalizedErrorMap for i18n support',
					});
				}
			}

			// Check last argument for validation methods
			if (LAST_ARG_MESSAGE_METHODS.includes(methodName)) {
				const lastArg = args[args.length - 1];
				if (args.length > getMinRequiredArgs(methodName) && isStringArgument(lastArg)) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'error',
						message: `Inline error message in ${namespaceAlias}.${methodName}() - externalize to *.errors.ts file`,
						ruleId: 'valibot/no-inline-error-message',
						tip: 'Create a colocated *.errors.ts file with LocalizedErrorMap for i18n support',
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

function isStringArgument(node: AstNode): boolean {
	return (
		node.type === 'StringLiteral' ||
		node.type === 'TemplateLiteral' ||
		(node.type === 'Literal' && typeof node.value === 'string')
	);
}

/**
 * Get minimum required arguments before optional error message.
 */
function getMinRequiredArgs(methodName: string): number {
	// Methods that have no required args (message is first arg)
	const noRequiredArgs = [
		'email',
		'url',
		'uuid',
		'cuid2',
		'ulid',
		'emoji',
		'ipv4',
		'ipv6',
		'ip',
		'mac',
		'hexColor',
		'hexadecimal',
		'base64',
		'integer',
		'finite',
		'safeInteger',
		'nonEmpty',
	];

	if (noRequiredArgs.includes(methodName)) return 0;

	// Methods with 1 required arg
	const oneRequiredArg = [
		'array',
		'tuple',
		'strictTuple',
		'looseTuple',
		'object',
		'strictObject',
		'looseObject',
		'record',
		'map',
		'set',
		'union',
		'variant',
		'intersect',
		'instance',
		'enum_',
		'picklist',
		'literal',
		'length',
		'minLength',
		'maxLength',
		'minValue',
		'maxValue',
		'value',
		'notValue',
		'size',
		'minSize',
		'maxSize',
		'multipleOf',
		'minDate',
		'maxDate',
		'regex',
		'check',
		'custom',
	];

	if (oneRequiredArg.includes(methodName)) return 1;

	return 0;
}

export default rule;
