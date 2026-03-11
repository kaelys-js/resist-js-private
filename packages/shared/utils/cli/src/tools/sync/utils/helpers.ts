/**
 * Sync Handlebars Helpers
 *
 * Custom Handlebars helpers for template processing.
 * These helpers enable complex logic in templates that would
 * otherwise require JavaScript.
 *
 * Handlebars helper registrations are side-effect callbacks and do not
 * use the Result system. The two exported utility functions
 * (`clearMissingVariables`, `getMissingVariables`) return `Result<T>`.
 *
 * @module
 */

import Handlebars from 'handlebars';

import {
  NonNegativeIntegerSchema,
  StrArraySchema,
  VoidSchema,
  type Bool,
  type HandlebarsValue,
  type NonNegativeInteger,
  type OptionalStr,
  type Str,
  type StrArray,
  type Void,
} from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// JSON Helpers
// =============================================================================

/**
 * Serialize a value as JSON.
 * Useful for embedding arrays or objects in templates.
 *
 * @param context - Template value to serialize.
 * @param options - Handlebars options (supports `indent` hash param).
 * @returns SafeString with JSON output.
 *
 * @example
 * {{json repo.keywords}}
 * // Output: ["typescript", "monorepo"]
 *
 * @example
 * {{json products indent="\t\t"}}
 * // Output: Pretty-printed with custom indent
 */
Handlebars.registerHelper(
  'json',
  function (context: HandlebarsValue, options: Handlebars.HelperOptions): Handlebars.SafeString {
    const indent: HandlebarsValue = options?.hash?.indent ?? '\t';
    // Side-effect helper — JSON.stringify is intentional (cannot return Result from Handlebars callback)
    const indentValue: string = typeof indent === 'string' ? indent : String(indent);
    const result: Str = JSON.stringify(context, null, indentValue);
    return new Handlebars.SafeString(result);
  },
);

/**
 * Serialize a value as pretty JSON with specific indentation.
 *
 * @param context - Template value to serialize.
 * @param spaces - Num of spaces for indentation (default: 2).
 * @returns SafeString with pretty-printed JSON.
 *
 * @example
 * {{jsonPretty products 2}}
 * // Output: JSON with 2-space indentation
 */
Handlebars.registerHelper(
  'jsonPretty',
  function (context: HandlebarsValue, spaces: HandlebarsValue = 2): Handlebars.SafeString {
    // Side-effect helper — JSON.stringify is intentional (cannot return Result from Handlebars callback)
    const spacesValue: number = typeof spaces === 'number' ? spaces : Number(spaces);
    const result: Str = JSON.stringify(context, null, spacesValue);
    return new Handlebars.SafeString(result);
  },
);

/**
 * Serialize a value as JSON with outer indentation for embedding.
 * Like `json`, but shifts all lines after the first by an outer
 * indentation string so the JSON block aligns correctly when embedded
 * inside an already-indented context (e.g., a nested JSON key).
 *
 * @param context - Template value to serialize.
 * @param options - Handlebars options (supports `indent` and `outer` hash params).
 * @returns SafeString with indented JSON output.
 *
 * @example
 * "json.schemas": {{jsonShifted vscodeJsonSchemas outer="\t"}}
 * // Shifts all continuation lines by one tab
 */
Handlebars.registerHelper(
  'jsonShifted',
  function (context: HandlebarsValue, options: Handlebars.HelperOptions): Handlebars.SafeString {
    const indent: HandlebarsValue = options?.hash?.indent ?? '\t';
    const outer: HandlebarsValue = options?.hash?.outer ?? '\t';
    // Side-effect helper — JSON.stringify is intentional (cannot return Result from Handlebars callback)
    const indentValue: string = typeof indent === 'string' ? indent : String(indent);
    const outerValue: string = typeof outer === 'string' ? outer : String(outer);
    const json: Str = JSON.stringify(context, null, indentValue);
    // Shift all lines after the first by the outer indentation
    const shifted: Str = json.replace(/\n/g, `\n${outerValue}`);
    return new Handlebars.SafeString(shifted);
  },
);

// =============================================================================
// Package Manager Helpers
// =============================================================================

/**
 * Check if the current package manager matches the given name.
 *
 * @param manager - Package manager name to compare (e.g. `"pnpm"`).
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifPm "pnpm"}}
 *   pnpm-specific content
 * {{else}}
 *   content for other package managers
 * {{/ifPm}}
 */
Handlebars.registerHelper(
  'ifPm',
  function (this: HandlebarsValue, manager: Str, options: Handlebars.HelperOptions): string {
    const currentPm: HandlebarsValue = options.data.root['pm.name'];
    return currentPm === manager ? options.fn(this) : options.inverse(this);
  },
);

/**
 * Check if the current package manager does NOT match the given name.
 *
 * @param manager - Package manager name to compare (e.g. `"pnpm"`).
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#unlessPm "pnpm"}}
 *   content for non-pnpm package managers
 * {{/unlessPm}}
 */
Handlebars.registerHelper(
  'unlessPm',
  function (this: HandlebarsValue, manager: Str, options: Handlebars.HelperOptions): string {
    const currentPm: HandlebarsValue = options.data.root['pm.name'];
    return currentPm !== manager ? options.fn(this) : options.inverse(this);
  },
);

/**
 * Check if the current package manager matches any of the given names.
 *
 * @param args - Variadic package manager names, with Handlebars options as the last argument.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifPmIn "pnpm" "bun"}}
 *   content for pnpm or bun
 * {{/ifPmIn}}
 */
Handlebars.registerHelper(
  'ifPmIn',
  function (this: HandlebarsValue, ...args: HandlebarsValue[]): string {
    // Handlebars always passes HelperOptions as the last variadic argument
    const options: Handlebars.HelperOptions = args.pop() as Handlebars.HelperOptions;
    const managers: HandlebarsValue[] = args;
    const currentPm: HandlebarsValue = options.data.root['pm.name'];
    return managers.includes(currentPm) ? options.fn(this) : options.inverse(this);
  },
);

// =============================================================================
// Git Provider Helpers
// =============================================================================

/**
 * Check if the current git provider matches the given name.
 *
 * @param provider - Provider name to compare (e.g. `"github"`).
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifProvider "github"}}
 *   github-specific content
 * {{else}}
 *   content for other providers
 * {{/ifProvider}}
 */
Handlebars.registerHelper(
  'ifProvider',
  function (this: HandlebarsValue, provider: Str, options: Handlebars.HelperOptions): string {
    const currentProvider: HandlebarsValue = options.data.root['git.provider'];
    return currentProvider === provider ? options.fn(this) : options.inverse(this);
  },
);

/**
 * Check if the current git provider does NOT match the given name.
 *
 * @param provider - Provider name to compare (e.g. `"github"`).
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#unlessProvider "github"}}
 *   content for non-GitHub providers
 * {{/unlessProvider}}
 */
Handlebars.registerHelper(
  'unlessProvider',
  function (this: HandlebarsValue, provider: Str, options: Handlebars.HelperOptions): string {
    const currentProvider: HandlebarsValue = options.data.root['git.provider'];
    return currentProvider !== provider ? options.fn(this) : options.inverse(this);
  },
);

/**
 * Check if the current git provider matches any of the given names.
 *
 * @param args - Variadic provider names, with Handlebars options as the last argument.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifProviderIn "github" "gitlab"}}
 *   content for GitHub or GitLab
 * {{/ifProviderIn}}
 */
Handlebars.registerHelper(
  'ifProviderIn',
  function (this: HandlebarsValue, ...args: HandlebarsValue[]): string {
    // Handlebars always passes HelperOptions as the last variadic argument
    const options: Handlebars.HelperOptions = args.pop() as Handlebars.HelperOptions;
    const providers: HandlebarsValue[] = args;
    const currentProvider: HandlebarsValue = options.data.root['git.provider'];
    return providers.includes(currentProvider) ? options.fn(this) : options.inverse(this);
  },
);

// =============================================================================
// Comparison Helpers
// =============================================================================

/**
 * Check if two values are equal.
 *
 * @param arg1 - First value to compare.
 * @param arg2 - Second value to compare.
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifEquals format.global.indent_style "tab"}}
 *   UseTabs: true
 * {{else}}
 *   UseTabs: false
 * {{/ifEquals}}
 */
Handlebars.registerHelper(
  'ifEquals',
  function (
    this: HandlebarsValue,
    arg1: HandlebarsValue,
    arg2: HandlebarsValue,
    options: Handlebars.HelperOptions,
  ): string {
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
  },
);

/**
 * Check if two values are not equal.
 *
 * @param arg1 - First value to compare.
 * @param arg2 - Second value to compare.
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifNotEquals git.branch "main"}}
 *   Non-default branch
 * {{/ifNotEquals}}
 */
Handlebars.registerHelper(
  'ifNotEquals',
  function (
    this: HandlebarsValue,
    arg1: HandlebarsValue,
    arg2: HandlebarsValue,
    options: Handlebars.HelperOptions,
  ): string {
    return arg1 !== arg2 ? options.fn(this) : options.inverse(this);
  },
);

/**
 * Check if a value is greater than another.
 *
 * @param arg1 - First value to compare.
 * @param arg2 - Second value to compare.
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifGt format.global.line_length 80}}
 *   Wide lines allowed
 * {{/ifGt}}
 */
Handlebars.registerHelper(
  'ifGt',
  function (
    this: HandlebarsValue,
    arg1: HandlebarsValue,
    arg2: HandlebarsValue,
    options: Handlebars.HelperOptions,
  ): string {
    return Number(arg1) > Number(arg2) ? options.fn(this) : options.inverse(this);
  },
);

/**
 * Check if a value is less than another.
 *
 * @param arg1 - First value to compare.
 * @param arg2 - Second value to compare.
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifLt format.global.indent_size 4}}
 *   Compact indentation
 * {{/ifLt}}
 */
Handlebars.registerHelper(
  'ifLt',
  function (
    this: HandlebarsValue,
    arg1: HandlebarsValue,
    arg2: HandlebarsValue,
    options: Handlebars.HelperOptions,
  ): string {
    return Number(arg1) < Number(arg2) ? options.fn(this) : options.inverse(this);
  },
);

// =============================================================================
// Str Helpers
// =============================================================================

/**
 * Convert a string to lowercase.
 *
 * @param str - Template value to convert.
 * @returns Lowercase string, or the original value if not a string.
 *
 * @example
 * {{lowercase business.company}}
 */
Handlebars.registerHelper('lowercase', function (str: HandlebarsValue): HandlebarsValue {
  return typeof str === 'string' ? str.toLowerCase() : str;
});

/**
 * Convert a string to uppercase.
 *
 * @param str - Template value to convert.
 * @returns Uppercase string, or the original value if not a string.
 *
 * @example
 * {{uppercase business.license}}
 */
Handlebars.registerHelper('uppercase', function (str: HandlebarsValue): HandlebarsValue {
  return typeof str === 'string' ? str.toUpperCase() : str;
});

/**
 * Convert a string to kebab-case.
 *
 * @param str - Template value to convert.
 * @returns Kebab-cased string, or the original value if not a string.
 *
 * @example
 * {{kebabCase business.company}}
 * // "My Company" -> "my-company"
 */
Handlebars.registerHelper('kebabCase', function (str: HandlebarsValue): HandlebarsValue {
  if (typeof str !== 'string') return str;
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
});

/**
 * Convert a string to snake_case.
 *
 * @param str - Template value to convert.
 * @returns Snake-cased string, or the original value if not a string.
 *
 * @example
 * {{snakeCase business.company}}
 * // "My Company" -> "my_company"
 */
Handlebars.registerHelper('snakeCase', function (str: HandlebarsValue): HandlebarsValue {
  if (typeof str !== 'string') return str;
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
});

/**
 * Get the native display name for a locale code.
 * Uses Intl.DisplayNames to show language names in their own script.
 *
 * @param locale - BCP 47 locale code (e.g. `"en"`, `"es"`, `"ja"`).
 * @returns Native display name with first letter capitalized, or the original code on failure.
 *
 * @example
 * {{localeName "en"}}
 * // Output: "English"
 *
 * @example
 * {{localeName "es"}}
 * // Output: "Español"
 *
 * @example
 * {{localeName "ja"}}
 * // Output: "日本語"
 */
Handlebars.registerHelper('localeName', function (locale: HandlebarsValue): HandlebarsValue {
  if (typeof locale !== 'string') return locale;
  try {
    const display: Intl.DisplayNames = new Intl.DisplayNames([locale], { type: 'language' });
    const name: OptionalStr = display.of(locale);
    if (!name) return locale;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return locale;
  }
});

// =============================================================================
// Array Helpers
// =============================================================================

/**
 * Check if an array includes a value.
 *
 * @param array - Template array to search.
 * @param value - Value to search for.
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifIncludes locales "es"}}
 *   Spanish supported
 * {{/ifIncludes}}
 */
Handlebars.registerHelper(
  'ifIncludes',
  function (
    this: HandlebarsValue,
    array: HandlebarsValue,
    value: HandlebarsValue,
    options: Handlebars.HelperOptions,
  ): string {
    if (!Array.isArray(array)) {
      return options.inverse(this);
    }
    return array.includes(value) ? options.fn(this) : options.inverse(this);
  },
);

/**
 * Get the length of an array or string.
 *
 * @param value - Template value to measure.
 * @returns The length, or 0 if not an array or string.
 *
 * @example
 * {{length products}} products configured
 */
Handlebars.registerHelper('length', function (value: HandlebarsValue): number {
  if (Array.isArray(value) || typeof value === 'string') {
    return value.length;
  }
  return 0;
});

/**
 * Check if an array or object is empty.
 *
 * @param value - Template value to check.
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifEmpty products}}
 *   No products configured
 * {{/ifEmpty}}
 */
Handlebars.registerHelper(
  'ifEmpty',
  function (
    this: HandlebarsValue,
    value: HandlebarsValue,
    options: Handlebars.HelperOptions,
  ): string {
    const isEmpty: Bool =
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && value !== null && Object.keys(value).length === 0);

    return isEmpty ? options.fn(this) : options.inverse(this);
  },
);

/**
 * Check if an array or object is not empty.
 *
 * @param value - Template value to check.
 * @param options - Handlebars block options.
 * @returns Rendered block content for the matching branch.
 *
 * @example
 * {{#ifNotEmpty products}}
 *   Products: {{length products}}
 * {{/ifNotEmpty}}
 */
Handlebars.registerHelper(
  'ifNotEmpty',
  function (
    this: HandlebarsValue,
    value: HandlebarsValue,
    options: Handlebars.HelperOptions,
  ): string {
    const isEmpty: Bool =
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && value !== null && Object.keys(value).length === 0);

    return isEmpty ? options.inverse(this) : options.fn(this);
  },
);

/**
 * Join array elements with a separator.
 *
 * @param array - Template array to join.
 * @param separator - Separator string (default: `", "`).
 * @returns Joined string, or empty string if not an array.
 *
 * @example
 * {{join repo.keywords ", "}}
 * // Output: "typescript, monorepo, svelte"
 */
Handlebars.registerHelper(
  'join',
  function (array: HandlebarsValue, separator: HandlebarsValue = ', '): string {
    if (!Array.isArray(array)) {
      return '';
    }
    return array.join(typeof separator === 'string' ? separator : String(separator));
  },
);

// =============================================================================
// Format Helpers
// =============================================================================

/**
 * Get the current year.
 *
 * @returns Current four-digit year as a number.
 *
 * @example
 * Copyright (c) {{year}} {{business.company}}
 */
Handlebars.registerHelper('year', function (): number {
  return new Date().getFullYear();
});

/**
 * Get current ISO date string (date portion only).
 *
 * @returns ISO date string in `YYYY-MM-DD` format.
 *
 * @example
 * Generated on: {{isoDate}}
 */
Handlebars.registerHelper('isoDate', function (): OptionalStr {
  return new Date().toISOString().split('T')[0];
});

/**
 * Convert indent_style to boolean for "use tabs".
 *
 * @param indentStyle - The indent style value (e.g. `"tab"` or `"space"`).
 * @returns `true` if indent style is `"tab"`, `false` otherwise.
 *
 * @example
 * "useTabs": {{useTabs format.global.indent_style}}
 * // If indent_style is "tab", outputs: true
 * // If indent_style is "space", outputs: false
 */
Handlebars.registerHelper('useTabs', function (indentStyle: HandlebarsValue): boolean {
  return indentStyle === 'tab';
});

/**
 * Convert indent_style to indentStyle format for Biome.
 * Biome uses "tab" or "space" (same as our format, but this is explicit).
 *
 * @param style - The indent style value.
 * @returns `"tab"` or `"space"`.
 *
 * @example
 * "indentStyle": "{{indentStyle format.global.indent_style}}"
 */
Handlebars.registerHelper('indentStyle', function (style: HandlebarsValue): string {
  return style === 'tab' ? 'tab' : 'space';
});

// =============================================================================
// Path Helpers
// =============================================================================

/**
 * Generate a relative path to a schema file based on the output file's location.
 *
 * @param schemaName - Schema name (e.g., `"tooling/biome"`, `"tooling/turbo"`).
 * @param options - Handlebars options (provides access to `_outputPath` in context).
 * @returns Relative path to the schema file.
 *
 * @example
 * {{schemaPath "tooling/biome"}}
 * // For file at workspace root: packages/shared/schemas/tooling/biome/schema.json
 * // For file at packages/shared/config/: ../../../packages/shared/schemas/tooling/biome/schema.json
 */
Handlebars.registerHelper(
  'schemaPath',
  function (schemaName: Str, options: Handlebars.HelperOptions): string {
    const outputPath: Str = options?.data?.root?._outputPath ?? '';
    const rawDepth: number = outputPath ? outputPath.split('/').length - 1 : 0;
    // Handlebars callback — can't return Result, use fallback pattern
    const depthResult: Result<NonNegativeInteger> = safeParse(
      NonNegativeIntegerSchema,
      Math.max(0, rawDepth),
    );
    // safeParse(NonNegativeIntegerSchema, 0+) cannot fail for non-negative integers; use 0 as safe fallback
    const depth: number = depthResult.ok ? depthResult.data : 0;
    const prefix: Str = '../'.repeat(depth);
    return `${prefix}packages/shared/schemas/${schemaName}/schema.json`;
  },
);

// =============================================================================
// Mise Helpers
// =============================================================================

/**
 * Mise backend identifiers for tools not in the default mise registry.
 * Tools in the registry can be referenced by binary name directly.
 * Tools NOT in the registry use the `ubi:` backend with their GitHub repo.
 */
const MISE_UBI_BACKENDS: Record<Str, Str> = {
  'swift-format': 'ubi:apple/swift-format',
  scalafmt: 'ubi:scalameta/scalafmt',
  rubocop: 'ubi:rubocop/rubocop',
  rufo: 'ubi:ruby-formatter/rufo',
  csharpier: 'ubi:belav/csharpier',
};

/**
 * Resolve tool binary name to mise backend identifier.
 * Most tools are in the mise registry and use their binary name directly.
 * Tools NOT in the registry use the `ubi:` backend with their GitHub repo.
 *
 * @param toolName - Binary name of the tool (e.g., `"caddy"`, `"swift-format"`).
 * @returns Mise backend identifier (e.g., `"caddy"`, `"ubi:apple/swift-format"`).
 *
 * @example
 * {{miseBackend @key}}
 * // For "caddy": "caddy"
 * // For "swift-format": "ubi:apple/swift-format"
 */
Handlebars.registerHelper('miseBackend', function (toolName: HandlebarsValue): string {
  if (typeof toolName !== 'string') return String(toolName);
  return MISE_UBI_BACKENDS[toolName] ?? toolName;
});

/**
 * Wrap text in literal curly braces for output.
 * Needed when templates must emit `{{...}}` literally (e.g., mise template variables
 * like `{{config_root}}`), which Handlebars would otherwise interpret as expressions.
 *
 * @param text - Text to wrap in `{{` and `}}`.
 * @returns The text wrapped in double curly braces.
 *
 * @example
 * {{curly "config_root"}}
 * // Output: {{config_root}}
 */
Handlebars.registerHelper('curly', function (text: HandlebarsValue): string {
  return `{{${String(text)}}}`;
});

/**
 * Simple equality comparison for use in subexpressions.
 * Unlike `ifEquals` (block helper), this returns a boolean value
 * that can be used with `{{#if (eq a b)}}` or `{{#unless (eq a b)}}`.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` if values are strictly equal, `false` otherwise.
 *
 * @example
 * {{#unless (eq @key "mise")}}
 *   {{@key}} = "{{this}}"
 * {{/unless}}
 */
Handlebars.registerHelper('eq', function (a: HandlebarsValue, b: HandlebarsValue): boolean {
  return a === b;
});

// =============================================================================
// Comment Helpers
// =============================================================================

/**
 * Generate a sync header comment with @generated marker and docs URL.
 *
 * @param commentPrefix - Line comment prefix (e.g., `"#"`, `";;"`, `"//"`).
 * @param docsUrl - Documentation URL for this config file.
 * @returns Multi-line header string.
 *
 * @example
 * {{syncHeader "#" "https://biomejs.dev/reference/configuration"}}
 * // Output:
 * // #
 * // # @generated — do not edit directly. Managed by @/cli/tools/sync.
 * // # https://biomejs.dev/reference/configuration
 * // #
 */
Handlebars.registerHelper('syncHeader', function (commentPrefix: Str, docsUrl: Str): string {
  const lines: Str[] = [commentPrefix];
  lines.push(`${commentPrefix} @generated — do not edit directly. Managed by @/cli/tools/sync.`);
  lines.push(`${commentPrefix} ${docsUrl}`);
  lines.push(commentPrefix);
  return lines.join('\n');
});

/**
 * Generate a sync header for block comment styles (HTML, PHP, etc.).
 *
 * @param open - Opening comment (e.g., `"<!--"`, `"/*"`).
 * @param close - Closing comment (e.g., `"-->"`, `'[close] '`).
 *
@param
docsUrl - Documentation;
URL;
for this config file.
 * @returns Multi-line block
comment;
header;
string.
 *
 * @example
 * {{syncHeaderBlock "<!--" "-->" "https://example.com/docs"}
}
 * // Output:
 * // <!--
 * //   @generated
 * //   https://example.com/docs
 * // -->
 */
Handlebars.registerHelper(
  'syncHeaderBlock',
  function (open: Str, close: Str, docsUrl: Str): string {
    const lines: Str[] = [open];
    lines.push('  @generated');
    lines.push(`  ${docsUrl}`);
    lines.push(close);
    return lines.join('\n');
  },
);

// =============================================================================
// Exclude Pattern Helpers
// =============================================================================

/**
 * Transform a list of directory names into VS Code exclude entries.
 * Reads the block content (one directory per line) and outputs
 * `"<dir>": true` entries for settings.json exclude objects.
 *
 *
@param
options - Handlebars;
block;
options (supports `suffix` hash param).
 * @returns SafeString
with comma-separated JSON
exclude;
entries.
 *
 * @example
 * {{#vscodeExclude}
}
 *
{
  {
    > exclude-dirs
  }
}
*
{{/vscodeExclude}}
 * // Output:
 * // "**\/node_modules": true,
 * // "**\/dist": true,
 * // ...
 *
 * @example
 * {{#vscodeExclude suffix="/**"}}
 * {{> exclude-dirs}}
 * {{/vscodeExclude}}
 * // Output (for watcherExclude):
 * // "**\/node_modules/**": true,
 * // "**\/dist/**": true,
 * // ...
 */
Handlebars.registerHelper(
  'vscodeExclude',
  function (this: HandlebarsValue, options: Handlebars.HelperOptions): Handlebars.SafeString {
    const content: Str = options.fn(this);
    const suffix: Str = options.hash?.suffix ?? '';
    const lines: Str[] = content
      .trim()
      .split('\n')
      .map((l: Str) => l.trim())
      .filter(Bool);
    const entries: Str[] = lines.map((pattern: Str) => `\t\t"\*\*/${pattern}${suffix}": true`);
    return new Handlebars.SafeString(entries.join(',\n'));
  },
);

/**
 * Transform a list of directory names into tsconfig exclude entries.
 * For each directory, outputs both the bare name and a `**\/` prefixed version.
 *
 * @param options - Handlebars block options.
 * @returns SafeString with comma-separated tsconfig exclude entries.
 *
 * @example
 * {{#tsconfigExclude}}
 * {{> exclude-dirs}}
 * {{/tsconfigExclude}}
 * // Output:
 * // "node_modules",
 * // "**\/node_modules",
 * // "dist",
 * // "**\/dist",
 * // ...
 */
Handlebars.registerHelper(
  'tsconfigExclude',
  function (this: HandlebarsValue, options: Handlebars.HelperOptions): Handlebars.SafeString {
    const content: Str = options.fn(this);
    const lines: Str[] = content
      .trim()
      .split('\n')
      .map((l: Str) => l.trim())
      .filter(Bool);
    const entries: Str[] = [];
    for (const pattern of lines) {
      entries.push(`\t\t"${pattern}"`);
      entries.push(`\t\t"**/${pattern}"`);
    }
    return new Handlebars.SafeString(entries.join(',\n'));
  },
);

// =============================================================================
// Missing Variable Detection
// =============================================================================

/**
 * Track missing variables during template rendering.
 * Handlebars silently renders undefined as empty string by default.
 * We intercept this to collect all missing variables, then report an error.
 */
const missingVariables: Set<Str> = new Set<Str>();

/**
 * Clear the missing variables set before each template render.
 *
 * @returns `Result<Void>` — always succeeds.
 */
export function clearMissingVariables(): Result<Void> {
  missingVariables.clear();
  return ok(VoidSchema, undefined);
}

/**
 * Get all missing variables detected during rendering.
 *
 * @returns `Result<StrArray>` — array of missing variable names.
 */
export function getMissingVariables(): Result<StrArray> {
  const variables: StrArray = Array.from(missingVariables);
  return ok(StrArraySchema, variables);
}

/**
 * Custom "helperMissing" handler that tracks undefined helpers/variables.
 * This catches `{{undefinedVariable}}` patterns.
 *
 * @param args - Variadic arguments; the last element is Handlebars options containing the helper name.
 * @returns Empty string to continue rendering and collect all missing vars.
 */
Handlebars.registerHelper('helperMissing', function (...args: HandlebarsValue[]): string {
  const options: Handlebars.HelperOptions = args[args.length - 1] as Handlebars.HelperOptions;
  missingVariables.add(options.name);
  // Return empty string to continue rendering and collect all missing vars
  return '';
});

/**
 * Custom "blockHelperMissing" handler for undefined block helpers.
 * This catches `{{#undefinedBlock}}...{{/undefinedBlock}}` patterns.
 *
 * @param _context - Block context (unused).
 * @param options - Handlebars block options containing the helper name.
 * @returns Rendered inverse block content.
 */
Handlebars.registerHelper(
  'blockHelperMissing',
  function (
    this: HandlebarsValue,
    _context: HandlebarsValue,
    options: Handlebars.HelperOptions,
  ): string {
    missingVariables.add(`block:${options.name}`);
    return options.inverse(this);
  },
);

// =============================================================================
// Export configured Handlebars instance
// =============================================================================

/** Handlebars instance with all sync helpers registered. */
export { Handlebars };
