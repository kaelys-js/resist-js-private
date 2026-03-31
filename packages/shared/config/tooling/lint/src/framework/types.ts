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
  range: v.strictObject({
    /** Start byte offset (inclusive) */ start: v.number(),
    /** End byte offset (exclusive) */ end: v.number(),
  }),
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
  /** Source code line that triggered the diagnostic */
  source: v.optional(v.string()),
  /** Link to documentation for the rule */
  url: v.optional(v.string()),
  /** Structured auto-fix — every result MUST include a fix */
  fix: LintFixSchema,
});

/** A single lint diagnostic produced by a rule. See {@link LintResultSchema}. */
export type LintResult = v.InferOutput<typeof LintResultSchema>;

/** No-op fix placeholder for rules that don't provide auto-fixes. */
export const NO_OP_FIX: LintFix = { range: { start: 0, end: 0 }, text: '' };

/** Optional fields for {@link createResult}. */
type CreateResultOpts = {
  /** Short suggestion for fixing the issue. */
  tip?: string;
  /** Code example showing the correct form. */
  example?: string;
  /** Source code line that triggered the diagnostic. */
  source?: string;
  /** Link to documentation for the rule. */
  url?: string;
  /** Structured auto-fix (defaults to no-op if omitted). */
  fix?: LintFix;
  /** End line for range highlighting. */
  endLine?: number;
  /** End column for range highlighting. */
  endColumn?: number;
};

/**
 * Factory helper to build a {@link LintResult} with sensible defaults.
 *
 * Reduces boilerplate — callers only need to specify the required fields.
 * The `fix` field defaults to a no-op fix when omitted.
 *
 * @param {string} ruleId - Rule ID (e.g. 'jsdoc/require-param')
 * @param {string} file - Absolute file path
 * @param {number} line - 1-based line number
 * @param {number} column - 1-based column number
 * @param {'error' | 'warning' | 'info'} severity - Severity level
 * @param {string} message - Human-readable diagnostic message
 * @param {CreateResultOpts} opts - Optional fields (tip, example, fix, endLine, endColumn)
 * @returns {LintResult} A complete lint result object
 *
 * @example
 * ```typescript
 * const result = createResult('jsdoc/require-param', '/src/foo.ts', 10, 1, 'error', 'Missing @param tag');
 * ```
 */
export function createResult(
  ruleId: string,
  file: string,
  line: number,
  column: number,
  severity: 'error' | 'warning' | 'info',
  message: string,
  opts?: CreateResultOpts,
): LintResult {
  return {
    ruleId,
    file,
    line,
    column,
    severity,
    message,
    fix: opts?.fix ?? NO_OP_FIX,
    tip: opts?.tip,
    example: opts?.example,
    source: opts?.source,
    url: opts?.url,
    endLine: opts?.endLine,
    endColumn: opts?.endColumn,
  };
}

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
      /** Start position */
      start: v.strictObject({
        /** 1-based line number */ line: v.number(),
        /** 0-based column offset */ column: v.number(),
      }),
      /** End position */
      end: v.strictObject({
        /** 1-based line number */ line: v.number(),
        /** 0-based column offset */ column: v.number(),
      }),
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
  /** Visitor for the root Program node. */
  Program: v.optional(VisitorFnSchema),
  /** Visitor for variable declarations (const, let, var). */
  VariableDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for function declarations. */
  FunctionDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for class declarations. */
  ClassDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for import declarations. */
  ImportDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for named export declarations. */
  ExportNamedDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for default export declarations. */
  ExportDefaultDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for export-all declarations (export * from). */
  ExportAllDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for TypeScript type alias declarations. */
  TSTypeAliasDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for TypeScript interface declarations. */
  TSInterfaceDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for TypeScript enum declarations. */
  TSEnumDeclaration: v.optional(VisitorFnSchema),
  /** Visitor for function/method call expressions. */
  CallExpression: v.optional(VisitorFnSchema),
  /** Visitor for arrow function expressions. */
  ArrowFunctionExpression: v.optional(VisitorFnSchema),
  /** Visitor for function expressions. */
  FunctionExpression: v.optional(VisitorFnSchema),
  /** Visitor for throw statements. */
  ThrowStatement: v.optional(VisitorFnSchema),
  /** Visitor for catch clauses. */
  CatchClause: v.optional(VisitorFnSchema),
  /** Visitor for expression statements. */
  ExpressionStatement: v.optional(VisitorFnSchema),
  /** Visitor for block statements. */
  BlockStatement: v.optional(VisitorFnSchema),
  /** Visitor for ternary/conditional expressions. */
  ConditionalExpression: v.optional(VisitorFnSchema),
  /** Visitor for member access expressions (computed). */
  MemberExpression: v.optional(VisitorFnSchema),
  /** Visitor for static member access expressions (dot notation). */
  StaticMemberExpression: v.optional(VisitorFnSchema),
  /** Visitor for `as` type assertions. */
  TSAsExpression: v.optional(VisitorFnSchema),
  /** Visitor for angle-bracket type assertions. */
  TSTypeAssertion: v.optional(VisitorFnSchema),
  /** Visitor for non-null assertions (!). */
  TSNonNullExpression: v.optional(VisitorFnSchema),
  /** Visitor for `satisfies` expressions. */
  TSSatisfiesExpression: v.optional(VisitorFnSchema),
  /** Visitor for type annotation nodes. */
  TSTypeAnnotation: v.optional(VisitorFnSchema),
  /** Visitor for function type signatures. */
  TSFunctionType: v.optional(VisitorFnSchema),
  /** Visitor for union type nodes. */
  TSUnionType: v.optional(VisitorFnSchema),
  /** Visitor for logical expressions (&&, ||, ??). */
  LogicalExpression: v.optional(VisitorFnSchema),
  /** Visitor for if statements. */
  IfStatement: v.optional(VisitorFnSchema),
  /** Visitor for classic for loops. */
  ForStatement: v.optional(VisitorFnSchema),
  /** Visitor for for...in loops. */
  ForInStatement: v.optional(VisitorFnSchema),
  /** Visitor for for...of loops. */
  ForOfStatement: v.optional(VisitorFnSchema),
  /** Visitor for while loops. */
  WhileStatement: v.optional(VisitorFnSchema),
  /** Visitor for do...while loops. */
  DoWhileStatement: v.optional(VisitorFnSchema),
  /** Visitor for binary expressions (arithmetic, comparison, logical). */
  BinaryExpression: v.optional(VisitorFnSchema),
  /** Visitor for new expressions (constructor calls). */
  NewExpression: v.optional(VisitorFnSchema),
  /** Visitor for assignment expressions. */
  AssignmentExpression: v.optional(VisitorFnSchema),
  /** Visitor for unary expressions (delete, typeof, void, !, ~). */
  UnaryExpression: v.optional(VisitorFnSchema),
  /** Visitor for array literal expressions. */
  ArrayExpression: v.optional(VisitorFnSchema),
  /** Visitor for literal values (numbers, strings, booleans, bigints). */
  Literal: v.optional(VisitorFnSchema),
  /** Visitor for template literal expressions. */
  TemplateLiteral: v.optional(VisitorFnSchema),
  /** Visitor for string literal nodes. */
  StringLiteral: v.optional(VisitorFnSchema),
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
// Stages
// =============================================================================

/** Schema for pipeline stages a rule can run in. */
export const StageSchema = v.picklist(['lint', 'check', 'pre-commit', 'build', 'ci', 'test']);

/** Pipeline stage identifier. See {@link StageSchema}. */
export type Stage = v.InferOutput<typeof StageSchema>;

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
  /** Rule categories for filtering (defaults to [id prefix]) */
  categories: v.optional(v.array(v.string())),
  /** Pipeline stages this rule runs in (defaults to ['lint']) */
  stages: v.optional(v.array(StageSchema)),
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
    /** Optional dependencies */
    optionalDependencies: v.optional(v.record(v.string(), v.string())),
    /** Peer dependencies */
    peerDependencies: v.optional(v.record(v.string(), v.string())),
    /** SPDX license identifier */
    license: v.optional(v.string()),
    /** Module type (e.g. "module", "commonjs") */
    type: v.optional(v.string()),
    /** CLI bin entry — single path or name-to-path map */
    bin: v.optional(v.union([v.string(), v.record(v.string(), v.string())])),
    /** Workspace configuration (root only) */
    workspaces: v.optional(
      v.union([
        v.array(v.string()),
        v.strictObject({ /** Workspace package glob patterns */ packages: v.array(v.string()) }),
      ]),
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
  /** Unique rule ID (e.g. 'package/require-standard-scripts') */
  id: v.string(),
  /** Human-readable description */
  description: v.string(),
  /** Rule categories for filtering (defaults to [id prefix]) */
  categories: v.optional(v.array(v.string())),
  /** Pipeline stages this rule runs in (defaults to ['lint']) */
  stages: v.optional(v.array(StageSchema)),
  /** Check function */
  check: v.custom<(context: PackageJsonContext) => LintResult[]>(isFn),
  /** Whether this rule provides real auto-fixes (not just placeholder no-ops) */
  fixable: v.optional(v.boolean()),
});

/** A package.json lint rule. See {@link PackageJsonRuleSchema}. */
export type PackageJsonRule = v.InferOutput<typeof PackageJsonRuleSchema>;

// =============================================================================
// Workspace Rule Interface
// =============================================================================

/**
 * Schema for a workspace-scoped lint rule.
 *
 * Workspace rules check the entire monorepo — they are not file-specific
 * or package-specific. They receive a `WorkspaceContext` with utilities
 * for file discovery, reading, and searching.
 *
 * Discriminated from `PackageJsonRule` by the `scope: 'workspace'` field.
 */
export const WorkspaceRuleSchema = v.strictObject({
  /** Unique rule ID (e.g. 'workspace/no-merge-conflicts') */
  id: v.string(),
  /** Human-readable description */
  description: v.string(),
  /** Literal scope discriminator — always 'workspace' */
  scope: v.literal('workspace'),
  /** Rule categories for filtering (defaults to [id prefix]) */
  categories: v.optional(v.array(v.string())),
  /** Pipeline stages this rule runs in (defaults to ['lint']) */
  stages: v.optional(v.array(StageSchema)),
  /**
   * Check function — receives the workspace context and returns lint results.
   *
   * Uses the WorkspaceContext from rule-context.ts for file discovery,
   * reading, and searching.
   */
  check: v.custom<(context: unknown) => Promise<LintResult[]>>(isFn),
  /** Whether this rule provides real auto-fixes (not just placeholder no-ops) */
  fixable: v.optional(v.boolean()),
});

/** A workspace-scoped lint rule. See {@link WorkspaceRuleSchema}. */
export type WorkspaceRule = v.InferOutput<typeof WorkspaceRuleSchema>;
