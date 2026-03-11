/**
 * Resist Linter - oxc-based TypeScript Rule Runner
 *
 * Uses oxc-parser to parse TypeScript files and run AST-based rules
 */

import type {
	TypeScriptRule,
	LintResult,
	AstNode,
	VisitorContext,
	ImportInfo,
	ImportSpecifier,
} from './types.js';

// Dynamic import for oxc-parser (may not be installed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let parseSync: any = null;

async function ensureOxcParser(): Promise<boolean> {
	if (parseSync) return true;

	try {
		const oxc = await import('oxc-parser');
		parseSync = oxc.parseSync;
		return true;
	} catch {
		console.warn('oxc-parser not installed. TypeScript AST rules will be skipped.');
		console.warn('Install with: pnpm add -D oxc-parser');
		return false;
	}
}

// =============================================================================
// AST Traversal
// =============================================================================

/**
 * Walk an AST node and its children
 */
function walkNode(node: unknown, callback: (node: AstNode) => void): void {
	if (!node || typeof node !== 'object') return;

	const astNode = node as AstNode;

	// If it has a type, it's an AST node
	if (astNode.type) {
		callback(astNode);
	}

	// Recurse into children
	for (const key of Object.keys(astNode)) {
		const value = astNode[key];

		if (Array.isArray(value)) {
			for (const item of value) {
				walkNode(item, callback);
			}
		} else if (value && typeof value === 'object') {
			walkNode(value, callback);
		}
	}
}

// =============================================================================
// Import Extraction
// =============================================================================

/**
 * Extract import information from AST
 */
function extractImports(ast: AstNode, content: string): ImportInfo[] {
	const imports: ImportInfo[] = [];

	walkNode(ast, (node) => {
		if (node.type !== 'ImportDeclaration') return;

		const source = (node.source as { value?: string })?.value;
		if (!source) return;

		const specifiers: ImportSpecifier[] = [];
		const nodeSpecifiers = node.specifiers as AstNode[] | undefined;
		const isTypeOnly = !!(node.importKind === 'type' || node.isTypeOnly);

		if (nodeSpecifiers) {
			for (const spec of nodeSpecifiers) {
				if (spec.type === 'ImportDefaultSpecifier') {
					const local = (spec.local as { name?: string })?.name || 'default';
					specifiers.push({
						imported: 'default',
						local,
						isDefault: true,
						isNamespace: false,
					});
				} else if (spec.type === 'ImportNamespaceSpecifier') {
					const local = (spec.local as { name?: string })?.name || '*';
					specifiers.push({
						imported: '*',
						local,
						isDefault: false,
						isNamespace: true,
					});
				} else if (spec.type === 'ImportSpecifier') {
					const imported = (spec.imported as { name?: string })?.name ||
						(spec.imported as { value?: string })?.value || '';
					const local = (spec.local as { name?: string })?.name || imported;
					specifiers.push({
						imported,
						local,
						isDefault: false,
						isNamespace: false,
					});
				}
			}
		}

		imports.push({
			source,
			specifiers,
			isTypeOnly,
		});
	});

	return imports;
}

// =============================================================================
// Visitor Context
// =============================================================================

/**
 * Create a visitor context for a file
 */
function createVisitorContext(
	file: string,
	content: string,
	ast: AstNode,
	rule: TypeScriptRule
): VisitorContext {
	const imports = extractImports(ast, content);

	return {
		file,
		content,
		ast,
		imports,
		rule,

		getNodeText(node: AstNode): string {
			return content.slice(node.start, node.end);
		},

		isImportedFrom(identifier: string, moduleName: string): boolean {
			for (const imp of imports) {
				if (imp.source !== moduleName) continue;

				// Check if identifier matches any specifier
				for (const spec of imp.specifiers) {
					if (spec.local === identifier) return true;
					if (spec.isNamespace) {
						// For namespace imports like `import * as v from 'valibot'`
						// Check if identifier starts with the namespace
						if (identifier.startsWith(spec.local + '.')) return true;
					}
				}
			}
			return false;
		},
	};
}

// =============================================================================
// Rule Execution
// =============================================================================

/**
 * Run TypeScript rules on a file
 */
export async function runTypeScriptRules(
	filePath: string,
	content: string,
	rules: TypeScriptRule[]
): Promise<LintResult[]> {
	if (rules.length === 0) return [];

	// Ensure oxc-parser is available
	const hasParser = await ensureOxcParser();
	if (!hasParser || !parseSync) return [];

	// Parse the file
	let ast: AstNode;
	try {
		const result = parseSync(filePath, content);
		ast = result.program as AstNode;
	} catch (error) {
		// Parse error - skip this file
		console.warn(`Failed to parse ${filePath}:`, error);
		return [];
	}

	const results: LintResult[] = [];

	// Walk the AST and run each rule's visitors
	walkNode(ast, (node) => {
		for (const rule of rules) {
			const visitorFn = rule.visitor[node.type as keyof typeof rule.visitor];
			if (!visitorFn) continue;

			const context = createVisitorContext(filePath, content, ast, rule);

			try {
				const ruleResults = visitorFn(node, context);
				results.push(...ruleResults);
			} catch (error) {
				console.error(`Error in rule ${rule.id} at ${node.type}:`, error);
			}
		}
	});

	return results;
}

// =============================================================================
// Helper: Check Type Annotation
// =============================================================================

/**
 * Get the type annotation text from a variable declarator
 */
export function getTypeAnnotation(node: AstNode, content: string): string | null {
	const typeAnnotation = node.typeAnnotation as AstNode | undefined;
	if (!typeAnnotation) return null;

	// Get the type annotation node (skip the `: ` prefix)
	const typeNode = typeAnnotation.typeAnnotation as AstNode | undefined;
	if (!typeNode) return content.slice(typeAnnotation.start, typeAnnotation.end);

	return content.slice(typeNode.start, typeNode.end);
}

/**
 * Check if a type annotation references a module
 */
export function typeReferencesModule(
	typeText: string,
	moduleName: string,
	imports: ImportInfo[]
): boolean {
	// Find the namespace import for the module
	for (const imp of imports) {
		if (imp.source !== moduleName) continue;

		for (const spec of imp.specifiers) {
			// Namespace import: `import * as v from 'valibot'`
			if (spec.isNamespace && typeText.startsWith(spec.local + '.')) {
				return true;
			}

			// Named import: check if type uses this name
			if (typeText.includes(spec.local)) {
				return true;
			}
		}
	}

	return false;
}

// =============================================================================
// Additional Helpers for Valibot Rules
// =============================================================================

/**
 * Check if a module is imported in the file
 */
export function hasImport(moduleName: string, imports: ImportInfo[]): boolean {
	return imports.some((imp) => imp.source === moduleName);
}

/**
 * Get the namespace alias for a module (e.g., 'v' for 'import * as v from "valibot"')
 */
export function getNamespaceAlias(moduleName: string, imports: ImportInfo[]): string | null {
	for (const imp of imports) {
		if (imp.source !== moduleName) continue;
		for (const spec of imp.specifiers) {
			if (spec.isNamespace) return spec.local;
		}
	}
	return null;
}

/**
 * Check if a call expression is calling a specific method on a module namespace
 * e.g., isNamespaceMethodCall(node, 'v', 'object') for v.object(...)
 */
export function isNamespaceMethodCall(
	node: AstNode,
	namespaceAlias: string,
	methodName: string
): boolean {
	if (node.type !== 'CallExpression') return false;

	const callee = node.callee as AstNode | undefined;
	if (!callee || callee.type !== 'MemberExpression') return false;

	const object = callee.object as AstNode | undefined;
	const property = callee.property as AstNode | undefined;

	if (!object || !property) return false;

	const objectName = object.name as string | undefined;
	const propertyName = property.name as string | undefined;

	return objectName === namespaceAlias && propertyName === methodName;
}

/**
 * Get the method name being called on a namespace
 * e.g., for v.object(...) returns 'object'
 */
export function getNamespaceMethodName(node: AstNode, namespaceAlias: string): string | null {
	if (node.type !== 'CallExpression') return null;

	const callee = node.callee as AstNode | undefined;
	if (!callee || callee.type !== 'MemberExpression') return null;

	const object = callee.object as AstNode | undefined;
	const property = callee.property as AstNode | undefined;

	if (!object || !property) return null;

	const objectName = object.name as string | undefined;
	if (objectName !== namespaceAlias) return null;

	return (property.name as string) || null;
}

/**
 * Check if a node is a call to any of the specified methods on a namespace
 */
export function isNamespaceMethodCallAny(
	node: AstNode,
	namespaceAlias: string,
	methodNames: string[]
): boolean {
	const methodName = getNamespaceMethodName(node, namespaceAlias);
	return methodName !== null && methodNames.includes(methodName);
}

/**
 * Get all type alias declarations in the file
 */
export function getTypeAliases(ast: AstNode): Map<string, AstNode> {
	const aliases = new Map<string, AstNode>();

	walkNode(ast, (node) => {
		if (node.type === 'TSTypeAliasDeclaration') {
			const id = node.id as AstNode | undefined;
			const name = id?.name as string | undefined;
			if (name) {
				aliases.set(name, node);
			}
		}
	});

	return aliases;
}

/**
 * Get all schema definitions (const XxxSchema = v.xxx(...))
 */
export function getSchemaDefinitions(
	ast: AstNode,
	content: string,
	namespaceAlias: string
): Map<string, AstNode> {
	const schemas = new Map<string, AstNode>();

	walkNode(ast, (node) => {
		if (node.type !== 'VariableDeclaration') return;
		if (node.kind !== 'const') return;

		const declarations = node.declarations as AstNode[] | undefined;
		if (!declarations) return;

		for (const decl of declarations) {
			const id = decl.id as AstNode | undefined;
			const init = decl.init as AstNode | undefined;

			if (!id || !init) continue;

			const name = id.name as string | undefined;
			if (!name) continue;

			// Check if name ends with Schema
			if (!name.endsWith('Schema') && !name.endsWith('schema')) continue;

			// Check if initializer is a valibot call
			if (init.type === 'CallExpression') {
				const callee = init.callee as AstNode | undefined;
				if (callee?.type === 'MemberExpression') {
					const object = callee.object as AstNode | undefined;
					if (object?.name === namespaceAlias) {
						schemas.set(name, decl);
					}
				}
			}
		}
	});

	return schemas;
}

/**
 * Check if a type alias is derived from v.InferOutput or v.InferInput
 */
export function isValibotInferredType(node: AstNode, content: string): boolean {
	const typeText = content.slice(node.start, node.end);
	return (
		typeText.includes('InferOutput') ||
		typeText.includes('InferInput') ||
		typeText.includes('Output') ||
		typeText.includes('Input')
	);
}

/**
 * Extract the schema name from a type like v.InferOutput<typeof UserSchema>
 */
export function extractSchemaNameFromInfer(typeText: string): string | null {
	// Match patterns like: v.InferOutput<typeof UserSchema>
	const match = typeText.match(/typeof\s+(\w+Schema)/);
	return match ? match[1] : null;
}

/**
 * Find all exported items in a file
 */
export function getExports(ast: AstNode): {
	named: Map<string, AstNode>;
	default: AstNode | null;
	reExports: Array<{ source: string; specifiers: string[] }>;
} {
	const named = new Map<string, AstNode>();
	let defaultExport: AstNode | null = null;
	const reExports: Array<{ source: string; specifiers: string[] }> = [];

	walkNode(ast, (node) => {
		if (node.type === 'ExportNamedDeclaration') {
			// export const foo = ...
			const declaration = node.declaration as AstNode | undefined;
			if (declaration) {
				if (declaration.type === 'VariableDeclaration') {
					const declarations = declaration.declarations as AstNode[] | undefined;
					if (declarations) {
						for (const decl of declarations) {
							const id = decl.id as AstNode | undefined;
							const name = id?.name as string | undefined;
							if (name) named.set(name, decl);
						}
					}
				} else if (declaration.type === 'FunctionDeclaration') {
					const id = declaration.id as AstNode | undefined;
					const name = id?.name as string | undefined;
					if (name) named.set(name, declaration);
				} else if (declaration.type === 'TSTypeAliasDeclaration') {
					const id = declaration.id as AstNode | undefined;
					const name = id?.name as string | undefined;
					if (name) named.set(name, declaration);
				}
			}

			// export { foo, bar }
			const specifiers = node.specifiers as AstNode[] | undefined;
			if (specifiers) {
				const source = (node.source as { value?: string })?.value;
				if (source) {
					// Re-export: export { foo } from './bar'
					const names = specifiers
						.map((s) => {
							const exported = s.exported as AstNode | undefined;
							return exported?.name as string | undefined;
						})
						.filter(Boolean) as string[];
					reExports.push({ source, specifiers: names });
				} else {
					// Local export: export { foo }
					for (const spec of specifiers) {
						const local = spec.local as AstNode | undefined;
						const name = local?.name as string | undefined;
						if (name) named.set(name, spec);
					}
				}
			}
		} else if (node.type === 'ExportDefaultDeclaration') {
			defaultExport = node;
		} else if (node.type === 'ExportAllDeclaration') {
			const source = (node.source as { value?: string })?.value;
			if (source) {
				reExports.push({ source, specifiers: ['*'] });
			}
		}
	});

	return { named, default: defaultExport, reExports };
}
