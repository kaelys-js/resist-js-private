#!/usr/bin/env tsx
/**
 * Product Logs Tool
 *
 * Tails live logs from a Cloudflare Worker via `wrangler tail`.
 * Resolves the target product and service layer (auto-selects when
 * only one exists) and spawns Wrangler scoped to the chosen product,
 * service, and environment. Supports all wrangler tail filtering
 * and formatting flags.
 *
 * Usage: `<pm> tool product-logs [--product=<name>] [--service=<layer>] [--env=<env>] [wrangler flags]`
 *
 * @module
 */

import type { ChildProcess } from 'node:child_process';
import * as v from 'valibot';

import type { CommandContext } from '@/cli/schemas';
import { TOOL_FLAG_DEFS } from '@/cli/tools/product-logs/flags';
import type { BuiltProductLogsStrings } from '@/cli/tools/product-logs/locales/schema';
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import { getConfig } from '@/config/loader';
import {
  DEFAULT_EXIT_CODE,
  HttpMethodSchema,
  NonNegativeIntegerSchema,
  StrArraySchema,
  StrSchema,
  UnitIntervalSchema,
  VoidSchema,
  type Bool,
  type NonNegativeInteger,
  type OptionalStr,
  type ProductNameArray,
  type Str,
  type SupportedRuntimes,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { EnvironmentName } from '@/schemas/core-config/environment';
import { ServiceNameSchema, type ServiceName } from '@/schemas/core-config/tooling';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';
import { discoverProducts } from '@/utils/core/products';
import { isWindows } from '@/utils/core/process';
import { commandExists, spawnProcess } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Schemas
// =============================================================================

/** Schema for nullable non-negative integer. */
const NullableNonNegativeIntegerSchema = v.nullable(NonNegativeIntegerSchema);

/** @see {@link NullableNonNegativeIntegerSchema} */
type NullableNonNegativeInteger = v.InferOutput<typeof NullableNonNegativeIntegerSchema>;

/** Wrangler tail output format. */
const WranglerTailFormatSchema = v.picklist(['json', 'pretty']);

/** @see {@link WranglerTailFormatSchema} */
type WranglerTailFormat = v.InferOutput<typeof WranglerTailFormatSchema>;

/** Wrangler tail invocation status. */
const WranglerTailStatusSchema = v.picklist(['ok', 'error', 'canceled']);

/** Validates `key:value` header filter format. */
const HeaderFilterSchema = v.pipe(v.string(), v.regex(/^.+:.+$/, 'Must be in key:value format'));

/** IPv4 address or the literal `"self"`. */
const IpFilterSchema = v.pipe(
  v.string(),
  v.regex(/^(?:self|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/, 'Must be an IPv4 address or "self"'),
);

/** Schema for wrangler tail passthrough options collected from CLI flags. */
const WranglerPassthroughOptionsSchema = v.strictObject({
  /** Output format. */
  format: v.optional(WranglerTailFormatSchema),
  /** Invocation status filters. */
  status: v.optional(v.array(WranglerTailStatusSchema)),
  /** Header filters in key:value format. */
  header: v.optional(v.array(HeaderFilterSchema)),
  /** HTTP method filters. */
  method: v.optional(v.array(HttpMethodSchema)),
  /** Request sampling rate. */
  samplingRate: v.optional(UnitIntervalSchema),
  /** Text search substring. */
  search: v.optional(StrSchema),
  /** IP address filters. */
  ip: v.optional(v.array(IpFilterSchema)),
  /** Specific Worker version to tail. */
  versionId: v.optional(StrSchema),
  /** Enable wrangler debug output. */
  wranglerDebug: v.optional(v.boolean()),
});

/** @see {@link WranglerPassthroughOptionsSchema} */
type WranglerPassthroughOptions = v.InferOutput<typeof WranglerPassthroughOptionsSchema>;

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Resolve which product to tail logs from.
 *
 * Auto-selects when only one product exists. When multiple products
 * exist, requires the `--product` flag for explicit selection.
 *
 * @param strings - Locale strings for messages.
 * @param productArg - Product name from `--product` flag (may be undefined).
 * @returns Ok with the resolved product name, or an error Result.
 */
function resolveProduct(strings: BuiltProductLogsStrings, productArg: OptionalStr): Result<Str> {
  if (productArg !== undefined) {
    const parsed: Result<Str> = safeParse(StrSchema, productArg);
    if (!parsed.ok) return parsed;
  }

  const productsResult: Result<ProductNameArray> = discoverProducts();
  if (!productsResult.ok) return productsResult;

  const productNames: ProductNameArray = productsResult.data;
  const productCount: NonNegativeInteger = productNames.length;

  if (productCount === 0) {
    const noProductsMsg: Result<Str> = strings.noProducts();
    if (!noProductsMsg.ok) return noProductsMsg;
    log.info(noProductsMsg.data);
    return err(ERRORS.CONFIG.NOT_FOUND, { meta: { path: 'packages/products/' } });
  }

  // If product specified via --product flag
  if (productArg !== undefined && productArg !== 'all') {
    const productExists: Bool = productNames.includes(productArg);

    if (!productExists) {
      const projectNotFoundMsg: Result<Str> = strings.projectNotFound({ name: productArg });
      if (!projectNotFoundMsg.ok) return projectNotFoundMsg;
      const availableProductsMsg: Result<Str> = strings.availableProducts({
        products: productNames.join(', '),
      });
      if (!availableProductsMsg.ok) return availableProductsMsg;
      log.error(projectNotFoundMsg.data);
      log.info(availableProductsMsg.data);
      return err(ERRORS.CLI.INVALID_FLAG, {
        meta: { flag: '--product', reason: 'Product not found' },
      });
    }

    return ok(StrSchema, productArg);
  }

  // If multiple products exist, require explicit selection
  if (productCount > 1) {
    const multipleProductsMsg: Result<Str> = strings.multipleProducts();
    if (!multipleProductsMsg.ok) return multipleProductsMsg;
    const availableProductsMsg: Result<Str> = strings.availableProducts({
      products: productNames.join(', '),
    });
    if (!availableProductsMsg.ok) return availableProductsMsg;
    log.error(multipleProductsMsg.data);
    log.info(availableProductsMsg.data);
    return err(ERRORS.CLI.MISSING_VALUE, {
      meta: { flag: '--product', reason: 'Multiple products found — specify one' },
    });
  }

  // Only one product — use it
  return ok(StrSchema, productNames[0]);
}

/**
 * Build wrangler tail CLI arguments from passthrough options.
 *
 * Maps each non-undefined option to its corresponding wrangler tail
 * CLI flag. Repeatable options emit one `--flag value` pair per entry.
 *
 * @param options - Validated wrangler passthrough options.
 * @returns `Result<Str[]>` — array of wrangler CLI arguments.
 */
function buildWranglerArgs(options: WranglerPassthroughOptions): Result<Str[]> {
  const optionsResult: Result<WranglerPassthroughOptions> = safeParse(
    WranglerPassthroughOptionsSchema,
    options,
  );
  if (!optionsResult.ok) return optionsResult;
  const opts: WranglerPassthroughOptions = optionsResult.data;

  const args: Str[] = [];

  if (opts.format !== undefined) {
    args.push('--format', opts.format);
  }
  if (opts.status !== undefined) {
    for (const statusValue of opts.status) {
      args.push('--status', statusValue);
    }
  }
  if (opts.header !== undefined) {
    for (const headerValue of opts.header) {
      args.push('--header', headerValue);
    }
  }
  if (opts.method !== undefined) {
    for (const methodValue of opts.method) {
      args.push('--method', methodValue);
    }
  }
  if (opts.samplingRate !== undefined) {
    args.push('--sampling-rate', String(opts.samplingRate));
  }
  if (opts.search !== undefined) {
    args.push('--search', opts.search);
  }
  if (opts.ip !== undefined) {
    for (const ipValue of opts.ip) {
      args.push('--ip', ipValue);
    }
  }
  if (opts.versionId !== undefined) {
    args.push('--version-id', opts.versionId);
  }
  if (opts.wranglerDebug === true) {
    args.push('--debug');
  }

  return ok(StrArraySchema, args);
}

/**
 * Build package-manager-specific filter arguments for `wrangler tail`.
 *
 * Constructs the command array that targets a specific product service
 * package and passes all wrangler tail arguments.
 *
 * @param pmName - Package manager name (e.g. `"pnpm"`, `"npm"`).
 * @param packageName - Scoped package name (e.g. `"@myapp/api"`).
 * @param environment - Target environment.
 * @param wranglerArgs - Additional wrangler tail arguments from passthrough flags.
 * @returns `Result<Str[]>` — array of CLI arguments, or error if inputs invalid.
 */
function buildPmArgs(
  pmName: Str,
  packageName: Str,
  environment: EnvironmentName,
  wranglerArgs: Str[],
): Result<Str[]> {
  const nameResult: Result<Str> = safeParse(StrSchema, packageName);
  if (!nameResult.ok) return nameResult;
  const envResult: Result<Str> = safeParse(StrSchema, environment);
  if (!envResult.ok) return envResult;

  const wranglerTailArgs: Str[] = ['wrangler', 'tail', '--env', envResult.data, ...wranglerArgs];

  if (pmName === 'npm') {
    return ok(StrArraySchema, ['--workspace', nameResult.data, 'exec', ...wranglerTailArgs]);
  }
  if (pmName === 'yarn') {
    return ok(StrArraySchema, ['workspace', nameResult.data, 'exec', ...wranglerTailArgs]);
  }
  // pnpm, bun, and fallback all use --filter
  return ok(StrArraySchema, ['--filter', nameResult.data, 'exec', ...wranglerTailArgs]);
}

/**
 * Tail logs from a Cloudflare Worker via `wrangler tail`.
 *
 * Spawns the package manager with filter args scoped to the chosen
 * product, service, and environment. Passes all wrangler tail
 * filtering and formatting options. Resolves when the process exits.
 *
 * @param strings - Locale strings for messages.
 * @param productName - Resolved product name.
 * @param serviceName - Target service layer (api, app, status, assets, marketing).
 * @param environment - Target environment.
 * @param config - Resolved core configuration (for package manager name).
 * @param wranglerOptions - Wrangler tail passthrough options.
 * @returns Ok with the exit code, or an error Result.
 */
function tailLogs(
  strings: BuiltProductLogsStrings,
  productName: Str,
  serviceName: ServiceName,
  environment: EnvironmentName,
  config: DeepReadonly<CoreConfig>,
  wranglerOptions: WranglerPassthroughOptions,
): Promise<Result<NonNegativeInteger>> {
  const nameResult: Result<Str> = safeParse(StrSchema, productName);
  if (!nameResult.ok) return Promise.resolve(nameResult);
  const serviceResult: Result<ServiceName> = safeParse(ServiceNameSchema, serviceName);
  if (!serviceResult.ok) return Promise.resolve(serviceResult);

  const packageName: Str = `@${nameResult.data}/${serviceResult.data}`;
  const pmName: Str = config.tooling.packageManager.manager;

  const wranglerArgsResult: Result<Str[]> = buildWranglerArgs(wranglerOptions);
  if (!wranglerArgsResult.ok) return Promise.resolve(wranglerArgsResult);

  const pmArgsResult: Result<Str[]> = buildPmArgs(
    pmName,
    packageName,
    environment,
    wranglerArgsResult.data,
  );
  if (!pmArgsResult.ok) return Promise.resolve(pmArgsResult);
  const pmArgs: Str[] = pmArgsResult.data;

  const headerMsg: Result<Str> = strings.header();
  if (!headerMsg.ok) return Promise.resolve(headerMsg);
  const tailingLogsMsg: Result<Str> = strings.tailingLogs({
    product: nameResult.data,
    service: serviceResult.data,
    env: environment,
  });
  if (!tailingLogsMsg.ok) return Promise.resolve(tailingLogsMsg);
  const pressCtrlCMsg: Result<Str> = strings.pressCtrlC();
  if (!pressCtrlCMsg.ok) return Promise.resolve(pressCtrlCMsg);

  log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);
  log.print(`  {symbol:info} ${tailingLogsMsg.data}`);
  log.info(pressCtrlCMsg.data);
  log.print('');

  const spawnResult: Result<ChildProcess> = spawnProcess(pmName, pmArgs, { shell: isWindows });
  if (!spawnResult.ok) return Promise.resolve(spawnResult);

  const wrangler: ChildProcess = spawnResult.data;

  return new Promise((resolve) => {
    wrangler.on('error', (error: Error) => {
      resolve(
        err(ERRORS.IO.EXEC_FAILED, {
          meta: { tool: 'wrangler' },
          cause: fromUnknownError(error),
        }),
      );
    });

    wrangler.on('close', (code: NullableNonNegativeInteger) => {
      const exitCode: NonNegativeInteger = code ?? DEFAULT_EXIT_CODE;

      if (exitCode !== 0) {
        const msg: Result<Str> = strings.errorWranglerFailed({ code: exitCode });
        // Event handler — can't propagate Result, use fallback
        const errMsg: Str = msg.ok ? msg.data : `Wrangler exited with code ${exitCode}`;
        log.error(errMsg);
      }

      resolve(ok(NonNegativeIntegerSchema, exitCode));
    });
  });
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the product-logs tool. */
const command = createCommand<BuiltProductLogsStrings>({
  id: 'product-logs',
  version: '2.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  flagDefs: TOOL_FLAG_DEFS,

  handler: async (ctx: CommandContext<BuiltProductLogsStrings>): Promise<Result<Void>> => {
    const strings: BuiltProductLogsStrings = ctx.locale.command;

    // Check onboarding requirement
    const onboardResult: Result<Bool> = requireOnboarding();
    if (!onboardResult.ok) return onboardResult;
    if (!onboardResult.data) {
      return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
    }

    // Check wrangler is available
    const wranglerResult: Result<Bool> = commandExists('wrangler');
    if (!wranglerResult.ok) return wranglerResult;
    if (!wranglerResult.data) {
      return err(ERRORS.IO.TOOL_NOT_FOUND, {
        meta: { tool: 'wrangler', installHint: 'npm install -g wrangler' },
      });
    }

    // Load config (single call, passed to tailLogs)
    const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!configResult.ok) return configResult;

    // Resolve environment (flag validated by EnvironmentNameSchema in parser, config fallback typed as EnvironmentName)
    const environment: EnvironmentName = ctx.options.env;

    // Resolve which product to use
    const productArg: OptionalStr = ctx.options.product;
    const productResult: Result<Str> = resolveProduct(strings, productArg);
    if (!productResult.ok) return productResult;
    const productName: Str = productResult.data;

    // Resolve service layer (defaults to 'api' via flag default)
    const serviceName: ServiceName = ctx.options.service ?? 'api';
    const serviceValidation: Result<ServiceName> = safeParse(ServiceNameSchema, serviceName);
    if (!serviceValidation.ok) return serviceValidation;

    // Collect wrangler tail passthrough options
    const wranglerOptions: WranglerPassthroughOptions = {
      format: ctx.options.format,
      status: ctx.options.status,
      header: ctx.options.header,
      method: ctx.options.method,
      samplingRate:
        ctx.options.samplingRate !== undefined ? Number(ctx.options.samplingRate) : undefined,
      search: ctx.options.search,
      ip: ctx.options.ip,
      versionId: ctx.options.versionId,
      wranglerDebug: ctx.options.wranglerDebug,
    };
    const wranglerOptionsResult: Result<WranglerPassthroughOptions> = safeParse(
      WranglerPassthroughOptionsSchema,
      wranglerOptions,
    );
    if (!wranglerOptionsResult.ok) return wranglerOptionsResult;

    // Tail logs
    const tailResult: Result<NonNegativeInteger> = await tailLogs(
      strings,
      productName,
      serviceValidation.data,
      environment,
      configResult.data,
      wranglerOptionsResult.data,
    );
    if (!tailResult.ok) return tailResult;

    if (tailResult.data !== 0) {
      return err(ERRORS.IO.EXEC_FAILED, { meta: { tool: 'wrangler', exitCode: tailResult.data } });
    }

    return ok(VoidSchema, undefined);
  },
});

export { command };
export default command;
