#!/usr/bin/env tsx
/**
 * Config Tool
 *
 * Display, inspect, validate, and manage configuration.
 * Supports 7 actions: show (default), get, validate, list, schema, path, init.
 *
 * Usage: `<pm> tool config [action] [--product=<name|all>] [--key=<path>] [--json]`
 *
 * @module
 */

import * as v from 'valibot';

import type { CommandContext } from '@/cli/schemas';
import { TOOL_FLAG_DEFS } from '@/cli/tools/config/flags';
import type { BuiltConfigStrings } from '@/cli/tools/config/locales/schema';
import { getConfigTemplate } from '@/cli/tools/config/utils/init-template';
import { resolveKey, listTopLevelKeys, type KeyInfo } from '@/cli/tools/config/utils/resolve-key';
import { extractSchemaEntries, type SchemaEntry } from '@/cli/tools/config/utils/schema-info';
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import { getConfig } from '@/config/loader';
import {
  StrSchema,
  VoidSchema,
  type Bool,
  type DynamicModule,
  type Filename,
  type Path,
  type ProductNameArray,
  type Str,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import { CoreConfigObjectSchema } from '@/schemas/core-config/config';
import { ProductConfigSchema, type ProductConfig } from '@/schemas/core-config/product';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { writeFile } from '@/utils/core/fs';
import type { DeepReadonly } from '@/utils/core/object';
import { getFileUrl, joinPath, pathExists } from '@/utils/core/path';
import { discoverProducts } from '@/utils/core/products';
import { log } from '@/utils/core/terminal';
import { findWorkspaceRoot } from '@/utils/core/workspace';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Action Schema
// =============================================================================

/** Valid config tool actions. */
const ActionSchema = v.picklist(['show', 'get', 'validate', 'list', 'schema', 'path', 'init']);

/** Inferred action type. */
type Action = v.InferOutput<typeof ActionSchema>;

// =============================================================================
// Show Action
// =============================================================================

/**
 * Show global or product configuration as formatted JSON.
 *
 * @param ctx - Command context with locale strings and options.
 * @param jsonMode - Whether to suppress headers and emit raw JSON.
 * @param productArg - Product name, `"all"`, or empty string for global.
 * @returns `Result<Void>` — success, or an error if config loading fails.
 */
async function handleShow(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
  productArg: Str,
): Promise<Result<Void>> {
  if (!productArg) {
    return showGlobalConfig(ctx, jsonMode);
  }
  if (productArg === 'all') {
    return showAllProductConfigs(ctx, jsonMode);
  }
  return showProductConfig(ctx, jsonMode, productArg);
}

/**
 * Show the global configuration.
 *
 * @param ctx - Command context.
 * @param jsonMode - Suppress headers if true.
 * @returns `Result<Void>`.
 */
async function showGlobalConfig(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  if (!jsonMode) {
    const headerMsg: Result<Str> = strings.header();
    if (!headerMsg.ok) return headerMsg;
    log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

    const configPathMsg: Result<Str> = strings.configPath({
      path: configResult.data.tooling.paths.configFilename,
    });
    if (!configPathMsg.ok) return configPathMsg;
    log.print(`{dim}${configPathMsg.data}{/}`);
  }

  const jsonResult: Result<Void> = log.json(configResult.data, 2);
  if (!jsonResult.ok) return jsonResult;
  return ok(VoidSchema, undefined);
}

/**
 * Show a single product's configuration.
 *
 * @param ctx - Command context.
 * @param jsonMode - Suppress headers if true.
 * @param productName - Product name (validated as non-empty string).
 * @returns `Result<Void>`.
 */
async function showProductConfig(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
  productName: Str,
): Promise<Result<Void>> {
  const nameResult: Result<Str> = safeParse(StrSchema, productName);
  if (!nameResult.ok) return nameResult;

  const strings: BuiltConfigStrings = ctx.locale.command;
  const globalConfigResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!globalConfigResult.ok) return globalConfigResult;

  const relativePath: Path = `${globalConfigResult.data.tooling.paths.productsDir}/${nameResult.data}/config/src/index.ts`;
  const configPathResult: Result<Path> = joinPath([ctx.cwd, relativePath]);
  if (!configPathResult.ok) return configPathResult;

  if (!jsonMode) {
    const headerProductMsg: Result<Str> = strings.headerProduct({ name: nameResult.data });
    if (!headerProductMsg.ok) return headerProductMsg;
    log.print(`{bold}{yellow}${headerProductMsg.data}{/}{/}`);

    const configPathMsg: Result<Str> = strings.configPath({ path: relativePath });
    if (!configPathMsg.ok) return configPathMsg;
    log.print(`{dim}${configPathMsg.data}{/}`);
  }

  const configModule: Result<DynamicModule> = await loadProductModule(configPathResult.data);
  if (!configModule.ok) return configModule;

  const configData: unknown =
    configModule.data.config ?? configModule.data.default ?? configModule.data;
  const jsonResult: Result<Void> = log.json(configData, 2);
  if (!jsonResult.ok) return jsonResult;
  return ok(VoidSchema, undefined);
}

/**
 * Show all product configurations.
 *
 * @param ctx - Command context.
 * @param jsonMode - Suppress headers if true.
 * @returns `Result<Void>`.
 */
async function showAllProductConfigs(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;
  const productsResult: Result<ProductNameArray> = discoverProducts();
  if (!productsResult.ok) return productsResult;

  if (productsResult.data.length === 0) {
    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) return configResult;
    const noProductsMsg: Result<Str> = strings.noProductsFound({
      productsDir: configResult.data.tooling.paths.productsDir,
    });
    if (!noProductsMsg.ok) return noProductsMsg;
    log.warn(noProductsMsg.data);
    return ok(VoidSchema, undefined);
  }

  for (const productName of productsResult.data) {
    const result: Result<Void> = await showProductConfig(ctx, jsonMode, productName);
    if (!result.ok) return result;
  }
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Get Action
// =============================================================================

/**
 * Get a specific config value by dot-notation key path.
 *
 * @param ctx - Command context.
 * @param jsonMode - Emit raw JSON if true.
 * @param keyPath - Dot-notation key path (e.g. `"tooling.ci.enabled"`).
 * @param productArg - Product name or empty string for global.
 * @returns `Result<Void>`.
 */
async function handleGet(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
  keyPath: Str,
  productArg: Str,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;

  if (!productArg) {
    // Get from global config
    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) return configResult;

    const resolved: Result<unknown> = resolveKey(configResult.data, keyPath);
    if (!resolved.ok) {
      const notFoundMsg: Result<Str> = strings.getKeyNotFound({ key: keyPath });
      if (!notFoundMsg.ok) return notFoundMsg;
      log.print(`{red}${notFoundMsg.data}{/}`);
      return resolved;
    }

    if (!jsonMode) {
      const headerMsg: Result<Str> = strings.getHeader({ key: keyPath });
      if (!headerMsg.ok) return headerMsg;
      log.print(`{bold}${headerMsg.data}{/}`);
    }

    const jsonResult: Result<Void> = log.json(resolved.data, 2);
    if (!jsonResult.ok) return jsonResult;
    return ok(VoidSchema, undefined);
  }

  // Get from product config
  const globalConfigResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!globalConfigResult.ok) return globalConfigResult;

  const relativePath: Path = `${globalConfigResult.data.tooling.paths.productsDir}/${productArg}/config/src/index.ts`;
  const configPathResult: Result<Path> = joinPath([ctx.cwd, relativePath]);
  if (!configPathResult.ok) return configPathResult;

  const configModule: Result<DynamicModule> = await loadProductModule(configPathResult.data);
  if (!configModule.ok) return configModule;

  const configData: unknown =
    configModule.data.config ?? configModule.data.default ?? configModule.data;
  const resolved: Result<unknown> = resolveKey(configData, keyPath);
  if (!resolved.ok) {
    const notFoundMsg: Result<Str> = strings.getProductKeyNotFound({
      key: keyPath,
      product: productArg,
    });
    if (!notFoundMsg.ok) return notFoundMsg;
    log.print(`{red}${notFoundMsg.data}{/}`);
    return resolved;
  }

  if (!jsonMode) {
    const headerMsg: Result<Str> = strings.getHeader({ key: keyPath });
    if (!headerMsg.ok) return headerMsg;
    log.print(`{bold}${headerMsg.data}{/}`);
  }

  const jsonResult: Result<Void> = log.json(resolved.data, 2);
  if (!jsonResult.ok) return jsonResult;
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Validate Action
// =============================================================================

/**
 * Validate configuration against Valibot schemas.
 *
 * Global: validates via `getConfig()` (already schema-validated by loader).
 * Product: validates against `ProductConfigSchema`.
 *
 * @param ctx - Command context.
 * @param jsonMode - Emit raw JSON if true.
 * @param productArg - Product name, `"all"`, or empty string for global.
 * @returns `Result<Void>`.
 */
async function handleValidate(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
  productArg: Str,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;

  if (!productArg) {
    // Validate global config
    if (!jsonMode) {
      const headerMsg: Result<Str> = strings.validateHeader();
      if (!headerMsg.ok) return headerMsg;
      log.print(headerMsg.data);
    }

    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) {
      if (jsonMode) {
        const jsonResult: Result<Void> = log.json({ valid: false, error: 'Config not loaded' }, 2);
        if (!jsonResult.ok) return jsonResult;
      } else {
        const failedMsg: Result<Str> = strings.validateFailed({ count: 1 });
        if (!failedMsg.ok) return failedMsg;
        log.print(`{red}${failedMsg.data}{/}`);
      }
      return configResult;
    }

    if (jsonMode) {
      const jsonResult: Result<Void> = log.json({ valid: true }, 2);
      if (!jsonResult.ok) return jsonResult;
    } else {
      const passedMsg: Result<Str> = strings.validatePassed();
      if (!passedMsg.ok) return passedMsg;
      log.print(`{green}{symbol:success} ${passedMsg.data}{/}`);
    }
    return ok(VoidSchema, undefined);
  }

  if (productArg === 'all') {
    return validateAllProducts(ctx, jsonMode);
  }

  return validateProduct(ctx, jsonMode, productArg);
}

/**
 * Validate a single product's configuration against `ProductConfigSchema`.
 *
 * @param ctx - Command context.
 * @param jsonMode - Emit raw JSON if true.
 * @param productName - Product name.
 * @returns `Result<Void>`.
 */
async function validateProduct(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
  productName: Str,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;
  const globalConfigResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!globalConfigResult.ok) return globalConfigResult;

  if (!jsonMode) {
    const headerMsg: Result<Str> = strings.validateProductHeader({ name: productName });
    if (!headerMsg.ok) return headerMsg;
    log.print(headerMsg.data);
  }

  const relativePath: Path = `${globalConfigResult.data.tooling.paths.productsDir}/${productName}/config/src/index.ts`;
  const configPathResult: Result<Path> = joinPath([ctx.cwd, relativePath]);
  if (!configPathResult.ok) return configPathResult;

  const configModule: Result<DynamicModule> = await loadProductModule(configPathResult.data);
  if (!configModule.ok) {
    if (!jsonMode) {
      const loadErrMsg: Result<Str> = strings.validateProductLoadError({ name: productName });
      if (!loadErrMsg.ok) return loadErrMsg;
      log.print(`{red}${loadErrMsg.data}{/}`);
    }
    return configModule;
  }

  const configData: unknown =
    configModule.data.config ?? configModule.data.default ?? configModule.data;
  if (typeof configData !== 'object' || configData === null) {
    const exportErrMsg: Result<Str> = strings.validateProductExportError({ name: productName });
    if (!exportErrMsg.ok) return exportErrMsg;
    log.print(`{red}${exportErrMsg.data}{/}`);
    return err(ERRORS.CONFIG.INVALID, { meta: { product: productName } });
  }

  const validated: Result<ProductConfig> = safeParse(ProductConfigSchema, configData);
  if (!validated.ok) {
    if (jsonMode) {
      const jsonResult: Result<Void> = log.json({ valid: false, product: productName }, 2);
      if (!jsonResult.ok) return jsonResult;
    } else {
      const failedMsg: Result<Str> = strings.validateProductFailed({
        name: productName,
        reason: 'Schema validation failed',
      });
      if (!failedMsg.ok) return failedMsg;
      log.print(`{red}${failedMsg.data}{/}`);
    }
    return validated;
  }

  if (jsonMode) {
    const jsonResult: Result<Void> = log.json({ valid: true, product: productName }, 2);
    if (!jsonResult.ok) return jsonResult;
  } else {
    const passedMsg: Result<Str> = strings.validateProductPassed({ name: productName });
    if (!passedMsg.ok) return passedMsg;
    log.print(`{green}{symbol:success} ${passedMsg.data}{/}`);
  }
  return ok(VoidSchema, undefined);
}

/**
 * Validate all product configurations.
 *
 * @param ctx - Command context.
 * @param jsonMode - Emit raw JSON if true.
 * @returns `Result<Void>`.
 */
async function validateAllProducts(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;
  const productsResult: Result<ProductNameArray> = discoverProducts();
  if (!productsResult.ok) return productsResult;

  if (!jsonMode) {
    const headerMsg: Result<Str> = strings.validateAllHeader();
    if (!headerMsg.ok) return headerMsg;
    log.print(headerMsg.data);
  }

  let passed: number = 0;
  let failed: number = 0;

  for (const productName of productsResult.data) {
    const result: Result<Void> = await validateProduct(ctx, jsonMode, productName);
    if (result.ok) {
      passed++;
    } else {
      failed++;
    }
  }

  const total: number = passed + failed;
  if (!jsonMode) {
    const summaryMsg: Result<Str> = strings.validateSummary({ passed, failed, total });
    if (!summaryMsg.ok) return summaryMsg;
    log.print(summaryMsg.data);
  }

  if (failed > 0) {
    return err(ERRORS.CONFIG.INVALID, { meta: { passed, failed, total } });
  }
  return ok(VoidSchema, undefined);
}

// =============================================================================
// List Action
// =============================================================================

/**
 * List top-level configuration keys with their value types.
 *
 * @param ctx - Command context.
 * @param jsonMode - Emit raw JSON if true.
 * @param productArg - Product name or empty string for global.
 * @returns `Result<Void>`.
 */
async function handleList(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
  productArg: Str,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;

  let sourceObj: unknown;

  if (!productArg) {
    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) return configResult;
    sourceObj = configResult.data;

    if (!jsonMode) {
      const headerMsg: Result<Str> = strings.listHeader();
      if (!headerMsg.ok) return headerMsg;
      log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);
    }
  } else {
    const globalConfigResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!globalConfigResult.ok) return globalConfigResult;

    const relativePath: Path = `${globalConfigResult.data.tooling.paths.productsDir}/${productArg}/config/src/index.ts`;
    const configPathResult: Result<Path> = joinPath([ctx.cwd, relativePath]);
    if (!configPathResult.ok) return configPathResult;

    const configModule: Result<DynamicModule> = await loadProductModule(configPathResult.data);
    if (!configModule.ok) return configModule;

    sourceObj = configModule.data.config ?? configModule.data.default ?? configModule.data;

    if (!jsonMode) {
      const headerMsg: Result<Str> = strings.listProductHeader({ name: productArg });
      if (!headerMsg.ok) return headerMsg;
      log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);
    }
  }

  const keysResult: Result<readonly KeyInfo[]> = listTopLevelKeys(sourceObj);
  if (!keysResult.ok) return keysResult;

  if (jsonMode) {
    const jsonResult: Result<Void> = log.json(keysResult.data, 2);
    if (!jsonResult.ok) return jsonResult;
  } else {
    for (const entry of keysResult.data) {
      const keyMsg: Result<Str> = strings.listKey({ key: entry.key, type: entry.type });
      if (!keyMsg.ok) return keyMsg;
      log.print(keyMsg.data);
    }

    const countMsg: Result<Str> = strings.listCount({ count: keysResult.data.length });
    if (!countMsg.ok) return countMsg;
    log.print(`{dim}${countMsg.data}{/}`);
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Schema Action
// =============================================================================

/**
 * Display the structure of `CoreConfigObjectSchema`.
 *
 * @param ctx - Command context.
 * @param jsonMode - Emit raw JSON if true.
 * @param keyPath - Optional dot-notation key to show sub-schema.
 * @returns `Result<Void>`.
 */
async function handleSchema(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
  keyPath: Str | undefined,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;

  let targetSchema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>> = CoreConfigObjectSchema;

  if (keyPath) {
    // Navigate to sub-schema by key path
    const subSchema: Result<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>> =
      resolveSubSchema(CoreConfigObjectSchema, keyPath);
    if (!subSchema.ok) {
      const notFoundMsg: Result<Str> = strings.schemaKeyNotFound({ key: keyPath });
      if (!notFoundMsg.ok) return notFoundMsg;
      log.print(`{red}${notFoundMsg.data}{/}`);
      return subSchema;
    }
    targetSchema = subSchema.data;

    if (!jsonMode) {
      const headerMsg: Result<Str> = strings.schemaKeyHeader({ key: keyPath });
      if (!headerMsg.ok) return headerMsg;
      log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);
    }
  } else if (!jsonMode) {
    const headerMsg: Result<Str> = strings.schemaHeader();
    if (!headerMsg.ok) return headerMsg;
    log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);
  }

  const entriesResult: Result<readonly SchemaEntry[]> = extractSchemaEntries(targetSchema);
  if (!entriesResult.ok) return entriesResult;

  if (jsonMode) {
    const jsonResult: Result<Void> = log.json(entriesResult.data, 2);
    if (!jsonResult.ok) return jsonResult;
  } else {
    for (const entry of entriesResult.data) {
      const entryMsg: Result<Str> = strings.schemaEntry({
        key: entry.key,
        type: entry.type,
        required: entry.required ? 'true' : 'false',
      });
      if (!entryMsg.ok) return entryMsg;
      log.print(entryMsg.data);
    }
  }

  return ok(VoidSchema, undefined);
}

/**
 * Resolve a sub-schema by dot-notation key path.
 *
 * Walks the schema's `.entries` properties, unwrapping `optional()` wrappers.
 * Uses `in` operator + `typeof` narrowing — no `as` casts except for
 * structural Valibot schema navigation (see note below).
 *
 * @param schema - Root schema to navigate from.
 * @param keyPath - Dot-notation path (e.g. `"tooling.ci"`).
 * @returns `Result<BaseSchema>` — the resolved sub-schema, or NOT_FOUND.
 *
 * @remarks Two structural `as BaseSchema` casts are required when navigating
 *   Valibot's `.wrapped` and `.entries[key]` properties. The `in` operator
 *   narrows to `{ type: unknown }` but not to `BaseSchema`. Each cast is
 *   preceded by full runtime validation (`typeof === 'object'`, `!== null`,
 *   `'type' in ...`). Valibot provides no public API for schema tree navigation.
 */
function resolveSubSchema(
  schema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
  keyPath: Str,
): Result<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>> {
  const parts: readonly Str[] = keyPath.split('.');
  let current: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>> = schema;

  for (const part of parts) {
    // Unwrap optional if needed
    let unwrapped: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>> = current;
    if ('type' in unwrapped && unwrapped.type === 'optional' && 'wrapped' in unwrapped) {
      if (
        typeof unwrapped.wrapped === 'object' &&
        unwrapped.wrapped !== null &&
        'type' in unwrapped.wrapped
      ) {
        unwrapped = unwrapped.wrapped as v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
      }
    }

    if (
      !('entries' in unwrapped) ||
      typeof unwrapped.entries !== 'object' ||
      unwrapped.entries === null
    ) {
      return err(ERRORS.CONFIG.NOT_FOUND, { meta: { key: keyPath, segment: part } });
    }

    const entriesRecord: Result<Record<Str, unknown>> = safeParse(
      v.record(v.string(), v.unknown()),
      unwrapped.entries,
    );
    if (!entriesRecord.ok) return entriesRecord;

    if (!Object.prototype.hasOwnProperty.call(entriesRecord.data, part)) {
      return err(ERRORS.CONFIG.NOT_FOUND, { meta: { key: keyPath, segment: part } });
    }

    const entrySchema: unknown = entriesRecord.data[part];
    if (typeof entrySchema !== 'object' || entrySchema === null || !('type' in entrySchema)) {
      return err(ERRORS.CONFIG.NOT_FOUND, { meta: { key: keyPath, segment: part } });
    }

    // entrySchema is a Valibot schema object with .type — treat as BaseSchema
    current = entrySchema as v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
  }

  // Unwrap optional for final result
  if ('type' in current && current.type === 'optional' && 'wrapped' in current) {
    if (
      typeof current.wrapped === 'object' &&
      current.wrapped !== null &&
      'type' in current.wrapped
    ) {
      return okUnchecked(current.wrapped as v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>);
    }
  }

  return okUnchecked(current);
}

// =============================================================================
// Path Action
// =============================================================================

/**
 * Show resolved configuration file paths.
 *
 * @param ctx - Command context.
 * @param jsonMode - Emit raw JSON if true.
 * @param productArg - Product name, `"all"`, or empty string for global.
 * @returns `Result<Void>`.
 */
async function handlePath(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
  productArg: Str,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const rootResult: Result<Path> = findWorkspaceRoot();
  if (!rootResult.ok) return rootResult;

  if (!jsonMode) {
    const headerMsg: Result<Str> = strings.pathHeader();
    if (!headerMsg.ok) return headerMsg;
    log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);
  }

  // Global config path
  const globalFilename: Filename = configResult.data.tooling.paths.configFilename;
  const globalPathResult: Result<Path> = joinPath([rootResult.data, globalFilename]);
  if (!globalPathResult.ok) return globalPathResult;

  const globalExists: Result<Bool> = pathExists(globalPathResult.data);
  if (!globalExists.ok) return globalExists;

  if (jsonMode) {
    const paths: Record<Str, unknown> = {
      global: globalPathResult.data,
      exists: globalExists.data,
    };

    if (productArg === 'all') {
      const productsResult: Result<ProductNameArray> = discoverProducts();
      if (!productsResult.ok) return productsResult;

      const productPaths: Record<Str, Str> = {};
      for (const name of productsResult.data) {
        const prodPathResult: Result<Path> = joinPath([
          ctx.cwd,
          `${configResult.data.tooling.paths.productsDir}/${name}/config/src/index.ts`,
        ]);
        if (!prodPathResult.ok) return prodPathResult;
        productPaths[name] = prodPathResult.data;
      }
      paths.products = productPaths;
    } else if (productArg) {
      const prodPathResult: Result<Path> = joinPath([
        ctx.cwd,
        `${configResult.data.tooling.paths.productsDir}/${productArg}/config/src/index.ts`,
      ]);
      if (!prodPathResult.ok) return prodPathResult;
      paths.product = prodPathResult.data;
    }

    const jsonResult: Result<Void> = log.json(paths, 2);
    if (!jsonResult.ok) return jsonResult;
    return ok(VoidSchema, undefined);
  }

  const globalMsg: Result<Str> = strings.pathGlobal({ path: globalPathResult.data });
  if (!globalMsg.ok) return globalMsg;
  log.print(globalMsg.data);

  if (productArg === 'all') {
    const productsResult: Result<ProductNameArray> = discoverProducts();
    if (!productsResult.ok) return productsResult;

    for (const name of productsResult.data) {
      const prodPathResult: Result<Path> = joinPath([
        ctx.cwd,
        `${configResult.data.tooling.paths.productsDir}/${name}/config/src/index.ts`,
      ]);
      if (!prodPathResult.ok) return prodPathResult;
      const prodMsg: Result<Str> = strings.pathProduct({ name, path: prodPathResult.data });
      if (!prodMsg.ok) return prodMsg;
      log.print(prodMsg.data);
    }
  } else if (productArg) {
    const prodPathResult: Result<Path> = joinPath([
      ctx.cwd,
      `${configResult.data.tooling.paths.productsDir}/${productArg}/config/src/index.ts`,
    ]);
    if (!prodPathResult.ok) return prodPathResult;
    const prodMsg: Result<Str> = strings.pathProduct({
      name: productArg,
      path: prodPathResult.data,
    });
    if (!prodMsg.ok) return prodMsg;
    log.print(prodMsg.data);
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Init Action
// =============================================================================

/**
 * Create a starter `resist.config.ts` from template.
 *
 * @param ctx - Command context.
 * @param jsonMode - Emit raw JSON if true.
 * @returns `Result<Void>`.
 */
async function handleInit(
  ctx: CommandContext<BuiltConfigStrings>,
  jsonMode: Bool,
): Promise<Result<Void>> {
  const strings: BuiltConfigStrings = ctx.locale.command;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();

  const rootResult: Result<Path> = findWorkspaceRoot();
  if (!rootResult.ok) return rootResult;

  const globalFilename: Filename = configResult.ok
    ? configResult.data.tooling.paths.configFilename
    : 'resist.config.ts';

  const configPathResult: Result<Path> = joinPath([rootResult.data, globalFilename]);
  if (!configPathResult.ok) return configPathResult;

  const existsResult: Result<Bool> = pathExists(configPathResult.data);
  if (!existsResult.ok) return existsResult;

  if (existsResult.data) {
    if (jsonMode) {
      const jsonResult: Result<Void> = log.json(
        { created: false, path: configPathResult.data, reason: 'already exists' },
        2,
      );
      if (!jsonResult.ok) return jsonResult;
    } else {
      const existsMsg: Result<Str> = strings.initAlreadyExists({ path: configPathResult.data });
      if (!existsMsg.ok) return existsMsg;
      log.print(`{yellow}${existsMsg.data}{/}`);
    }
    return ok(VoidSchema, undefined);
  }

  if (!jsonMode) {
    const headerMsg: Result<Str> = strings.initHeader();
    if (!headerMsg.ok) return headerMsg;
    log.print(headerMsg.data);
  }

  const template: Str = getConfigTemplate();
  const writeResult: Result<Void> = writeFile(configPathResult.data, template);
  if (!writeResult.ok) return writeResult;

  if (jsonMode) {
    const jsonResult: Result<Void> = log.json({ created: true, path: configPathResult.data }, 2);
    if (!jsonResult.ok) return jsonResult;
  } else {
    const createdMsg: Result<Str> = strings.initCreated({ path: configPathResult.data });
    if (!createdMsg.ok) return createdMsg;
    log.print(`{green}{symbol:success} ${createdMsg.data}{/}`);
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Shared Helpers
// =============================================================================

/**
 * Load a product config module via dynamic import.
 *
 * @param configPath - Absolute path to the product config file.
 * @returns `Result<DynamicModule>` — the imported module, or LOAD_FAILED.
 */
async function loadProductModule(configPath: Path): Promise<Result<DynamicModule>> {
  try {
    const configUrlResult: Result<Str> = getFileUrl(configPath);
    if (!configUrlResult.ok) return configUrlResult;
    const module: DynamicModule = await import(configUrlResult.data);
    return okUnchecked(module);
  } catch (thrown: unknown) {
    return err(ERRORS.CONFIG.LOAD_FAILED, {
      cause: fromUnknownError(thrown),
      meta: { configPath },
    });
  }
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the config tool. */
const command = createCommand<BuiltConfigStrings>({
  id: 'config',
  version: '2.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  flagDefs: TOOL_FLAG_DEFS,

  handler: async (ctx: CommandContext<BuiltConfigStrings>): Promise<Result<Void>> => {
    const strings: BuiltConfigStrings = ctx.locale.command;

    const onboardResult: Result<Bool> = requireOnboarding();
    if (!onboardResult.ok) return onboardResult;
    if (!onboardResult.data) {
      return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
    }

    // Parse action from positional args (default: 'show')
    const rawAction: unknown = ctx.args.length > 0 ? ctx.args[0] : 'show';
    const actionResult: Result<Action> = safeParse(ActionSchema, rawAction);
    if (!actionResult.ok) {
      const unknownMsg: Result<Str> = strings.unknownAction({ action: String(rawAction) });
      if (!unknownMsg.ok) return unknownMsg;
      log.print(`{red}${unknownMsg.data}{/}`);
      return actionResult;
    }
    const action: Action = actionResult.data;

    // Read flags via typeof narrowing (tool flags are DynamicToolFlags = Record<string, unknown>)
    const productArg: Str = ctx.options.product;
    const keyPath: Str | undefined =
      'key' in ctx.options && typeof ctx.options.key === 'string' && ctx.options.key !== ''
        ? ctx.options.key
        : undefined;
    const jsonMode: Bool = 'json' in ctx.options && ctx.options.json === true;

    // Dispatch
    switch (action) {
      case 'show':
        return handleShow(ctx, jsonMode, productArg);

      case 'get':
        if (!keyPath) {
          const keyReqMsg: Result<Str> = strings.getKeyRequired();
          if (!keyReqMsg.ok) return keyReqMsg;
          log.print(`{red}${keyReqMsg.data}{/}`);
          return err(ERRORS.VALIDATION.MISSING_REQUIRED, { meta: { flag: '--key' } });
        }
        return handleGet(ctx, jsonMode, keyPath, productArg);

      case 'validate':
        return handleValidate(ctx, jsonMode, productArg);

      case 'list':
        return handleList(ctx, jsonMode, productArg);

      case 'schema':
        return handleSchema(ctx, jsonMode, keyPath);

      case 'path':
        return handlePath(ctx, jsonMode, productArg);

      case 'init':
        return handleInit(ctx, jsonMode);
    }
  },
});

export { command };
export default command;
