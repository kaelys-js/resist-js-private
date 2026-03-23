/**
 * Custom Linter — Type Definitions
 *
 * Defines the rule interface, AST visitor types, and lint result format
 * for the oxc-parser-based custom linting system.
 *
 * @module
 */

// =============================================================================
// Lint Results
// =============================================================================

/** A structured code fix that can be auto-applied. */
export type LintFix = {
  /** Byte offset range in the source to replace */
  range: { start: number; end: number };
  /** Replacement text (empty string = deletion) */
  text: string;
};

/** A single lint diagnostic produced by a rule. */
export type LintResult = {
  /** Absolute file path */
  file: string;
  /** 1-based line number */
  line: number;
  /** 1-based column number */
  column: number;
  /** End line (optional, for range highlighting) */
  endLine?: number;
  /** End column (optional, for range highlighting) */
  endColumn?: number;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Human-readable diagnostic message */
  message: string;
  /** Rule ID that produced this diagnostic (e.g. 'jsdoc/require-param') */
  ruleId: string;
  /** Short suggestion for fixing the issue */
  tip?: string;
  /** Code example showing the correct form */
  example?: string;
  /** Structured auto-fix — every result MUST include a fix */
  fix: LintFix;
};

// =============================================================================
// AST Types (oxc-parser output)
// =============================================================================

/** Generic AST node from oxc-parser. */
export type AstNode = {
  /** Node type (e.g. 'FunctionDeclaration', 'CallExpression') */
  type: string;
  /** Start offset in source */
  start: number;
  /** End offset in source */
  end: number;
  /** Source location with line/column info */
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  /** Additional node-specific properties */
  [key: string]: unknown;
};

// =============================================================================
// Visitor Types
// =============================================================================

/** Function signature for AST visitor callbacks. */
export type VisitorFn = (node: AstNode, context: VisitorContext) => LintResult[];

/** Map of AST node types to visitor functions. */
export type AstVisitor = {
  // Program
  Program?: VisitorFn;

  // Declarations
  VariableDeclaration?: VisitorFn;
  FunctionDeclaration?: VisitorFn;
  ClassDeclaration?: VisitorFn;
  ImportDeclaration?: VisitorFn;
  ExportNamedDeclaration?: VisitorFn;
  ExportDefaultDeclaration?: VisitorFn;
  ExportAllDeclaration?: VisitorFn;

  // TypeScript declarations
  TSTypeAliasDeclaration?: VisitorFn;
  TSInterfaceDeclaration?: VisitorFn;
  TSEnumDeclaration?: VisitorFn;

  // Expressions
  CallExpression?: VisitorFn;
  ArrowFunctionExpression?: VisitorFn;
  FunctionExpression?: VisitorFn;

  // Statements
  ThrowStatement?: VisitorFn;
  CatchClause?: VisitorFn;
  ExpressionStatement?: VisitorFn;

  // Expressions (additional)
  ConditionalExpression?: VisitorFn;
  MemberExpression?: VisitorFn;
  StaticMemberExpression?: VisitorFn;

  // Type assertions
  TSAsExpression?: VisitorFn;
  TSTypeAssertion?: VisitorFn;
  TSNonNullExpression?: VisitorFn;
  TSSatisfiesExpression?: VisitorFn;
};

/** Import specifier info extracted from an ImportDeclaration. */
export type ImportSpecifier = {
  /** Imported name (or 'default' / '*') */
  imported: string;
  /** Local alias */
  local: string;
  /** Whether this is the default import */
  isDefault: boolean;
  /** Whether this is a namespace import (import * as x) */
  isNamespace: boolean;
};

/** Parsed import declaration info. */
export type ImportInfo = {
  /** Module specifier (e.g. 'valibot', './foo') */
  source: string;
  /** Individual import specifiers */
  specifiers: ImportSpecifier[];
  /** Whether the import is type-only */
  isTypeOnly: boolean;
};

/** Context passed to visitor functions during AST traversal. */
export type VisitorContext = {
  /** Absolute path to the file being linted */
  file: string;
  /** Full file contents */
  content: string;
  /** Parsed AST root node */
  ast: AstNode;
  /** All imports in the file */
  imports: ImportInfo[];
  /** Extract source text for a node */
  getNodeText: (node: AstNode) => string;
  /** Check if an identifier is imported from a specific module */
  isImportedFrom: (identifier: string, moduleName: string) => boolean;
  /** The rule currently being evaluated */
  rule: TypeScriptRule;
};

// =============================================================================
// Rule Interface
// =============================================================================

/** A TypeScript AST-based lint rule. */
export type TypeScriptRule = {
  /** Unique rule ID (e.g. 'jsdoc/require-param') */
  id: string;
  /** Human-readable description */
  description: string;
  /** File glob patterns this rule applies to */
  patterns: string[];
  /** AST visitor functions */
  visitor: Partial<AstVisitor>;
};
