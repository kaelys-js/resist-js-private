/**
 * Rule: valibot/prefer-pipe
 *
 * Enforces use of v.pipe() for chained validations.
 *
 * The v.pipe() function is the modern way to chain validations in Valibot v0.31+.
 * This rule warns when deprecated chaining patterns might be used.
 *
 * ✅ Good:
 *   const EmailSchema = v.pipe(v.string(), v.email(), v.maxLength(255));
 *   const AgeSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(120));
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Actions/transformations that should be inside pipe()
const PIPE_ACTIONS = [
	// String validations
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
	'mac48',
	'mac64',
	'hexColor',
	'hexadecimal',
	'base64',
	'toLowerCase',
	'toUpperCase',
	'trim',
	'trimStart',
	'trimEnd',
	'normalize',

	// Number validations
	'integer',
	'finite',
	'safeInteger',
	'multipleOf',

	// Length validations
	'length',
	'minLength',
	'maxLength',

	// Value validations
	'value',
	'minValue',
	'maxValue',
	'notValue',

	// Size validations
	'size',
	'minSize',
	'maxSize',

	// Bytes validations
	'bytes',
	'minBytes',
	'maxBytes',

	// Array validations
	'includes',
	'excludes',
	'every',
	'some',

	// Date validations
	'minDate',
	'maxDate',
	'toMinValue',
	'toMaxValue',

	// Transformations
	'transform',
	'brand',
	'readonly',
	'rawTransform',
	'rawCheck',

	// Checks
	'check',
	'refine',
	'forward',
	'partialCheck',
];

const rule: TypeScriptRule = {
	id: 'valibot/prefer-pipe',
	description: 'Use v.pipe() for chained validations',
	categories: ['typescript', 'valibot', 'style'],
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

			// Check if this is a pipe action being used at top level
			// (should be inside pipe())
			if (PIPE_ACTIONS.includes(methodName)) {
				// Check if parent is NOT a pipe call
				// This is a heuristic - we're checking if this call is directly
				// assigned to a const (which would be wrong usage)
				// The AST doesn't easily give us parent context, so we check
				// if arguments look like they might be schema-level usage

				const args = node.arguments as AstNode[] | undefined;

				// If it's being called with no arguments or simple arguments,
				// it's likely being used correctly inside pipe()
				// If it's being called with a schema as first argument,
				// it might be deprecated chaining
				if (args && args.length > 0) {
					const firstArg = args[0];
					// Check if first arg is another valibot call (deprecated chaining)
					if (firstArg.type === 'CallExpression') {
						const innerMethod = getNamespaceMethodName(firstArg, namespaceAlias);
						if (
							innerMethod &&
							['string', 'number', 'object', 'array'].includes(innerMethod)
						) {
							results.push({
								file: context.file,
								line: node.loc.start.line,
								column: node.loc.start.column + 1,
								severity: 'warning',
								message: `Use v.pipe() instead of passing schema to ${methodName}()`,
								ruleId: 'valibot/prefer-pipe',
								tip: 'Chain validations using pipe(): v.pipe(v.string(), v.email())',
								example: `${namespaceAlias}.pipe(${namespaceAlias}.${innerMethod}(), ${namespaceAlias}.${methodName}())`,
							});
						}
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

export default rule;
