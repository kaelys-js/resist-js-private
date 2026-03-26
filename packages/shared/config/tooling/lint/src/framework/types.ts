/**
 * Custom Linter — Type Definitions
 *
 * Defines the rule interface, AST visitor types, and lint result format
 * for the oxc-parser-based custom linting system.
 *
 * All types are derived from Valibot schemas via `v.InferOutput<>`.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Runtime check: value is a function.
 *
 * @param {unknown} val - Value to check
 * @returns {boolean} Whether the value is a function
 */
const isFn = (val: unknown): boolean => typeof val === 'function';

/**
 * Runtime check: value is a non-null object.
 *
 * @param {unknown} val - Value to check
 * @returns {boolean} Whether the value is a non-null object
 */
const isObj = (val: unknown): boolean => typeof val === 'object' && val !== null;

// =============================================================================
// Lint Results
// =============================================================================

/** Schema for a structured code fix that can be auto-applied. */
export const LintFixSchema = v.strictObject({
  /** Byte offset range in the source to replace */
  range: v.strictObject({ start: v.number(), end: v.number() }),
  /** Replacement text (empty string = deletion) */
  text: v.string(),
});

/** A structured code fix that can be auto-applied. See {@link LintFixSchema}. */
export type LintFix = v.InferOutput<typeof LintFixSchema>;

/** Schema for a single lint diagnostic produced by a rule. */
export const LintResultSchema = v.strictObject({
  /** Absolute file path */
  file: v.string(),
  /** 1-based line number */
  line: v.number(),
  /** 1-based column number */
  column: v.number(),
  /** End line (optional, for range highlighting) */
  endLine: v.optional(v.number()),
  /** End column (optional, for range highlighting) */
  endColumn: v.optional(v.number()),
  /** Severity level */
  severity: v.picklist(['error', 'warning', 'info']),
  /** Human-readable diagnostic message */
  message: v.string(),
  /** Rule ID that produced this diagnostic (e.g. 'jsdoc/require-param') */
  ruleId: v.string(),
  /** Short suggestion for fixing the issue */
  tip: v.optional(v.string()),
  /** Code example showing the correct form */
  example: v.optional(v.string()),
  /** Structured auto-fix — every result MUST include a fix */
  fix: LintFixSchema,
});

/** A single lint diagnostic produced by a rule. See {@link LintResultSchema}. */
export type LintResult = v.InferOutput<typeof LintResultSchema>;

// =============================================================================
// AST Types (oxc-parser output)
// =============================================================================

/** Schema for a generic AST node from oxc-parser. */
export const AstNodeSchema = v.objectWithRest(
  {
    /** Node type (e.g. 'FunctionDeclaration', 'CallExpression') */
    type: v.string(),
    /** Start offset in source */
    start: v.number(),
    /** End offset in source */
    end: v.number(),
    /** Source location with line/column info */
    loc: v.strictObject({
      start: v.strictObject({ line: v.number(), column: v.number() }),
      end: v.strictObject({ line: v.number(), column: v.number() }),
    }),
  },
  v.unknown(),
);

/** Generic AST node from oxc-parser. See {@link AstNodeSchema}. */
export type AstNode = v.InferOutput<typeof AstNodeSchema>;

// =============================================================================
// Visitor Types
// =============================================================================

/**
 * Function signature for AST visitor callbacks.
 *
 * Defined explicitly to break the circular type reference:
 * VisitorContext → TypeScriptRule → AstVisitor → VisitorFn → VisitorContext
 */
export type VisitorFn = (node: AstNode, context: VisitorContext) => LintResult[];

/** Schema for visitor function values. See {@link VisitorFn}. */
export const VisitorFnSchema = v.custom<VisitorFn>(isFn);

/** Schema for the map of AST node types to visitor functions. */
export const AstVisitorSchema = v.strictObject({
  // Program
  Program: v.optional(VisitorFnSchema),

  // Declarations
  VariableDeclaration: v.optional(VisitorFnSchema),
  FunctionDeclaration: v.optional(VisitorFnSchema),
  ClassDeclaration: v.optional(VisitorFnSchema),
  ImportDeclaration: v.optional(VisitorFnSchema),
  ExportNamedDeclaration: v.optional(VisitorFnSchema),
  ExportDefaultDeclaration: v.optional(VisitorFnSchema),
  ExportAllDeclaration: v.optional(VisitorFnSchema),

  // TypeScript declarations
  TSTypeAliasDeclaration: v.optional(VisitorFnSchema),
  TSInterfaceDeclaration: v.optional(VisitorFnSchema),
  TSEnumDeclaration: v.optional(VisitorFnSchema),

  // Expressions
  CallExpression: v.optional(VisitorFnSchema),
  ArrowFunctionExpression: v.optional(VisitorFnSchema),
  FunctionExpression: v.optional(VisitorFnSchema),

  // Statements
  ThrowStatement: v.optional(VisitorFnSchema),
  CatchClause: v.optional(VisitorFnSchema),
  ExpressionStatement: v.optional(VisitorFnSchema),
  BlockStatement: v.optional(VisitorFnSchema),

  // Expressions (additional)
  ConditionalExpression: v.optional(VisitorFnSchema),
  MemberExpression: v.optional(VisitorFnSchema),
  StaticMemberExpression: v.optional(VisitorFnSchema),

  // Type assertions
  TSAsExpression: v.optional(VisitorFnSchema),
  TSTypeAssertion: v.optional(VisitorFnSchema),
  TSNonNullExpression: v.optional(VisitorFnSchema),
  TSSatisfiesExpression: v.optional(VisitorFnSchema),
  TSTypeAnnotation: v.optional(VisitorFnSchema),
  TSFunctionType: v.optional(VisitorFnSchema),

  // Union types
  TSUnionType: v.optional(VisitorFnSchema),

  // Logical expressions
  LogicalExpression: v.optional(VisitorFnSchema),

  // If statements
  IfStatement: v.optional(VisitorFnSchema),
});

/** Map of AST node types to visitor functions. See {@link AstVisitorSchema}. */
export type AstVisitor = v.InferOutput<typeof AstVisitorSchema>;

/** Schema for import specifier info extracted from an ImportDeclaration. */
export const ImportSpecifierSchema = v.strictObject({
  /** Imported name (or 'default' / '*') */
  imported: v.string(),
  /** Local alias */
  local: v.string(),
  /** Whether this is the default import */
  isDefault: v.boolean(),
  /** Whether this is a namespace import (import * as x) */
  isNamespace: v.boolean(),
});

/** Import specifier info extracted from an ImportDeclaration. See {@link ImportSpecifierSchema}. */
export type ImportSpecifier = v.InferOutput<typeof ImportSpecifierSchema>;

/** Schema for parsed import declaration info. */
export const ImportInfoSchema = v.strictObject({
  /** Module specifier (e.g. 'valibot', './foo') */
  source: v.string(),
  /** Individual import specifiers */
  specifiers: v.array(ImportSpecifierSchema),
  /** Whether the import is type-only */
  isTypeOnly: v.boolean(),
});

/** Parsed import declaration info. See {@link ImportInfoSchema}. */
export type ImportInfo = v.InferOutput<typeof ImportInfoSchema>;

// =============================================================================
// Visitor Context
// =============================================================================

/** Schema for the context passed to visitor functions during AST traversal. */
export const VisitorContextSchema = v.strictObject({
  /** Absolute path to the file being linted */
  file: v.string(),
  /** Full file contents */
  content: v.string(),
  /** Parsed AST root node */
  ast: AstNodeSchema,
  /** All imports in the file */
  imports: v.array(ImportInfoSchema),
  /** Extract source text for a node */
  getNodeText: v.custom<(node: AstNode) => string>(isFn),
  /** Check if an identifier is imported from a specific module */
  isImportedFrom: v.custom<(identifier: string, moduleName: string) => boolean>(isFn),
  /** The rule currently being evaluated */
  rule: v.custom<TypeScriptRule>(isObj),
  /** Per-rule configuration options from the config file */
  ruleOptions: v.optional(v.record(v.string(), v.unknown())),
});

/** Context passed to visitor functions during AST traversal. See {@link VisitorContextSchema}. */
export type VisitorContext = v.InferOutput<typeof VisitorContextSchema>;

// =============================================================================
// Rule Interface
// =============================================================================

/** Schema for a TypeScript AST-based lint rule. */
export const TypeScriptRuleSchema = v.strictObject({
  /** Unique rule ID (e.g. 'jsdoc/require-param') */
  id: v.string(),
  /** Human-readable description */
  description: v.string(),
  /** File glob patterns this rule applies to */
  patterns: v.array(v.string()),
  /** AST visitor functions */
  visitor: v.custom<Partial<AstVisitor>>(isObj),
  /** Optional cross-file finalization — called after ALL files are processed */
  finalize: v.optional(v.custom<() => LintResult[]>(isFn)),
  /** Whether this rule provides real auto-fixes (not just placeholder no-ops) */
  fixable: v.optional(v.boolean()),
});

/** A TypeScript AST-based lint rule. See {@link TypeScriptRuleSchema}. */
export type TypeScriptRule = v.InferOutput<typeof TypeScriptRuleSchema>;

// =============================================================================
// Package.json Rule Interface
// =============================================================================

/** Schema for parsed package.json content. */
export const PackageJsonSchema = v.objectWithRest(
  {
    /** Package name */
    name: v.optional(v.string()),
    /** Package scripts */
    scripts: v.optional(v.record(v.string(), v.string())),
    /** Runtime dependencies */
    dependencies: v.optional(v.record(v.string(), v.string())),
    /** Dev dependencies */
    devDependencies: v.optional(v.record(v.string(), v.string())),
    /** Peer dependencies */
    peerDependencies: v.optional(v.record(v.string(), v.string())),
    /** Workspace configuration (root only) */
    workspaces: v.optional(
      v.union([v.array(v.string()), v.strictObject({ packages: v.array(v.string()) })]),
    ),
  },
  v.unknown(),
);

/** Parsed package.json content. See {@link PackageJsonSchema}. */
export type PackageJson = v.InferOutput<typeof PackageJsonSchema>;

/** Schema for package.json rule context. */
export const PackageJsonContextSchema = v.strictObject({
  /** Absolute path to the package.json file */
  file: v.string(),
  /** Parsed package.json content */
  pkg: PackageJsonSchema,
  /** Whether this is the workspace root package.json */
  isRoot: v.boolean(),
  /** Per-rule configuration options from the config file */
  ruleOptions: v.optional(v.record(v.string(), v.unknown())),
});

/** Context for package.json rules. See {@link PackageJsonContextSchema}. */
export type PackageJsonContext = v.InferOutput<typeof PackageJsonContextSchema>;

/** Schema for a package.json lint rule. */
export const PackageJsonRuleSchema = v.strictObject({
  /** Unique rule ID (e.g. 'package/require-tsgo') */
  id: v.string(),
  /** Human-readable description */
  description: v.string(),
  /** Check function */
  check: v.custom<(context: PackageJsonContext) => LintResult[]>(isFn),
  /** Whether this rule provides real auto-fixes (not just placeholder no-ops) */
  fixable: v.optional(v.boolean()),
});

/** A package.json lint rule. See {@link PackageJsonRuleSchema}. */
export type PackageJsonRule = v.InferOutput<typeof PackageJsonRuleSchema>;
