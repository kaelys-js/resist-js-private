/**
 * Resist Linter - Custom Rules Type Definitions
 */

// =============================================================================
// Lint Results
// =============================================================================

export interface LintResult {
	file: string;
	line: number;
	column: number;
	endLine?: number;
	endColumn?: number;
	severity: 'error' | 'warning' | 'info';
	message: string;
	ruleId: string;
	tip?: string; // Helpful suggestion for fixing
	example?: string; // Code example for fix
}

// =============================================================================
// Rule Context
// =============================================================================

export interface RuleContext {
	/** Absolute path to monorepo root */
	rootDir: string;

	/** Path to pnpm-workspace.yaml (if exists) */
	workspaceFile?: string;

	/** Staged files (for pre-commit stage) */
	stagedFiles?: string[];

	/** Current stage being run */
	stage: Stage;

	/** Get all files in workspace (respects .gitignore) */
	allFiles: () => AsyncIterable<string>;

	/** Read file contents */
	readFile: (path: string) => Promise<string>;

	/** Check if file exists */
	fileExists: (path: string) => Promise<boolean>;

	/** Check if directory exists */
	dirExists: (path: string) => Promise<boolean>;

	/** Get all workspace packages */
	getWorkspacePackages: () => Promise<WorkspacePackage[]>;

	/** Search files for pattern (like grep) */
	search: (pattern: RegExp, files?: string[]) => AsyncIterable<SearchMatch>;
}

export interface WorkspacePackage {
	/** Absolute path to package.json */
	path: string;

	/** Package directory */
	dir: string;

	/** Parsed package.json contents */
	packageJson: Record<string, unknown>;

	/** Package name from package.json */
	name?: string;
}

export interface SearchMatch {
	file: string;
	line: number;
	column: number;
	match: string;
	lineContent: string;
}

// =============================================================================
// Stages
// =============================================================================

export type Stage = 'lint' | 'check' | 'pre-commit' | 'build' | 'ci' | 'test';

export const ALL_STAGES: Stage[] = ['lint', 'check', 'pre-commit', 'build', 'ci', 'test'];

// =============================================================================
// Rule Scope
// =============================================================================

export type RuleScope =
	| { type: 'file'; patterns: string[] } // Per-file: ['**/*.ts', '**/*.tsx']
	| { type: 'workspace' } // Whole workspace check
	| { type: 'package'; patterns?: string[] }; // Per-package check

// =============================================================================
// Base Rule Interface
// =============================================================================

export interface Rule {
	/** Unique rule ID (e.g., 'safety/no-merge-conflicts') */
	id: string;

	/** Human-readable description */
	description: string;

	/** Categories for filtering (e.g., ['safety', 'ci']) */
	categories: string[];

	/** Stages where this rule runs */
	stages: Stage[];

	/** What scope does this rule apply to? */
	scope: RuleScope;

	/** The check function */
	check: (context: RuleContext) => Promise<LintResult[]>;

	/** Optional fix function */
	fix?: (context: RuleContext, result: LintResult) => Promise<string | null>;
}

// =============================================================================
// TypeScript AST Rule
// =============================================================================

export interface TypeScriptRule extends Rule {
	scope: { type: 'file'; patterns: string[] };

	/** AST visitor functions */
	visitor: Partial<AstVisitor>;
}

export interface AstVisitor {
	// Program
	Program: VisitorFn;

	// Declarations
	VariableDeclaration: VisitorFn;
	FunctionDeclaration: VisitorFn;
	ClassDeclaration: VisitorFn;
	ImportDeclaration: VisitorFn;
	ExportNamedDeclaration: VisitorFn;
	ExportDefaultDeclaration: VisitorFn;
	ExportAllDeclaration: VisitorFn;

	// TypeScript declarations
	TSTypeAliasDeclaration: VisitorFn;
	TSInterfaceDeclaration: VisitorFn;
	TSEnumDeclaration: VisitorFn;
	TSModuleDeclaration: VisitorFn;

	// Expressions
	CallExpression: VisitorFn;
	MemberExpression: VisitorFn;
	ArrowFunctionExpression: VisitorFn;
	FunctionExpression: VisitorFn;
	NewExpression: VisitorFn;
	ObjectExpression: VisitorFn;
	ArrayExpression: VisitorFn;
	AssignmentExpression: VisitorFn;

	// Identifiers & Literals
	Identifier: VisitorFn;
	StringLiteral: VisitorFn;
	NumericLiteral: VisitorFn;
	TemplateLiteral: VisitorFn;

	// TypeScript types
	TSTypeAnnotation: VisitorFn;
	TSTypeReference: VisitorFn;
	TSTypeLiteral: VisitorFn;
	TSUnionType: VisitorFn;
	TSIntersectionType: VisitorFn;
	TSArrayType: VisitorFn;
	TSTupleType: VisitorFn;
	TSFunctionType: VisitorFn;
	TSConditionalType: VisitorFn;
	TSIndexedAccessType: VisitorFn;
	TSMappedType: VisitorFn;
	TSLiteralType: VisitorFn;
	TSTemplateLiteralType: VisitorFn;

	// Statements
	ReturnStatement: VisitorFn;
	ThrowStatement: VisitorFn;
	TryStatement: VisitorFn;
	IfStatement: VisitorFn;
	SwitchStatement: VisitorFn;
	ForStatement: VisitorFn;
	ForInStatement: VisitorFn;
	ForOfStatement: VisitorFn;
	WhileStatement: VisitorFn;

	// Class members
	MethodDefinition: VisitorFn;
	PropertyDefinition: VisitorFn;
	ClassProperty: VisitorFn;

	// Patterns
	ObjectPattern: VisitorFn;
	ArrayPattern: VisitorFn;
	AssignmentPattern: VisitorFn;
	RestElement: VisitorFn;

	// Type assertions
	TSAsExpression: VisitorFn;
	TSTypeAssertion: VisitorFn;
	TSNonNullExpression: VisitorFn;
	TSSatisfiesExpression: VisitorFn;
}

export type VisitorFn = (node: AstNode, context: VisitorContext) => LintResult[];

export interface AstNode {
	type: string;
	start: number;
	end: number;
	loc: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
	[key: string]: unknown;
}

export interface VisitorContext {
	/** Current file path */
	file: string;

	/** File contents */
	content: string;

	/** Parsed AST */
	ast: AstNode;

	/** All imports in this file */
	imports: ImportInfo[];

	/** Get text for a node */
	getNodeText: (node: AstNode) => string;

	/** Check if identifier is imported from a module */
	isImportedFrom: (identifier: string, moduleName: string) => boolean;

	/** Get the rule being run */
	rule: TypeScriptRule;
}

export interface ImportInfo {
	source: string; // 'valibot', 'react', etc.
	specifiers: ImportSpecifier[];
	isTypeOnly: boolean;
}

export interface ImportSpecifier {
	imported: string; // Original name
	local: string; // Local alias (usually same)
	isDefault: boolean;
	isNamespace: boolean; // import * as v
}

// =============================================================================
// Rule Registration
// =============================================================================

export interface RuleModule {
	default?: Rule | Rule[];
	rules?: Rule[];
}

export interface LoadedRules {
	all: Rule[];
	byId: Map<string, Rule>;
	byCategory: Map<string, Rule[]>;
	byStage: Map<Stage, Rule[]>;
	typescript: TypeScriptRule[];
	workspace: Rule[];
	package: Rule[];
}
