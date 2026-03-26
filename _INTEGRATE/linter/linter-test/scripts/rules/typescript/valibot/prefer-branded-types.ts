/**
 * Rule: valibot/prefer-branded-types
 *
 * Suggests using v.brand() for IDs and other nominal types to prevent
 * accidental misuse of structurally-similar types.
 *
 * ❌ Risky:
 *   const UserIdSchema = v.string();
 *   const PostIdSchema = v.string();
 *   // Both are just strings - can accidentally pass PostId where UserId expected!
 *
 * ✅ Good:
 *   const UserIdSchema = v.pipe(v.string(), v.brand('UserId'));
 *   const PostIdSchema = v.pipe(v.string(), v.brand('PostId'));
 *   // Types are now distinct - compiler catches misuse
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';
import { getNamespaceAlias, getNamespaceMethodName } from '../../oxc-runner.js';

const VALIBOT_MODULE = 'valibot';

// Patterns that suggest an ID or identifier type
const ID_PATTERNS = [
	/Id$/i,
	/ID$/,
	/Uuid$/i,
	/UUID$/,
	/Ulid$/i,
	/ULID$/,
	/Key$/i,
	/Token$/i,
	/Code$/i,
	/Slug$/i,
];

const rule: TypeScriptRule = {
	id: 'valibot/prefer-branded-types',
	description: 'Use v.brand() for IDs and nominal types to prevent accidental misuse',
	categories: ['typescript', 'valibot', 'types', 'safety'],
	stages: ['lint', 'check'],
	scope: {
		type: 'file',
		patterns: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
	},

	visitor: {
		VariableDeclaration(node: AstNode, context: VisitorContext): LintResult[] {
			const results: LintResult[] = [];

			if (node.kind !== 'const') return results;

			const namespaceAlias = getNamespaceAlias(VALIBOT_MODULE, context.imports);
			if (!namespaceAlias) return results;

			const declarations = node.declarations as AstNode[] | undefined;
			if (!declarations) return results;

			for (const declarator of declarations) {
				const id = declarator.id as AstNode | undefined;
				const init = declarator.init as AstNode | undefined;

				if (!id || !init) continue;

				const name = id.name as string | undefined;
				if (!name || !name.endsWith('Schema')) continue;

				// Check if name matches ID patterns
				const baseName = name.replace(/Schema$/, '');
				const isIdType = ID_PATTERNS.some((p) => p.test(baseName));

				if (!isIdType) continue;

				// Check if already branded
				const initText = context.content.slice(init.start, init.end);
				if (initText.includes('.brand(')) continue;

				// Check if it's a simple string/number schema
				const methodName = getNamespaceMethodName(init, namespaceAlias);

				if (methodName === 'string' || methodName === 'number') {
					results.push({
						file: context.file,
						line: node.loc.start.line,
						column: node.loc.start.column + 1,
						severity: 'info',
						message: `Schema '${name}' looks like an ID type - consider using v.brand()`,
						ruleId: 'valibot/prefer-branded-types',
						tip: 'Branded types prevent accidentally mixing different ID types',
						example: `const ${name} = ${namespaceAlias}.pipe(${namespaceAlias}.${methodName}(), ${namespaceAlias}.brand('${baseName}'));`,
					});
				}

				// Check if it's a pipe without brand
				if (methodName === 'pipe') {
					if (!initText.includes('.brand(') && !initText.includes('brand(')) {
						results.push({
							file: context.file,
							line: node.loc.start.line,
							column: node.loc.start.column + 1,
							severity: 'info',
							message: `Schema '${name}' looks like an ID type - consider adding v.brand()`,
							ruleId: 'valibot/prefer-branded-types',
							tip: 'Add v.brand() to the pipe for type safety',
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

export default rule;
