#!/usr/bin/env tsx
/**
 * Secrets Tool
 *
 * Manage Infisical secrets: show, get, set, delete, list, search,
 * doctor, migrate, rotate, sync, login, logout, whoami, validate.
 *
 * Usage: `<pm> tool secrets [action] [flags]`
 *
 * @module
 */

import * as v from 'valibot';

import type { CommandContext } from '@/cli/schemas';
import { TOOL_FLAG_DEFS } from '@/cli/tools/secrets/flags';
import type { BuiltSecretsStrings } from '@/cli/tools/secrets/locales/schema';
import { runDoctorChecks, type CheckResult } from '@/cli/tools/secrets/utils/doctor';
import {
  fetchSecrets,
  fetchSecretsJson,
  getSiteUrl,
  requireInfisical,
} from '@/cli/tools/secrets/utils/infisical';
import { migrateSecrets } from '@/cli/tools/secrets/utils/migrate';
import { rotateSecrets, type RotateCategory } from '@/cli/tools/secrets/utils/rotate';
import { searchSecrets, type SearchResult } from '@/cli/tools/secrets/utils/search';
import { syncToWorkers } from '@/cli/tools/secrets/utils/sync';
import {
  validateAllSecrets,
  validateGlobalSecrets,
  validateProductSecrets,
  type ValidationResult,
  type FolderValidation,
  type ValidationIssue,
} from '@/cli/tools/secrets/utils/validate-secrets';
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import { getConfig } from '@/config/loader';
import {
  NonNegativeIntegerSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type NonNegativeInteger,
  type Path,
  type ProductNameArray,
  type Str,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { EnvironmentName } from '@/schemas/core-config/environment';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { discoverProducts } from '@/utils/core/products';
import { execSyncSafe } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Action Schema
// =============================================================================

/** Valid actions for the secrets tool. */
const ActionSchema = v.picklist([
  'show',
  'get',
  'set',
  'delete',
  'list',
  'search',
  'doctor',
  'migrate',
  'rotate',
  'sync',
  'login',
  'logout',
  'whoami',
  'validate',
]);

/** @see {@link ActionSchema} */
type Action = v.InferOutput<typeof ActionSchema>;

// =============================================================================
// Show Handlers (preserved from v1)
// =============================================================================

/**
 * Display global (non-product-scoped) secrets.
 *
 * @param strings - Locale strings for messages.
 * @param environment - Target environment.
 * @param config - Resolved core configuration.
 * @returns `Result<NonNegativeInteger>` — exit code from Infisical, or an error Result.
 */
async function displayGlobalSecrets(
  strings: BuiltSecretsStrings,
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
): Promise<Result<NonNegativeInteger>> {
  const envResult: Result<Str> = safeParse(StrSchema, environment);
  if (!envResult.ok) return envResult;

  const headerMsg: Result<Str> = strings.header();
  if (!headerMsg.ok) return headerMsg;
  log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  const fetchingMsg: Result<Str> = strings.fetchingSecrets({ env: envResult.data });
  if (!fetchingMsg.ok) return fetchingMsg;
  log.print(`{dim}${fetchingMsg.data}{/}`);

  log.print('');

  return fetchSecrets(envResult.data, config);
}

/**
 * Display secrets scoped to a single product.
 *
 * @param strings - Locale strings for messages.
 * @param productName - Product name to scope secrets to.
 * @param environment - Target environment.
 * @param config - Resolved core configuration.
 * @returns `Result<NonNegativeInteger>` — exit code from Infisical, or an error Result.
 */
async function displayProductSecrets(
  strings: BuiltSecretsStrings,
  productName: Str,
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
): Promise<Result<NonNegativeInteger>> {
  const nameResult: Result<Str> = safeParse(StrSchema, productName);
  if (!nameResult.ok) return nameResult;
  const envResult: Result<Str> = safeParse(StrSchema, environment);
  if (!envResult.ok) return envResult;

  const path: Path = `/products/${nameResult.data}`;

  const headerProductMsg: Result<Str> = strings.headerProduct({ name: nameResult.data });
  if (!headerProductMsg.ok) return headerProductMsg;
  log.print(`{bold}{yellow}${headerProductMsg.data}{/}{/}`);

  const fetchingProductMsg: Result<Str> = strings.fetchingProductSecrets({
    name: nameResult.data,
    env: envResult.data,
  });
  if (!fetchingProductMsg.ok) return fetchingProductMsg;
  log.print(`{dim}${fetchingProductMsg.data}{/}`);

  log.print('');

  return fetchSecrets(envResult.data, config, path);
}

/**
 * Display secrets for all discovered products.
 *
 * @param strings - Locale strings for messages.
 * @param environment - Target environment.
 * @param config - Resolved core configuration.
 * @returns `Result<NonNegativeInteger>` — highest non-zero exit code, or an error Result.
 */
async function displayAllProductSecrets(
  strings: BuiltSecretsStrings,
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
): Promise<Result<NonNegativeInteger>> {
  const envResult: Result<Str> = safeParse(StrSchema, environment);
  if (!envResult.ok) return envResult;

  const productsResult: Result<ProductNameArray> = discoverProducts();
  if (!productsResult.ok) return productsResult;

  const productNames: ProductNameArray = productsResult.data;

  if (productNames.length === 0) {
    const noProductsMsg: Result<Str> = strings.noProductsFound({
      productsDir: config.tooling.paths.productsDir,
    });
    if (!noProductsMsg.ok) return noProductsMsg;
    log.warn(noProductsMsg.data);
    return ok(NonNegativeIntegerSchema, 0);
  }

  let finalExitCode: NonNegativeInteger = 0;

  for (const productName of productNames) {
    const result: Result<NonNegativeInteger> = await displayProductSecrets(
      strings,
      productName,
      envResult.data,
      config,
    );

    if (!result.ok) return result;

    if (result.data !== 0) {
      finalExitCode = result.data;
    }

    log.print('');
  }

  return ok(NonNegativeIntegerSchema, finalExitCode);
}

// =============================================================================
// Action Handlers
// =============================================================================

/**
 * Handle the `show` action — display secrets to terminal.
 * Preserves exact behavior from v1.
 *
 * @param ctx - Command context.
 * @param productArg - Product name filter (empty = global, 'all' = all products).
 * @returns `Result<Void>` — success or error.
 */
async function handleShow(
  ctx: CommandContext<BuiltSecretsStrings>,
  productArg: Str,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const environment: EnvironmentName = ctx.options.env;

  let secretsResult: Result<NonNegativeInteger>;

  if (productArg === '') {
    secretsResult = await displayGlobalSecrets(strings, environment, configResult.data);
  } else if (productArg === 'all') {
    secretsResult = await displayAllProductSecrets(strings, environment, configResult.data);
  } else {
    secretsResult = await displayProductSecrets(
      strings,
      productArg,
      environment,
      configResult.data,
    );
  }

  if (!secretsResult.ok) return secretsResult;

  if (secretsResult.data !== 0) {
    return err(ERRORS.IO.EXEC_FAILED, {
      meta: { tool: 'infisical', reason: 'Exited with non-zero status' },
    });
  }

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `get` action — fetch a single secret value.
 *
 * @param ctx - Command context.
 * @param keyFlag - Secret key name.
 * @param pathFlag - Infisical folder path.
 * @param jsonMode - Whether to output raw JSON.
 * @returns `Result<Void>` — success or error.
 */
async function handleGet(
  ctx: CommandContext<BuiltSecretsStrings>,
  keyFlag: Str,
  pathFlag: Str,
  jsonMode: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const environment: EnvironmentName = ctx.options.env;

  const secretsResult: Result<Record<string, string>> = await fetchSecretsJson(
    environment,
    configResult.data,
    pathFlag === '/' ? undefined : pathFlag,
  );
  if (!secretsResult.ok) return secretsResult;

  const value: string | undefined = secretsResult.data[keyFlag];

  if (value === undefined) {
    const notFoundMsg: Result<Str> = strings.getKeyNotFound({ key: keyFlag, path: pathFlag });
    if (!notFoundMsg.ok) return notFoundMsg;
    log.print(`{red}${notFoundMsg.data}{/}`);
    return err(ERRORS.VALIDATION.REQUIRED_FIELD, { meta: { key: keyFlag } });
  }

  if (jsonMode) {
    log.json({ key: keyFlag, value, path: pathFlag });
  } else {
    const headerMsg: Result<Str> = strings.getHeader({ key: keyFlag });
    if (!headerMsg.ok) return headerMsg;
    log.print(`{bold}${headerMsg.data}{/}`);
    log.print(value);
  }

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `set` action — set a secret value.
 *
 * @param ctx - Command context.
 * @param keyFlag - Secret key name.
 * @param valueFlag - Secret value to set.
 * @param pathFlag - Infisical folder path.
 * @param dryRun - Whether to preview without applying.
 * @returns `Result<Void>` — success or error.
 */
async function handleSet(
  ctx: CommandContext<BuiltSecretsStrings>,
  keyFlag: Str,
  valueFlag: Str,
  pathFlag: Str,
  dryRun: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const environment: EnvironmentName = ctx.options.env;

  if (dryRun) {
    const dryMsg: Result<Str> = strings.setDryRun({
      key: keyFlag,
      path: pathFlag,
      env: environment,
    });
    if (!dryMsg.ok) return dryMsg;
    log.print(`{dim}${dryMsg.data}{/}`);
    return ok(VoidSchema, undefined);
  }

  const pathArgs: Str = pathFlag !== '/' ? ` --path=${pathFlag}` : '';
  const setResult: Result<Str> = execSyncSafe(
    `infisical secrets set "${keyFlag}=${valueFlag}" --env=${environment}${pathArgs}`,
  );
  if (!setResult.ok) return setResult;

  const successMsg: Result<Str> = strings.setSuccess({
    key: keyFlag,
    path: pathFlag,
    env: environment,
  });
  if (!successMsg.ok) return successMsg;
  log.print(`{green}${successMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `delete` action — remove a secret.
 *
 * @param ctx - Command context.
 * @param keyFlag - Secret key name to delete.
 * @param pathFlag - Infisical folder path.
 * @param dryRun - Whether to preview without applying.
 * @returns `Result<Void>` — success or error.
 */
async function handleDelete(
  ctx: CommandContext<BuiltSecretsStrings>,
  keyFlag: Str,
  pathFlag: Str,
  dryRun: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const environment: EnvironmentName = ctx.options.env;

  if (dryRun) {
    const dryMsg: Result<Str> = strings.deleteDryRun({
      key: keyFlag,
      path: pathFlag,
      env: environment,
    });
    if (!dryMsg.ok) return dryMsg;
    log.print(`{dim}${dryMsg.data}{/}`);
    return ok(VoidSchema, undefined);
  }

  const pathArgs: Str = pathFlag !== '/' ? ` --path=${pathFlag}` : '';
  const deleteResult: Result<Str> = execSyncSafe(
    `infisical secrets delete ${keyFlag} --env=${environment}${pathArgs}`,
  );
  if (!deleteResult.ok) return deleteResult;

  const successMsg: Result<Str> = strings.deleteSuccess({
    key: keyFlag,
    path: pathFlag,
    env: environment,
  });
  if (!successMsg.ok) return successMsg;
  log.print(`{green}${successMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `list` action — list all secrets at a path.
 *
 * @param ctx - Command context.
 * @param pathFlag - Infisical folder path.
 * @param jsonMode - Whether to output raw JSON.
 * @returns `Result<Void>` — success or error.
 */
async function handleList(
  ctx: CommandContext<BuiltSecretsStrings>,
  pathFlag: Str,
  jsonMode: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const environment: EnvironmentName = ctx.options.env;

  const secretsResult: Result<Record<string, string>> = await fetchSecretsJson(
    environment,
    configResult.data,
    pathFlag === '/' ? undefined : pathFlag,
  );
  if (!secretsResult.ok) return secretsResult;

  const keys: readonly Str[] = Object.keys(secretsResult.data);

  if (jsonMode) {
    log.json(secretsResult.data);
    return ok(VoidSchema, undefined);
  }

  if (keys.length === 0) {
    const emptyMsg: Result<Str> = strings.listEmpty({ path: pathFlag });
    if (!emptyMsg.ok) return emptyMsg;
    log.print(`{dim}${emptyMsg.data}{/}`);
    return ok(VoidSchema, undefined);
  }

  const headerMsg: Result<Str> = strings.listHeader({ path: pathFlag, env: environment });
  if (!headerMsg.ok) return headerMsg;
  log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  for (const key of keys) {
    const value: Str = secretsResult.data[key] ?? '';
    const masked: Str =
      value.length > 4
        ? `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 4, 20))}`
        : '****';
    const keyMsg: Result<Str> = strings.listKey({ key, value: masked });
    if (!keyMsg.ok) return keyMsg;
    log.print(keyMsg.data);
  }

  const countMsg: Result<Str> = strings.listCount({ count: keys.length });
  if (!countMsg.ok) return countMsg;
  log.print(`{dim}${countMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `search` action — search secrets by key name pattern.
 *
 * @param ctx - Command context.
 * @param query - Search query string.
 * @param jsonMode - Whether to output raw JSON.
 * @returns `Result<Void>` — success or error.
 */
async function handleSearch(
  ctx: CommandContext<BuiltSecretsStrings>,
  query: Str,
  jsonMode: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const environment: EnvironmentName = ctx.options.env;

  const resultsResult: Result<readonly SearchResult[]> = await searchSecrets(
    query,
    environment,
    configResult.data,
  );
  if (!resultsResult.ok) return resultsResult;

  const results: readonly SearchResult[] = resultsResult.data;

  if (jsonMode) {
    log.json(results);
    return ok(VoidSchema, undefined);
  }

  if (results.length === 0) {
    const noResultsMsg: Result<Str> = strings.searchNoResults({ query });
    if (!noResultsMsg.ok) return noResultsMsg;
    log.print(`{dim}${noResultsMsg.data}{/}`);
    return ok(VoidSchema, undefined);
  }

  const headerMsg: Result<Str> = strings.searchHeader({ query });
  if (!headerMsg.ok) return headerMsg;
  log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  for (const result of results) {
    const resultMsg: Result<Str> = strings.searchResult({
      key: result.key,
      path: result.path,
      project: result.project,
    });
    if (!resultMsg.ok) return resultMsg;
    log.print(resultMsg.data);
  }

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `doctor` action — run diagnostic checks.
 *
 * @param ctx - Command context.
 * @param jsonMode - Whether to output raw JSON.
 * @returns `Result<Void>` — success or error.
 */
async function handleDoctor(
  ctx: CommandContext<BuiltSecretsStrings>,
  jsonMode: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;

  const checksResult: Result<readonly CheckResult[]> = await runDoctorChecks();
  if (!checksResult.ok) return checksResult;

  const checks: readonly CheckResult[] = checksResult.data;

  if (jsonMode) {
    log.json(checks);
    return ok(VoidSchema, undefined);
  }

  const headerMsg: Result<Str> = strings.doctorHeader();
  if (!headerMsg.ok) return headerMsg;
  log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  let passed: NonNegativeInteger = 0;
  let failed: NonNegativeInteger = 0;

  for (const check of checks) {
    if (check.passed) {
      passed++;
      const passedMsg: Result<Str> = strings.doctorCheckPassed({ name: check.name });
      if (!passedMsg.ok) return passedMsg;
      log.print(`{green}${passedMsg.data}{/}`);
    } else {
      failed++;
      const failedMsg: Result<Str> = strings.doctorCheckFailed({
        name: check.name,
        fix: check.fix ?? 'No fix available',
      });
      if (!failedMsg.ok) return failedMsg;
      log.print(`{red}${failedMsg.data}{/}`);
    }
  }

  log.print('');
  const summaryMsg: Result<Str> = strings.doctorSummary({ passed, failed, total: checks.length });
  if (!summaryMsg.ok) return summaryMsg;
  log.print(summaryMsg.data);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `migrate` action — migrate .env files to Infisical.
 *
 * @param ctx - Command context.
 * @param jsonMode - Whether to output raw JSON.
 * @param dryRun - Whether to preview without applying.
 * @param backup - Whether to create backups.
 * @returns `Result<Void>` — success or error.
 */
async function handleMigrate(
  ctx: CommandContext<BuiltSecretsStrings>,
  jsonMode: Bool,
  dryRun: Bool,
  backup: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const environment: EnvironmentName = ctx.options.env;

  const headerMsg: Result<Str> = strings.migrateHeader();
  if (!headerMsg.ok) return headerMsg;
  if (!jsonMode) log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  const result = await migrateSecrets({
    environment,
    dryRun,
    backup,
    cwd: ctx.cwd,
  });
  if (!result.ok) return result;

  if (jsonMode) {
    log.json(result.data);
    return ok(VoidSchema, undefined);
  }

  if (result.data.filesProcessed === 0) {
    const noFilesMsg: Result<Str> = strings.migrateNoFiles();
    if (!noFilesMsg.ok) return noFilesMsg;
    log.print(`{dim}${noFilesMsg.data}{/}`);
    return ok(VoidSchema, undefined);
  }

  if (dryRun) {
    const dryMsg: Result<Str> = strings.migrateDryRun();
    if (!dryMsg.ok) return dryMsg;
    log.print(`{dim}${dryMsg.data}{/}`);
  }

  const completeMsg: Result<Str> = strings.migrateComplete({ count: result.data.secretsUploaded });
  if (!completeMsg.ok) return completeMsg;
  log.print(`{green}${completeMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `rotate` action — rotate secrets by category.
 *
 * @param ctx - Command context.
 * @param jsonMode - Whether to output raw JSON.
 * @param category - Rotation category.
 * @param dryRun - Whether to preview without applying.
 * @param force - Whether to skip confirmation.
 * @returns `Result<Void>` — success or error.
 */
async function handleRotate(
  ctx: CommandContext<BuiltSecretsStrings>,
  jsonMode: Bool,
  category: Str,
  dryRun: Bool,
  force: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const environment: EnvironmentName = ctx.options.env;

  const categoryResult: Result<RotateCategory> = safeParse(
    v.picklist(['jwt', 'api', 'database', 'all']),
    category,
  );
  if (!categoryResult.ok) {
    const reqMsg: Result<Str> = strings.rotateCategoryRequired();
    if (!reqMsg.ok) return reqMsg;
    log.print(`{red}${reqMsg.data}{/}`);
    return categoryResult;
  }

  const headerMsg: Result<Str> = strings.rotateHeader({ category: categoryResult.data });
  if (!headerMsg.ok) return headerMsg;
  if (!jsonMode) log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  const result = await rotateSecrets({
    environment,
    category: categoryResult.data,
    length: 64,
    dryRun,
    force,
  });
  if (!result.ok) return result;

  if (jsonMode) {
    log.json(result.data);
    return ok(VoidSchema, undefined);
  }

  const completeMsg: Result<Str> = strings.rotateComplete({ count: result.data.rotated });
  if (!completeMsg.ok) return completeMsg;
  log.print(`{green}${completeMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `sync` action — push secrets to Cloudflare Workers.
 *
 * @param ctx - Command context.
 * @param jsonMode - Whether to output raw JSON.
 * @param dryRun - Whether to preview without applying.
 * @returns `Result<Void>` — success or error.
 */
async function handleSync(
  ctx: CommandContext<BuiltSecretsStrings>,
  jsonMode: Bool,
  dryRun: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const environment: EnvironmentName = ctx.options.env;

  const headerMsg: Result<Str> = strings.syncHeader({ env: environment });
  if (!headerMsg.ok) return headerMsg;
  if (!jsonMode) log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  const result = await syncToWorkers({
    environment,
    dryRun,
    config: configResult.data,
  });
  if (!result.ok) return result;

  if (jsonMode) {
    log.json(result.data);
    return ok(VoidSchema, undefined);
  }

  if (dryRun) {
    const dryMsg: Result<Str> = strings.syncDryRun();
    if (!dryMsg.ok) return dryMsg;
    log.print(`{dim}${dryMsg.data}{/}`);
  }

  const completeMsg: Result<Str> = strings.syncComplete({ count: result.data.synced });
  if (!completeMsg.ok) return completeMsg;
  log.print(`{green}${completeMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `login` action — log in to Infisical.
 *
 * @param ctx - Command context.
 * @returns `Result<Void>` — success or error.
 */
async function handleLogin(ctx: CommandContext<BuiltSecretsStrings>): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;

  const siteUrlResult: Result<Str> = getSiteUrl();
  if (!siteUrlResult.ok) return siteUrlResult;

  const headerMsg: Result<Str> = strings.loginHeader();
  if (!headerMsg.ok) return headerMsg;
  log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  const loginResult: Result<Str> = execSyncSafe('infisical login');
  if (!loginResult.ok) return loginResult;

  const successMsg: Result<Str> = strings.loginSuccess();
  if (!successMsg.ok) return successMsg;
  log.print(`{green}${successMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `logout` action — log out of Infisical.
 *
 * @param ctx - Command context.
 * @returns `Result<Void>` — success or error.
 */
async function handleLogout(ctx: CommandContext<BuiltSecretsStrings>): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;

  const headerMsg: Result<Str> = strings.logoutHeader();
  if (!headerMsg.ok) return headerMsg;
  log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  const logoutResult: Result<Str> = execSyncSafe('infisical logout');
  if (!logoutResult.ok) return logoutResult;

  const successMsg: Result<Str> = strings.logoutSuccess();
  if (!successMsg.ok) return successMsg;
  log.print(`{green}${successMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `whoami` action — display current Infisical user.
 *
 * @param ctx - Command context.
 * @param jsonMode - Whether to output raw JSON.
 * @returns `Result<Void>` — success or error.
 */
async function handleWhoami(
  ctx: CommandContext<BuiltSecretsStrings>,
  jsonMode: Bool,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;

  const headerMsg: Result<Str> = strings.whoamiHeader();
  if (!headerMsg.ok) return headerMsg;
  if (!jsonMode) log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  const whoamiResult: Result<Str> = execSyncSafe('infisical user get 2>/dev/null');
  if (!whoamiResult.ok) {
    const notLoggedInMsg: Result<Str> = strings.whoamiNotLoggedIn();
    if (!notLoggedInMsg.ok) return notLoggedInMsg;
    log.print(`{dim}${notLoggedInMsg.data}{/}`);
    return ok(VoidSchema, undefined);
  }

  // Extract email from output via typeof narrowing
  const output: Str = whoamiResult.data.trim();
  const emailMatch: RegExpMatchArray | null = output.match(/email[:\s]+(\S+@\S+)/i);
  const email: Str =
    emailMatch !== null && typeof emailMatch[1] === 'string' ? emailMatch[1] : output;

  if (jsonMode) {
    log.json({ email });
    return ok(VoidSchema, undefined);
  }

  const userMsg: Result<Str> = strings.whoamiUser({ email });
  if (!userMsg.ok) return userMsg;
  log.print(userMsg.data);

  return ok(VoidSchema, undefined);
}

/**
 * Handle the `validate` action — validate secrets against schemas.
 *
 * @param ctx - Command context.
 * @param jsonMode - Whether to output raw JSON.
 * @param productArg - Product name filter (empty = all, specific = single product).
 * @returns `Result<Void>` — success or error.
 */
async function handleValidate(
  ctx: CommandContext<BuiltSecretsStrings>,
  jsonMode: Bool,
  productArg: Str,
): Promise<Result<Void>> {
  const strings: BuiltSecretsStrings = ctx.locale.command;
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;
  const environment: EnvironmentName = ctx.options.env;

  const headerMsg: Result<Str> = strings.validateHeader({ env: environment });
  if (!headerMsg.ok) return headerMsg;
  if (!jsonMode) log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);

  let validationResult: Result<ValidationResult>;

  if (productArg !== '' && productArg !== 'all') {
    // Validate single product
    validationResult = await validateProductSecrets(productArg, environment, configResult.data);
  } else {
    // Validate all (global + all products)
    validationResult = await validateAllSecrets(environment, configResult.data);
  }

  if (!validationResult.ok) return validationResult;

  const validation: ValidationResult = validationResult.data;

  if (jsonMode) {
    log.json(validation);
    return ok(VoidSchema, undefined);
  }

  for (const folder of validation.folders) {
    if (folder.passed) {
      const passedMsg: Result<Str> = strings.validatePassed({ path: folder.path });
      if (!passedMsg.ok) return passedMsg;
      log.print(`{green}${passedMsg.data}{/}`);
    } else {
      const failedMsg: Result<Str> = strings.validateFailed({
        path: folder.path,
        count: folder.issues.length,
      });
      if (!failedMsg.ok) return failedMsg;
      log.print(`{red}${failedMsg.data}{/}`);

      for (const issue of folder.issues) {
        const missingMsg: Result<Str> = strings.validateMissing({
          key: issue.key,
          path: issue.path,
        });
        if (!missingMsg.ok) return missingMsg;
        log.print(`{dim}${missingMsg.data}{/}`);
      }
    }
  }

  log.print('');
  const summaryMsg: Result<Str> = strings.validateSummary({
    passed: validation.passed,
    failed: validation.failed,
  });
  if (!summaryMsg.ok) return summaryMsg;

  if (validation.failed > 0) {
    log.print(`{red}${summaryMsg.data}{/}`);
    return err(ERRORS.VALIDATION.INVALID_TYPE, { meta: { reason: 'Secret validation failed' } });
  }

  log.print(`{green}${summaryMsg.data}{/}`);

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the secrets tool. */
const command = createCommand<BuiltSecretsStrings>({
  id: 'secrets',
  version: '2.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  flagDefs: TOOL_FLAG_DEFS,

  handler: async (ctx: CommandContext<BuiltSecretsStrings>): Promise<Result<Void>> => {
    const strings: BuiltSecretsStrings = ctx.locale.command;

    // Check onboarding requirement
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
    const productArg: Str = ctx.options.product ?? '';
    const keyFlag: Str | undefined =
      'key' in ctx.options && typeof ctx.options.key === 'string' && ctx.options.key !== ''
        ? ctx.options.key
        : undefined;
    const valueFlag: Str | undefined =
      'value' in ctx.options && typeof ctx.options.value === 'string' && ctx.options.value !== ''
        ? ctx.options.value
        : undefined;
    const pathFlag: Str =
      'path' in ctx.options && typeof ctx.options.path === 'string' && ctx.options.path !== ''
        ? ctx.options.path
        : '/';
    const jsonMode: Bool = 'json' in ctx.options && ctx.options.json === true;
    const dryRun: Bool = 'dryRun' in ctx.options && ctx.options.dryRun === true;
    const force: Bool = 'force' in ctx.options && ctx.options.force === true;
    const categoryFlag: Str | undefined =
      'category' in ctx.options &&
      typeof ctx.options.category === 'string' &&
      ctx.options.category !== ''
        ? ctx.options.category
        : undefined;
    const backup: Bool = 'backup' in ctx.options && ctx.options.backup === true;

    // Actions that don't need infisical CLI
    if (action === 'doctor') return handleDoctor(ctx, jsonMode);

    // All other actions require infisical CLI
    const infisicalCheck: Result<Bool> = requireInfisical();
    if (!infisicalCheck.ok) {
      const notFoundMsg: Result<Str> = strings.infisicalNotFound();
      if (!notFoundMsg.ok) return notFoundMsg;
      log.print(`{red}${notFoundMsg.data}{/}`);
      return infisicalCheck;
    }

    // Dispatch
    switch (action) {
      case 'show':
        return handleShow(ctx, productArg);

      case 'get':
        if (!keyFlag) {
          const keyReqMsg: Result<Str> = strings.getKeyRequired();
          if (!keyReqMsg.ok) return keyReqMsg;
          log.print(`{red}${keyReqMsg.data}{/}`);
          return err(ERRORS.VALIDATION.MISSING_REQUIRED, { meta: { flag: '--key' } });
        }
        return handleGet(ctx, keyFlag, pathFlag, jsonMode);

      case 'set':
        if (!keyFlag) {
          const keyReqMsg: Result<Str> = strings.setKeyRequired();
          if (!keyReqMsg.ok) return keyReqMsg;
          log.print(`{red}${keyReqMsg.data}{/}`);
          return err(ERRORS.VALIDATION.MISSING_REQUIRED, { meta: { flag: '--key' } });
        }
        if (!valueFlag) {
          const valReqMsg: Result<Str> = strings.setValueRequired();
          if (!valReqMsg.ok) return valReqMsg;
          log.print(`{red}${valReqMsg.data}{/}`);
          return err(ERRORS.VALIDATION.MISSING_REQUIRED, { meta: { flag: '--value' } });
        }
        return handleSet(ctx, keyFlag, valueFlag, pathFlag, dryRun);

      case 'delete':
        if (!keyFlag) {
          const keyReqMsg: Result<Str> = strings.deleteKeyRequired();
          if (!keyReqMsg.ok) return keyReqMsg;
          log.print(`{red}${keyReqMsg.data}{/}`);
          return err(ERRORS.VALIDATION.MISSING_REQUIRED, { meta: { flag: '--key' } });
        }
        return handleDelete(ctx, keyFlag, pathFlag, dryRun);

      case 'list':
        return handleList(ctx, pathFlag, jsonMode);

      case 'search': {
        const query: Str = ctx.args.length > 1 ? String(ctx.args[1]) : '';
        if (!query) {
          const reqMsg: Result<Str> = strings.searchQueryRequired();
          if (!reqMsg.ok) return reqMsg;
          log.print(`{red}${reqMsg.data}{/}`);
          return err(ERRORS.VALIDATION.MISSING_REQUIRED, { meta: { field: 'query' } });
        }
        return handleSearch(ctx, query, jsonMode);
      }

      case 'migrate':
        return handleMigrate(ctx, jsonMode, dryRun, backup);

      case 'rotate':
        if (!categoryFlag) {
          const catReqMsg: Result<Str> = strings.rotateCategoryRequired();
          if (!catReqMsg.ok) return catReqMsg;
          log.print(`{red}${catReqMsg.data}{/}`);
          return err(ERRORS.VALIDATION.MISSING_REQUIRED, { meta: { flag: '--category' } });
        }
        return handleRotate(ctx, jsonMode, categoryFlag, dryRun, force);

      case 'sync':
        return handleSync(ctx, jsonMode, dryRun);

      case 'login':
        return handleLogin(ctx);

      case 'logout':
        return handleLogout(ctx);

      case 'whoami':
        return handleWhoami(ctx, jsonMode);

      case 'validate':
        return handleValidate(ctx, jsonMode, productArg);
    }
  },
});

export { command };
export default command;
