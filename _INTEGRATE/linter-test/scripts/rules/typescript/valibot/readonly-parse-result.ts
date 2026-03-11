/**
 * Rule: valibot/readonly-parse-result
 *
 * Suggests treating parsed results as readonly to prevent accidental mutation.
 *
 * ❌ Bad:
 *   const user = v.parse(UserSchema, input);
 *   // user is mutable - can be accidentally modified
 *
 * ✅ Good:
 *   const user = v.parse(UserSchema, input) as const;
 *   // or
 *   const user: Readonly<User> = v.parse(UserSchema, input);
 *   // or
 *   const user = Object.freeze(v.parse(UserSchema, input));
 *
 * Note: Consider using v.readonly() wrapper in your schema for deep readonly.
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, isNamespaceMethodCallAny, getTypeAnnotation } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

const PARSE_METHODS = ['parse', 'parseAsync'];

const rule: TypeScriptRule = {
	id: 'valibot/readonly-parse-result',
	description: 'Consider making parse results readonly to prevent accidental mutation',
	categories: ['typescript', 'valibot', 'immutability'],
	stages: ['lint', 'check'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			// Only check const declarations
			if (node.kind !== 'const') return results;

			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return results;

			for (const decl of declarations) {
				const id = decl.id as AstNode | undefined;
				const init = decl.init as AstNode | undefined;

				if (!id || !init) continue;

				const name = id.name as string | undefined;
				if (!name) continue;

				// Check if init is a parse call
				if (!isNamespaceMethodCallAny(init, namespaceAlias, PARSE_METHODS)) continue;

				// Check if already has readonly treatment
				const typeAnnotation = getTypeAnnotation(id, context.content);

				const isReadonly =
					typeAnnotation?.includes('Readonly<') ||
					typeAnnotation?.includes('readonly ');

				// Check for Object.freeze wrapper
				const initText = context.content.slice(init.start, init.end);
				const isFrozen = initText.includes('Object.freeze(');

				// Check for `as const`
				const afterInit = context.content.slice(init.end, init.end + 20);
				const hasAsConst = /\s*as\s+const/.test(afterInit);

				if (!isReadonly && !isFrozen && !hasAsConst) {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'info',
						message: `Parsed data '${name}' is mutable - consider making it readonly`,
						ruleId: 'valibot/readonly-parse-result',
						tip: 'Use Readonly<Type>, Object.freeze(), or as const to prevent accidental mutation',
						example: `const ${name}: Readonly<Type> = ${namespaceAlias}.parse(Schema, input);\n// or use v.readonly() wrapper in your schema`,
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
