/**
 * Core Config Loader
 *
 * Loads and validates the root config file from the workspace root,
 * merges user values over defaults, validates against the schema,
 * and caches the result as a frozen singleton.
 *
 * All public functions return `Result<T>` — nothing throws.
 * Call `loadConfig()` once at startup (e.g. inside `dispatchTool()`),
 * then use `getConfig()` synchronously everywhere else.
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import * as v from 'valibot';

import { defaults } from '@/config/core/defaults';
import {
  BoolSchema,
  FilenameSchema,
  VoidSchema,
  type Bool,
  type DynamicModule,
  type Filename,
  type Path,
  type Void,
} from '@/schemas/common';
import {
  CoreConfigObjectSchema,
  CoreConfigSchema,
  type CoreConfig,
} from '@/schemas/core-config/config';
import { ProductConfigSchema, type ProductConfig } from '@/schemas/core-config/product';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { log } from '@/utils/core/logger';
import { deepFreeze, deepMerge, type DeepReadonly } from '@/utils/core/object';
import { joinPath, pathExists } from '@/utils/core/path';
import { findWorkspaceRoot } from '@/utils/core/workspace';
import { nodePath } from '@/utils/core/node-imports';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Default config filename — resolved once at module load from static defaults. */
const filenameResult: Result<Filename> = safeParse(
  FilenameSchema,
  defaults.tooling.paths.configFilename,
);

if (!filenameResult.ok) {
  // integration boundary: module initialization requires valid filename
  throw filenameResult.error;
}

// cast safe: safeParse validates and narrows to Filename
const DEFAULT_CONFIG_FILENAME: Filename = filenameResult.data;

// =============================================================================
// Config Singleton
// =============================================================================

/** Cached frozen config singleton. Populated by {@link loadConfig}. */
// cast safe: initial state before loadConfig
let instance: Result<DeepReadonly<CoreConfig>> = err(ERRORS.CONFIG.NOT_FOUND);

/**
 * Load and validate the root config from the workspace root.
 *
 * Discovers the workspace root via `findWorkspaceRoot()`, loads the config
 * file with a dynamic `import()`, deep-merges over defaults, validates
 * against `CoreConfigSchema`, and caches the frozen result.
 *
 * - Returns the cached singleton immediately on subsequent calls.
 * - If the config file is missing on disk, logs a warning and caches defaults.
 * - Never throws — all failures are returned as `Result` errors.
 *
 * @returns {Promise<Result<DeepReadonly<CoreConfig>>>} The validated, frozen
 *          config, or a structured error (`CONFIG.NOT_FOUND`, `CONFIG.LOAD_FAILED`,
 *          `CONFIG.INVALID`).
 *
 * @example
 * ```typescript
 * const result = await loadConfig();
 * if (!result.ok) return result;
 * result.data.company.name; // => 'My Company'
 * ```
 */
export async function loadConfig(): Promise<Result<DeepReadonly<CoreConfig>>> {
  if (instance.ok) {
    return instance;
  }

  if (!nodePath) {
    // Non-Node runtimes (browser, CF Worker) can't discover config files from
    // the filesystem. The bundler resolves static imports at build time, but
    // loadConfig() uses runtime-computed paths (findWorkspaceRoot → dynamic import).
    // Solution: import your config statically and call setConfig() at startup.
    return err(ERRORS.RUNTIME.UNSUPPORTED, {
      meta: {
        function: 'loadConfig',
        requires: 'node',
        suggestion: 'Import your config and call setConfig() in non-Node runtimes',
      },
    });
  }

  const rootResult: Result<Path> = findWorkspaceRoot();

  if (!rootResult.ok) {
    return rootResult;
  }

  const configPathResult: Result<Path> = joinPath([rootResult.data, DEFAULT_CONFIG_FILENAME]);

  if (!configPathResult.ok) {
    return configPathResult;
  }

  const configPath: Path = configPathResult.data;

  const existsResult: Result<Bool> = pathExists(configPath);

  if (!existsResult.ok) {
    return existsResult;
  }
  if (!existsResult.data) {
    // Framework-internal: config/core has no access to CLI locale/styling system
    log.warn(
      `{yellow}{bold}${DEFAULT_CONFIG_FILENAME}{/}{/} not found — using built-in defaults. Run {bold}pnpm tool config init{/} to create one.`,
    );
    instance = okUnchecked(deepFreeze(defaults));
    return instance;
  }

  let userConfig: Partial<CoreConfig> = {};

  try {
    const module: DynamicModule = await import(configPath);

    const rawConfig: unknown = module.default ?? module;

    // Type narrowing: rawConfig is validated by safeParse(CoreConfigSchema, merged) below.
    // The cast bridges dynamic import (unknown) to deepMerge's parameter type.
    if (typeof rawConfig === 'object' && rawConfig !== null) {
      userConfig = rawConfig as Partial<CoreConfig>; // cast safe: runtime guard above + safeParse validates merged result below
    }
  } catch (error: unknown) {
    // Framework-internal: config/core has no access to CLI locale system
    return err(ERRORS.CONFIG.LOAD_FAILED, {
      meta: { file: DEFAULT_CONFIG_FILENAME, configPath },
      cause: fromUnknownError(error),
    });
  }

  // Deep merge: defaults first, user config wins
  const merged: unknown = deepMerge(defaults, userConfig);

  // Validate against schema
  const validated: Result<CoreConfig> = safeParse(CoreConfigSchema, merged);

  if (!validated.ok) {
    // Framework-internal: config/core has no access to CLI locale system
    return err(ERRORS.CONFIG.INVALID, {
      meta: { file: DEFAULT_CONFIG_FILENAME },
      cause: validated.error,
    });
  }

  instance = okUnchecked(deepFreeze(validated.data));
  return instance;
}

/**
 * Get the loaded config synchronously.
 *
 * Returns the cached singleton populated by `loadConfig()`.
 * Returns an error result with `ERRORS.CONFIG.NOT_FOUND` if the
 * singleton has not been initialized yet.
 *
 * In CLI context, `dispatchTool()` guarantees `loadConfig()` runs first,
 * so this will always succeed after bootstrap.
 *
 * @returns {Result<DeepReadonly<CoreConfig>>} The cached config,
 *          or `CONFIG.NOT_FOUND` if not loaded.
 *
 * @example
 * ```typescript
 * const result = getConfig();
 * if (!result.ok) return result;
 * console.log(result.data.defaultLocale);
 * ```
 */
export function getConfig(): Result<DeepReadonly<CoreConfig>> {
  return instance;
}

/**
 * Reset the config singleton.
 *
 * Clears the cached config so `loadConfig()` will re-read from disk
 * on next call. Primarily useful in test fixtures.
 *
 * @returns {Result<Void>} Always succeeds.
 *
 * @example
 * ```typescript
 * const reset = resetConfig();
 * if (!reset.ok) return reset;
 * const result = await loadConfig(); // re-reads from disk
 * ```
 */
export function resetConfig(): Result<Void> {
  instance = err(ERRORS.CONFIG.NOT_FOUND);
  return ok(VoidSchema, undefined);
}

/**
 * Set config from a pre-built object. Works in any runtime.
 *
 * Deep-merges the provided config over defaults, validates against
 * `CoreConfigSchema`, and caches the frozen result as the singleton.
 *
 * Use this in browser/CF Worker contexts where filesystem-based
 * `loadConfig()` cannot discover the config file. Apps import their
 * bundled config statically and pass it to `setConfig()` at startup.
 *
 * After calling `setConfig()`, `getConfig()` returns the cached config.
 * `loadConfig()` also returns the cached config (singleton check at top).
 *
 * @param {Partial<CoreConfig>} config - Partial config object with user overrides.
 * @returns {Result<DeepReadonly<CoreConfig>>} The validated, frozen config.
 *
 * @example
 * ```typescript
 * // In a SvelteKit app or CF Worker entry point:
 * import config from '../../../resist.config';
 * import { setConfig } from '@/config/loader';
 *
 * const result = setConfig(config);
 * if (!result.ok) throw new Error('Invalid config');
 * // Now getConfig() works everywhere in this runtime.
 * ```
 */
export function setConfig(config: Partial<CoreConfig>): Result<DeepReadonly<CoreConfig>> {
  const merged: unknown = deepMerge(defaults, config);
  const validated: Result<CoreConfig> = safeParse(CoreConfigSchema, merged);

  if (!validated.ok) {
    return err(ERRORS.CONFIG.INVALID, {
      meta: { file: 'setConfig()' },
      cause: validated.error,
    });
  }

  instance = okUnchecked(deepFreeze(validated.data));
  return instance;
}

/**
 * Check if the config file exists at the workspace root.
 *
 * Discovers the workspace root via `findWorkspaceRoot()`.
 * Returns an error result if the workspace root cannot be found.
 *
 * @returns {Result<Bool>} `true` or `false` for file existence,
 *          or `CONFIG.NOT_FOUND` if workspace root missing.
 *
 * @example
 * ```typescript
 * const result = configExists();
 * if (!result.ok) return result;
 * if (result.data) {
 *   // config file exists
 * }
 * ```
 */
export function configExists(): Result<Bool> {
  if (!nodePath) {
    // Non-Node runtimes can't check filesystem. Config existence is
    // irrelevant when using setConfig() — always returns false.
    return ok(BoolSchema, false);
  }

  const rootResult: Result<Path> = findWorkspaceRoot();

  if (!rootResult.ok) {
    return rootResult;
  }

  const configPathResult: Result<Path> = joinPath([rootResult.data, DEFAULT_CONFIG_FILENAME]);

  if (!configPathResult.ok) {
    return configPathResult;
  }

  return pathExists(configPathResult.data);
}

/**
 * Helper function for defining config in the workspace config file.
 *
 * Provides type checking and autocompletion for user-facing
 * configuration. Does not validate — validation happens in `loadConfig()`.
 *
 * @remarks Identity function for DX/type-checking only — does not return `Result`
 *   because it performs no operations that can fail.
 *
 * @param {Partial<CoreConfig>} config - Partial config object with user overrides.
 * @returns {Partial<CoreConfig>} The validated config object.
 *
 * @example
 * ```typescript
 * // resist.config.ts
 * import { defineConfig } from '@/config/loader';
 *
 * export default defineConfig({
 *   company: {
 *     name: 'Acme Inc',
 *     domain: 'acme.com',
 *     supportEmail: 'support@acme.com',
 *   },
 *   products: [{ id: 'app', name: 'Acme App' }],
 *   locales: ['en', 'es'],
 *   defaultLocale: 'en',
 * });
 * ```
 */
export function defineConfig(config: Partial<CoreConfig>): Partial<CoreConfig> {
  const result: Result<Partial<CoreConfig>> = safeParse(v.partial(CoreConfigObjectSchema), config);

  if (!result.ok) {
    // integration boundary: config file validation
    throw result.error;
  }

  return result.data as Partial<CoreConfig>; // cast safe: safeParse validates
}

/**
 * Helper function for defining product config in product config files.
 *
 * Provides type checking and autocompletion for product-specific
 * configuration. Does not validate — validation happens in the config tool's
 * `validate --product` action via `safeParse(ProductConfigSchema, ...)`.
 *
 * @remarks Identity function for DX/type-checking only — does not return `Result`
 *   because it performs no operations that can fail.
 *
 * @param {ProductConfig} config - Product config object.
 * @returns {ProductConfig} The validated config object.
 *
 * @example
 * ```typescript
 * // packages/products/<name>/config/src/index.ts
 * import { defineProductConfig } from '@/config/loader';
 *
 * export default defineProductConfig({
 *   id: 'my-product',
 *   name: 'My Product',
 *   layers: { api: true, app: true, marketing: true, status: true, assets: true },
 * });
 * ```
 */
export function defineProductConfig(config: ProductConfig): ProductConfig {
  const result: Result<ProductConfig> = safeParse(ProductConfigSchema, config);

  if (!result.ok) {
    // integration boundary: config file validation
    throw result.error;
  }

  return result.data;
}
