/**
 * Shared SvelteKit configuration factory.
 *
 * Builds a complete SvelteKit config with auto-synced aliases from the root
 * tsconfig.json, CSP directives, git commit versioning, and vitePreprocess.
 *
 * @module
 *
 * @example
 * ```typescript
 * // packages/products/storylyne/editor/svelte.config.ts
 * import adapter from '@sveltejs/adapter-cloudflare';
 * import { createSvelteConfig } from '@/config/tooling/svelte';
 *
 * export default createSvelteConfig({
 *   adapter: adapter({ platformProxy: { persist: true } }),
 * });
 * ```
 */

import * as v from 'valibot';
import type { Config, Adapter } from '@sveltejs/kit';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { PathSchema, type Str, type Bool, type Path, type Filename } from '@/schemas/common';
import { type Result, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { findWorkspaceRoot } from '@/utils/core/workspace';
import { readFile, parseJsonWithComments } from '@/utils/core/fs';
import { getGitCommitShort } from '@/utils/core/git';
import { resolvePath, joinPath } from '@/utils/core/path';

// =============================================================================
// Types
// =============================================================================

/** Inferred options type from {@link CreateSvelteConfigOptionsSchema}. */
type CreateSvelteConfigOptions = v.InferOutput<typeof CreateSvelteConfigOptionsSchema>;

/** Inferred input type from {@link CreateSvelteConfigOptionsSchema}. */
export type CreateSvelteConfigInput = v.InferInput<typeof CreateSvelteConfigOptionsSchema>;

/** Schema for tsconfig.json compiler options. */
const TsconfigCompilerOptionsSchema = v.strictObject({
  /** Path alias mappings (e.g., `@/foo` -> `./packages/foo/src/index.ts`). */
  paths: v.optional(v.record(v.string(), v.array(v.string()))),
  /** Enable all strict type-checking options. */
  strict: v.optional(v.boolean()),
  /** ECMAScript target version. */
  target: v.optional(
    v.picklist([
      'ES2015',
      'ES2016',
      'ES2017',
      'ES2018',
      'ES2019',
      'ES2020',
      'ES2021',
      'ES2022',
      'ES2023',
      'ES2024',
      'ESNext',
    ]),
  ),
  /** Module system. */
  module: v.optional(
    v.picklist(['ESNext', 'CommonJS', 'NodeNext', 'Node16', 'ES2015', 'ES2020', 'ES2022']),
  ),
  /** Module resolution strategy. */
  moduleResolution: v.optional(v.picklist(['bundler', 'node', 'nodenext', 'node16', 'classic'])),
  /** Allow importing JSON modules. */
  resolveJsonModule: v.optional(v.boolean()),
  /** Emit interop helpers for ES module default imports. */
  esModuleInterop: v.optional(v.boolean()),
  /** Skip type-checking declaration files. */
  skipLibCheck: v.optional(v.boolean()),
  /** Ensure consistent casing in file names. */
  forceConsistentCasingInFileNames: v.optional(v.boolean()),
  /** Generate .d.ts declaration files. */
  declaration: v.optional(v.boolean()),
  /** Generate .d.ts.map sourcemap files. */
  declarationMap: v.optional(v.boolean()),
  /** Generate .js.map sourcemap files. */
  sourceMap: v.optional(v.boolean()),
  /** Ensure each file can be transpiled independently. */
  isolatedModules: v.optional(v.boolean()),
  /** Preserve import/export syntax. */
  verbatimModuleSyntax: v.optional(v.boolean()),
  /** Add undefined to index signatures. */
  noUncheckedIndexedAccess: v.optional(v.boolean()),
  /** Report errors for fallthrough cases in switch. */
  noFallthroughCasesInSwitch: v.optional(v.boolean()),
  /** Ensure overriding members use override keyword. */
  noImplicitOverride: v.optional(v.boolean()),
  /** Enforce using indexed accessors for keys declared with index signatures. */
  noPropertyAccessFromIndexSignature: v.optional(v.boolean()),
  /** Allow imports to include .ts extensions. */
  allowImportingTsExtensions: v.optional(v.boolean()),
  /** Do not emit output files. */
  noEmit: v.optional(v.boolean()),
});

/** Schema for tsconfig.json root structure. */
const TsconfigJsonSchema = v.strictObject({
  /** Compiler options. */
  compilerOptions: v.optional(TsconfigCompilerOptionsSchema),
  /** File patterns to exclude. */
  exclude: v.optional(v.array(v.string())),
  /** File patterns to include. */
  include: v.optional(v.array(v.string())),
  /** Base tsconfig to extend. */
  extends: v.optional(PathSchema),
  /** Explicit list of files to include. */
  files: v.optional(v.array(v.string())),
  /** Project references. */
  references: v.optional(
    v.array(
      v.strictObject({
        /** Path to referenced tsconfig. */
        path: PathSchema,
      }),
    ),
  ),
});

/** Inferred tsconfig.json type. See {@link TsconfigJsonSchema}. */
type TsconfigJson = v.InferOutput<typeof TsconfigJsonSchema>;

/** CSP configuration type from SvelteKit. */
type CspConfig = NonNullable<Config['kit']>['csp'];

/** Individual CSP source value type from SvelteKit directives. */
type CspSource = NonNullable<NonNullable<CspConfig>['directives']>['connect-src'] extends
  | Array<infer S>
  | undefined
  ? S
  : never;

// =============================================================================
// Schemas
// =============================================================================

/** Validation schema for {@link createSvelteConfig} options. */
const CreateSvelteConfigOptionsSchema = v.strictObject({
  /** SvelteKit adapter (required — each product picks their own). */
  adapter: v.custom<Adapter>((): Bool => true), // cast safe: external SvelteKit type, validated by SvelteKit at runtime
  /** Whether to enable CSP directives in production. */
  enableCsp: v.optional(v.boolean(), true),
  /** Additional aliases to merge (product-specific). */
  extraAliases: v.optional(v.record(v.string(), v.string()), {}),
  /** Custom template paths (override shared defaults). */
  files: v.optional(
    v.strictObject({
      /** Custom app.html template path (must end with .html). */
      appTemplate: v.optional(v.pipe(v.string(), v.minLength(1), v.endsWith('.html'))),
      /** Custom error.html template path (must end with .html). */
      errorTemplate: v.optional(v.pipe(v.string(), v.minLength(1), v.endsWith('.html'))),
    }),
    {},
  ),
  /** Additional kit options to merge. */
  extraKit: v.optional(
    v.custom<Partial<NonNullable<Config['kit']>>>((): Bool => true),
    {},
  ), // cast safe: external SvelteKit type
});

// =============================================================================
// Shared template paths
// =============================================================================

/**
 * Resolve a template path relative to the module directory.
 *
 * @param {Str} file - Relative template file name.
 * @returns {Result<Path>} Result containing absolute resolved path.
 */
function resolveTemplatePath(file: Str): Result<Path> {
  return resolvePath([import.meta.dirname, file]);
}

/** Schema for validated template paths. */
const TemplatePathsSchema = v.strictObject({
  /** Absolute path to the app.html template. */
  appHtml: PathSchema,
  /** Absolute path to the error.html template. */
  errorHtml: PathSchema,
});

/** Inferred type for resolved template paths. */
type TemplatePaths = v.InferOutput<typeof TemplatePathsSchema>;

/**
 * Resolve and validate shared SvelteKit HTML template paths.
 *
 * Used by `createSvelteConfig` for `kit.files.appTemplate` / `kit.files.errorTemplate`,
 * and by the Vite template plugins (`templateAppHtml`, `templateErrorHtml`) for
 * in-place placeholder resolution at build time.
 *
 * @returns {TemplatePaths} Validated template paths.
 */
function resolveTemplatePaths(): TemplatePaths {
  const appHtmlResult: Result<Path> = resolveTemplatePath('templates/app.html');
  if (!appHtmlResult.ok) {
    throw appHtmlResult.error;
  } // integration boundary: module init
  const errorHtmlResult: Result<Path> = resolveTemplatePath('templates/error.html');
  if (!errorHtmlResult.ok) {
    throw errorHtmlResult.error;
  } // integration boundary: module init

  return {
    appHtml: appHtmlResult.data,
    errorHtml: errorHtmlResult.data,
  };
}

/**
 * Absolute paths to the shared SvelteKit HTML templates.
 *
 * Used by `createSvelteConfig` for `kit.files.appTemplate` / `kit.files.errorTemplate`,
 * and by the Vite template plugins (`templateAppHtml`, `templateErrorHtml`) for
 * in-place placeholder resolution at build time.
 */
export const TEMPLATE_PATHS: TemplatePaths = resolveTemplatePaths();

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Read tsconfig.json paths from the monorepo root and convert them to
 * SvelteKit kit.alias entries.
 *
 * Strips `.ts` extensions from non-wildcard paths since SvelteKit resolves
 * aliases differently from TypeScript. Wildcard paths (`*`) keep their
 * glob pattern but drop the `.ts` suffix.
 *
 * @param {Path} root - Absolute path to the monorepo root.
 * @returns {Result<Record<Str, Str>>} Result containing alias map for `kit.alias`.
 */
function buildAliasesFromTsconfig(root: Path): Result<Record<Str, Str>> {
  const tsconfigPathResult: Result<Path> = joinPath([root, 'tsconfig.json']);
  if (!tsconfigPathResult.ok) {
    return tsconfigPathResult;
  }

  const rawResult: Result<Str> = readFile(tsconfigPathResult.data);
  if (!rawResult.ok) {
    return rawResult;
  }

  const jsonResult: Result<unknown> = parseJsonWithComments(rawResult.data);
  if (!jsonResult.ok) {
    return jsonResult;
  }
  const tsconfigResult: Result<TsconfigJson> = safeParse(TsconfigJsonSchema, jsonResult.data);
  if (!tsconfigResult.ok) {
    return tsconfigResult;
  }
  const { compilerOptions }: TsconfigJson = tsconfigResult.data as TsconfigJson; // cast safe: safeParse validates
  if (!compilerOptions?.paths) {
    return okUnchecked<Record<Str, Str>>({});
  }
  const paths: Record<Str, Str[]> = compilerOptions.paths as Record<Str, Str[]>; // cast safe: guarded by line above

  const aliases: Record<Str, Str> = {};

  const pathEntries: Array<[Str, Str[]]> = Object.entries(paths);
  for (const [alias, targets] of pathEntries) {
    const [target]: Str[] = targets;
    if (!target) {
      continue;
    }

    let resolved: Str = target;

    if (alias.endsWith('/*')) {
      // Wildcard alias: @/utils/core/* -> ./packages/shared/utils/core/src/*.ts
      // Strip trailing .ts from the glob pattern: *.ts -> *
      resolved = resolved.replace(/\*\.ts$/, '*');
    } else if (!resolved.endsWith('.svelte.ts') && resolved.endsWith('.ts')) {
      // Exact alias: @/schemas/common -> ./packages/shared/schemas/common/src/index.ts
      // Strip .ts extension entirely, BUT keep .svelte.ts
      resolved = resolved.slice(0, -3);
    }

    const resolvedPathResult: Result<Path> = joinPath([root, resolved]);
    if (!resolvedPathResult.ok) {
      return resolvedPathResult;
    }

    aliases[alias] = resolvedPathResult.data;
  }

  return okUnchecked<Record<Str, Str>>(aliases);
}

// =============================================================================
// CSP directives
// =============================================================================

/**
 * CSP directives for production builds.
 *
 * Disabled in dev because Vite injects inline HMR scripts that SvelteKit
 * cannot add nonces to, causing CSP violations that block hot reloading.
 *
 * Uses `'auto'` mode: hashes for prerendered pages and nonces for SSR pages.
 */
const PRODUCTION_CSP: CspConfig = {
  mode: 'auto' as const,
  directives: {
    'default-src': ['self' as const],
    'script-src': ['self' as const, 'wasm-unsafe-eval'],
    'style-src': ['self' as const, 'unsafe-inline'],
    'img-src': ['self' as const, 'data:', 'blob:'],
    'font-src': ['self' as const],
    // cast safe: SvelteKit CSP types accept string union, ws:/wss: are valid CSP source values
    'connect-src': ['self' as const, 'ws:' as CspSource, 'wss:' as CspSource],
    'worker-src': ['self' as const, 'blob:'],
    'child-src': ['self' as const, 'blob:'],
    'frame-ancestors': ['none' as const],
    'base-uri': ['self' as const],
    'form-action': ['self' as const],
    'object-src': ['none' as const],
  },
};

/** Whether the current environment is production. */
const IS_PRODUCTION: Bool = process.env.NODE_ENV === 'production';

// =============================================================================
// Main factory
// =============================================================================

/**
 * Create a complete SvelteKit configuration.
 *
 * Auto-reads aliases from root tsconfig.json so they never go out of sync.
 * Includes CSP, git versioning, and vitePreprocess by default.
 *
 * @param {CreateSvelteConfigInput} options - Configuration options validated against {@link CreateSvelteConfigOptionsSchema}.
 * @returns {Config} Complete SvelteKit config.
 *
 * @example
 * ```typescript
 * import adapter from '@sveltejs/adapter-cloudflare';
 * import { createSvelteConfig } from '@/config/tooling/svelte';
 *
 * export default createSvelteConfig({
 *   adapter: adapter({ platformProxy: { persist: true } }),
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Custom template location for app.html only
 * export default createSvelteConfig({
 *   adapter: adapter(),
 *   files: { appTemplate: './src/custom-app.html' },
 * });
 * ```
 */
export function createSvelteConfig(options: CreateSvelteConfigInput): Config {
  // integration boundary: SvelteKit doesn't understand Result
  const optionsResult: Result<CreateSvelteConfigOptions> = safeParse(
    CreateSvelteConfigOptionsSchema,
    options,
  );
  if (!optionsResult.ok) {
    throw optionsResult.error;
  } // integration boundary: SvelteKit doesn't understand Result

  const { adapter, enableCsp, extraAliases, files, extraKit }: CreateSvelteConfigOptions =
    optionsResult.data as CreateSvelteConfigOptions; // cast safe: safeParse validates

  const rootResult: Result<Path> = findWorkspaceRoot(undefined, 'pnpm-workspace.yaml' as Filename); // cast safe: literal string to branded Filename
  if (!rootResult.ok) {
    throw rootResult.error;
  } // integration boundary: SvelteKit doesn't understand Result
  const root: Path = rootResult.data;

  const aliasesResult: Result<Record<Str, Str>> = buildAliasesFromTsconfig(root);
  if (!aliasesResult.ok) {
    throw aliasesResult.error;
  } // integration boundary: SvelteKit doesn't understand Result
  const aliases: Record<Str, Str> = aliasesResult.data;

  const gitResult: Result<Str> = getGitCommitShort();
  if (!gitResult.ok) {
    throw gitResult.error;
  } // integration boundary: SvelteKit doesn't understand Result
  const gitCommit: Str = gitResult.data;

  const config: Config = {
    preprocess: vitePreprocess(),
    kit: {
      version: {
        name: gitCommit,
      },
      adapter,
      files: {
        appTemplate: files?.appTemplate ?? TEMPLATE_PATHS.appHtml,
        errorTemplate: files?.errorTemplate ?? TEMPLATE_PATHS.errorHtml,
      },
      ...(enableCsp && IS_PRODUCTION ? { csp: PRODUCTION_CSP } : {}),
      alias: {
        ...aliases,
        ...extraAliases,
      },
      ...extraKit,
    },
  };

  return config;
}
