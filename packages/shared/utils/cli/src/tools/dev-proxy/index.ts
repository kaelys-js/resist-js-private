#!/usr/bin/env tsx
/**
 * Dev Proxy Tool
 *
 * Starts a local HTTPS reverse proxy using Caddy and mkcert.
 * Discovers products from `packages/products/`, generates per-service
 * virtual hosts, provisions TLS certificates, and watches
 * `resist.config.ts` for hot reload.
 *
 * Usage: `<pm> tool dev-proxy [--dry-run] [--expose] [--tunnel]`
 *
 * @module
 */

import type { ChildProcess } from 'node:child_process';
import { watch, type FSWatcher } from 'node:fs';
import * as v from 'valibot';

import type { CommandContext } from '@/cli/schemas';
import { TOOL_FLAG_DEFS } from '@/cli/tools/dev-proxy/flags';
import type { BuiltDevProxyStrings } from '@/cli/tools/dev-proxy/locales/schema';
import { createCommand } from '@/cli/utils/command';
import { requireOnboarding } from '@/cli/utils/core';
import { installToolAsync, isToolAvailable, waitForBrewLock } from '@/cli/utils/installer';
import { getConfig } from '@/config/loader';
import {
  BoolSchema,
  DEFAULT_EXIT_CODE,
  HostnameSchema,
  KebabCaseIdSchema,
  PathSchema,
  PortSchema,
  StrArraySchema,
  StrSchema,
  UrlStringSchema,
  VoidSchema,
  type Bool,
  type EnsureWorkspaceRootResult,
  type ExitCode,
  type Filename,
  type Hostname,
  type Ipv4AddressArray,
  type NonNegativeInteger,
  type NullableExitCode,
  type NullableIntervalId,
  type NullableRegExpMatchArray,
  type Path,
  type Port,
  type ProductNameArray,
  type NullableStr,
  type Str,
  type StrArray,
  type SupportedRuntimes,
  type UrlString,
  type Void,
} from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { PortOffset } from '@/schemas/core-config/tooling';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { deleteFile, mkdirRecursive } from '@/utils/core/fs';
import { getLocalHostname, getLocalIpAddresses } from '@/utils/core/network';
import type { DeepReadonly } from '@/utils/core/object';
import { joinPath, pathExists } from '@/utils/core/path';
import { exit, fatalExit, isWindows } from '@/utils/core/process';
import { discoverProducts } from '@/utils/core/products';
import { registerCleanupHandler } from '@/utils/core/signal';
import { runCommand, spawnProcess } from '@/utils/core/shell';
import { log } from '@/utils/core/terminal';
import { ensureWorkspaceRoot } from '@/utils/core/workspace';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

type NullableChildProcess = ChildProcess | null;
type NullableFSWatcher = FSWatcher | null;

/** Schema for nullable hostname. */
const NullableHostnameSchema = v.nullable(HostnameSchema);

/** @see {@link NullableHostnameSchema} */
type NullableHostname = v.InferOutput<typeof NullableHostnameSchema>;

/** Schema for optional URL string. */
const OptionalUrlStringSchema = v.optional(UrlStringSchema);

/** @see {@link OptionalUrlStringSchema} */
type OptionalUrlString = v.InferOutput<typeof OptionalUrlStringSchema>;

// =============================================================================
// Schemas
// =============================================================================

/** Schema for a single dev service (host + port). */
const ServiceSchema = v.strictObject({
  /** Virtual hostname for the service. */
  host: StrSchema,
  /** Port the service listens on. */
  port: PortSchema,
});

/** A single dev service (host + port). */
type Service = v.InferOutput<typeof ServiceSchema>;

/** Schema for optional service. */
const OptionalServiceSchema = v.optional(ServiceSchema);

/** @see {@link OptionalServiceSchema} */
type OptionalService = v.InferOutput<typeof OptionalServiceSchema>;

/** Schema for all services within a single product. */
const ProductServicesSchema = v.strictObject({
  /** API service. */
  api: ServiceSchema,
  /** App service. */
  app: ServiceSchema,
  /** Status service. */
  status: ServiceSchema,
  /** Assets service. */
  assets: ServiceSchema,
  /** Marketing service. */
  marketing: ServiceSchema,
});

/** All services within a single product. */
type ProductServices = v.InferOutput<typeof ProductServicesSchema>;

/** Schema for full local development configuration. */
const LocalDevConfigSchema = v.strictObject({
  /** Per-product service configurations keyed by product name. */
  products: v.record(KebabCaseIdSchema, ProductServicesSchema),
  /** Global tool services (admin, docs, qa). */
  globalServices: v.record(v.pipe(v.string(), v.minLength(1)), ServiceSchema),
});

/** Full local development configuration. */
type LocalDevConfig = v.InferOutput<typeof LocalDevConfigSchema>;

/** Schema for TLS certificate file paths. */
const CertFilesSchema = v.strictObject({
  /** Path to the certificate PEM file. */
  certFile: PathSchema,
  /** Path to the private key PEM file. */
  keyFile: PathSchema,
});

/** TLS certificate file paths. */
type CertFiles = v.InferOutput<typeof CertFilesSchema>;

/** Schema for a running tunnel process. */
const TunnelInfoSchema = v.strictObject({
  /** The child process running cloudflared. */
  process: v.custom<ChildProcess>((val: unknown): Bool => val != null && typeof val === 'object'),
  /** The public tunnel URL once established, or null. */
  url: v.nullable(UrlStringSchema),
  /** The local port being tunnelled. */
  port: PortSchema,
});

/** A running tunnel process. */
type TunnelInfo = v.InferOutput<typeof TunnelInfoSchema>;

/** Schema for the result of starting/restarting the proxy. */
const StartProxyResultSchema = v.strictObject({
  /** The Caddy child process, or null if dry-run. */
  caddyProcess: v.nullable(
    v.custom<ChildProcess>((val: unknown): Bool => val != null && typeof val === 'object'),
  ),
  /** All discovered services. */
  services: v.array(ServiceSchema),
  /** The generated local dev configuration. */
  config: LocalDevConfigSchema,
});

/** Result of starting/restarting the proxy. */
type StartProxyResult = v.InferOutput<typeof StartProxyResultSchema>;

/** Schema for proxy operation context passed to startProxy/restartProxy. */
const ProxyContextSchema = v.strictObject({
  /** Locale strings for dev-proxy messages. */
  strings: v.custom<BuiltDevProxyStrings>(
    (val: unknown): Bool => val != null && typeof val === 'object',
  ),
  /** Current working directory. */
  cwd: PathSchema,
  /** Whether to skip side effects (cert generation, Caddy start). */
  dryRun: BoolSchema,
  /** Whether to expose services to the local network. */
  expose: BoolSchema,
  /** Whether to create Cloudflare tunnels. */
  tunnel: BoolSchema,
});

/** Proxy operation context passed to startProxy/restartProxy. */
type ProxyContext = v.InferOutput<typeof ProxyContextSchema>;

// =============================================================================
// Static Config (internal implementation details)
// =============================================================================

const CONFIG = {
  certsDir: 'certs',
  certFile: 'local.pem',
  keyFile: 'local-key.pem',
} as const;

// Track the current Caddy process for restart capability
let currentCaddyProcess: NullableChildProcess = null;
let configWatcher: NullableFSWatcher = null;

// Track tunnel processes
let tunnelProcesses: TunnelInfo[] = [];

// =============================================================================
// Configuration Generation
// =============================================================================

/**
 * Generate service configuration for a single product.
 *
 * @param productName - Product name to generate services for.
 * @param portBase - Base port number for this product.
 * @returns `Result<ProductServices>` — product services configuration, or a structured error.
 */
function generateProductServices(productName: Str, portBase: Port): Result<ProductServices> {
  const nameResult: Result<Str> = safeParse(StrSchema, productName);
  if (!nameResult.ok) return nameResult;
  const portResult: Result<Port> = safeParse(PortSchema, portBase);
  if (!portResult.ok) return portResult;

  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const { serviceOffsets, localTld } = configResult.data.tooling.devProxy;
  const services: Record<string, Service> = {};

  for (const [serviceName, offset] of Object.entries(serviceOffsets)) {
    const host: Hostname =
      serviceName === 'marketing'
        ? `${productName}${localTld}`
        : `${serviceName}.${productName}${localTld}`;

    const servicePortResult: Result<Port> = safeParse(PortSchema, portBase + Number(offset));
    if (!servicePortResult.ok) return servicePortResult;
    services[serviceName] = {
      host,
      port: servicePortResult.data,
    };
  }

  const productServicesResult: Result<ProductServices> = safeParse(ProductServicesSchema, services);
  if (!productServicesResult.ok) return productServicesResult;
  return okUnchecked<ProductServices>(productServicesResult.data);
}

/**
 * Generate complete local development configuration.
 *
 * @returns `Result<LocalDevConfig>` — full local dev config with all products and global services, or a structured error.
 */
function generateLocalDevConfig(): Result<LocalDevConfig> {
  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const { port, portIncrement, localTld, adminPort, docsPort, qaPort } =
    configResult.data.tooling.devProxy;
  const productsResult: Result<ProductNameArray> = discoverProducts();
  if (!productsResult.ok) return productsResult;

  const productNames: ProductNameArray = productsResult.data;
  const products: Record<string, ProductServices> = {};

  for (let i: NonNegativeInteger = 0; i < productNames.length; i++) {
    const productName: Str = productNames[i];
    const portBaseResult: Result<Port> = safeParse(PortSchema, port + i * portIncrement);
    if (!portBaseResult.ok) return portBaseResult;
    const portBase: Port = portBaseResult.data;
    const servicesResult: Result<ProductServices> = generateProductServices(productName, portBase);
    if (!servicesResult.ok) return servicesResult;
    products[productName] = servicesResult.data;
  }

  const globalServices: Record<string, Service> = {
    admin: { host: `admin${localTld}`, port: adminPort },
    docs: { host: `docs${localTld}`, port: docsPort },
    qa: { host: `qa${localTld}`, port: qaPort },
  };

  return ok(LocalDevConfigSchema, { products, globalServices });
}

/**
 * Flatten configuration into a single array of services.
 *
 * @param config - Local dev configuration to flatten.
 * @returns `Result<Service[]>` — all services across products and global services, or a structured error.
 */
function getAllServices(config: LocalDevConfig): Result<Service[]> {
  const configValidation: Result<LocalDevConfig> = safeParse(LocalDevConfigSchema, config);
  if (!configValidation.ok) return configValidation;

  const services: Service[] = [];

  for (const product of Object.values(config.products)) {
    for (const service of Object.values(product)) {
      services.push(service);
    }
  }

  for (const service of Object.values(config.globalServices)) {
    services.push(service);
  }

  return okUnchecked<Service[]>(services);
}

// =============================================================================
// Certificate Management
// =============================================================================

/**
 * Create mkcert certificates for all proxy domains.
 * When expose is true, adds LAN IPs and mDNS hostname to SANs
 * and forces cert regeneration (IPs may change via DHCP).
 *
 * @param strings - Locale strings for messages.
 * @param cwd - Current working directory.
 * @param domains - Array of domain names for the certificate.
 * @param dryRun - Whether to skip actual certificate generation.
 * @param expose - Whether to include LAN addresses in SANs.
 * @returns `Result<CertFiles>` — certificate file paths, or a structured error.
 */
function setupCerts(
  strings: BuiltDevProxyStrings,
  cwd: Path,
  domains: StrArray,
  dryRun: Bool,
  expose: Bool,
): Result<CertFiles> {
  const cwdResult: Result<Path> = safeParse(PathSchema, cwd);
  if (!cwdResult.ok) return cwdResult;
  const domainsResult: Result<StrArray> = safeParse(StrArraySchema, domains);
  if (!domainsResult.ok) return domainsResult;
  const dryRunResult: Result<Bool> = safeParse(BoolSchema, dryRun);
  if (!dryRunResult.ok) return dryRunResult;
  const exposeResult: Result<Bool> = safeParse(BoolSchema, expose);
  if (!exposeResult.ok) return exposeResult;

  const certsDirResult: Result<Path> = joinPath([cwd, CONFIG.certsDir]);
  if (!certsDirResult.ok) return certsDirResult;
  const certsDir: Path = certsDirResult.data;

  const certFileResult: Result<Path> = joinPath([certsDir, CONFIG.certFile]);
  if (!certFileResult.ok) return certFileResult;
  const certFile: Path = certFileResult.data;

  const keyFileResult: Result<Path> = joinPath([certsDir, CONFIG.keyFile]);
  if (!keyFileResult.ok) return keyFileResult;
  const keyFile: Path = keyFileResult.data;

  // When exposing, add LAN IPs and mDNS hostname to cert SANs
  if (expose) {
    const ipsResult: Result<Ipv4AddressArray> = getLocalIpAddresses();
    if (ipsResult.ok) {
      domains.push(...ipsResult.data);
    }
    const hostnameResult: Result<Hostname> = getLocalHostname();
    if (hostnameResult.ok) {
      domains.push(hostnameResult.data);
    }
  }

  if (dryRun) {
    const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
    if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
    const dryRunWouldGenerateMsg: Result<Str> = strings.dryRunWouldGenerate({
      count: domains.length,
    });
    if (!dryRunWouldGenerateMsg.ok) return dryRunWouldGenerateMsg;
    log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${dryRunWouldGenerateMsg.data}`);
    return okUnchecked<CertFiles>({ certFile, keyFile });
  }

  const certsDirExistsResult: Result<Bool> = pathExists(certsDir);
  if (!certsDirExistsResult.ok) return certsDirExistsResult;
  if (!certsDirExistsResult.data) {
    const mkdirResult: Result<Void> = mkdirRecursive(certsDir);
    if (!mkdirResult.ok) return mkdirResult;
  }

  // Force cert regeneration when exposing (IPs may have changed)
  const certFileExistsResult: Result<Bool> = pathExists(certFile);
  if (!certFileExistsResult.ok) return certFileExistsResult;
  if (expose && certFileExistsResult.data) {
    deleteFile(certFile);
    deleteFile(keyFile);
  }

  const certFileExistsAfterResult: Result<Bool> = pathExists(certFile);
  if (!certFileExistsAfterResult.ok) return certFileExistsAfterResult;
  if (!certFileExistsAfterResult.data) {
    const generatingCertsMsg: Result<Str> = strings.generatingCerts();
    if (!generatingCertsMsg.ok) return generatingCertsMsg;
    log.info(generatingCertsMsg.data);
    const installResult: Result<Str> = runCommand('mkcert -install', 'pipe');
    if (!installResult.ok) {
      return err(ERRORS.IO.EXEC_FAILED, {
        meta: { tool: 'mkcert', reason: 'Failed to install local CA' },
        cause: installResult.error,
      });
    }
    const certGenResult: Result<Str> = runCommand(
      `mkcert -cert-file ${certFile} -key-file ${keyFile} ${domains.join(' ')}`,
      'pipe',
    );
    if (!certGenResult.ok) {
      return err(ERRORS.IO.EXEC_FAILED, {
        meta: { tool: 'mkcert', reason: 'Failed to generate certificates' },
        cause: certGenResult.error,
      });
    }
    const certsCreatedMsg: Result<Str> = strings.certsCreated({ count: domains.length });
    if (!certsCreatedMsg.ok) return certsCreatedMsg;
    log.print(`  {green}{symbol:success}{/} ${certsCreatedMsg.data}`);
  }

  return okUnchecked<CertFiles>({ certFile, keyFile });
}

// =============================================================================
// Caddyfile Generation
// =============================================================================

/**
 * Generate Caddyfile configuration.
 * When expose is true, appends port-based site blocks bound to 0.0.0.0
 * so services are accessible from other devices on the network.
 *
 * @param services - Array of services to generate config for.
 * @param certFile - Path to TLS certificate.
 * @param keyFile - Path to TLS private key.
 * @param expose - Whether to bind to 0.0.0.0 for network access.
 * @returns `Result<Str>` — generated Caddyfile content, or a structured error.
 */
function generateCaddyfile(
  services: Service[],
  certFile: Path,
  keyFile: Path,
  expose: Bool,
): Result<Str> {
  const servicesResult: Result<Service[]> = safeParse(v.array(ServiceSchema), services);
  if (!servicesResult.ok) return servicesResult;
  const certFileResult: Result<Path> = safeParse(PathSchema, certFile);
  if (!certFileResult.ok) return certFileResult;
  const keyFileResult: Result<Path> = safeParse(PathSchema, keyFile);
  if (!keyFileResult.ok) return keyFileResult;
  const exposeResult: Result<Bool> = safeParse(BoolSchema, expose);
  if (!exposeResult.ok) return exposeResult;

  const hostnameEntries: Str = services
    .map(
      ({ host, port }) => `
${host} {
	tls ${certFile} ${keyFile}

	header {
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}

	@cors method OPTIONS
	handle @cors {
		header Access-Control-Allow-Origin "*"
		header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
		header Access-Control-Allow-Headers "Content-Type, Authorization"
		header Access-Control-Max-Age "86400"
		respond 204
	}
	header Access-Control-Allow-Origin "*"

	encode gzip zstd

	reverse_proxy localhost:${port}
}`,
    )
    .join('\n');

  let portEntries: Str = '';
  if (expose) {
    portEntries = services
      .map(
        ({ port }) => `
:${port} {
	bind 0.0.0.0
	tls ${certFile} ${keyFile}

	header {
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}

	@cors method OPTIONS
	handle @cors {
		header Access-Control-Allow-Origin "*"
		header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
		header Access-Control-Allow-Headers "Content-Type, Authorization"
		header Access-Control-Max-Age "86400"
		respond 204
	}
	header Access-Control-Allow-Origin "*"

	encode gzip zstd

	reverse_proxy localhost:${port}
}`,
      )
      .join('\n');
  }

  return ok(StrSchema, `{ auto_https off }\n${hostnameEntries}${portEntries}`);
}

// =============================================================================
// Caddy Process Management
// =============================================================================

/**
 * Start Caddy with the generated configuration.
 *
 * @param strings - Locale strings for messages.
 * @param caddyfile - Generated Caddyfile content.
 * @param dryRun - Whether to skip actual Caddy start.
 * @param isRestart - Whether this is a restart (affects log message).
 * @returns `Result<NullableChildProcess>` — the spawned Caddy process (null if dry-run), or a structured error.
 */
function startCaddy(
  strings: BuiltDevProxyStrings,
  caddyfile: Str,
  dryRun: Bool,
  isRestart: Bool = false,
): Result<NullableChildProcess> {
  const caddyfileResult: Result<Str> = safeParse(StrSchema, caddyfile);
  if (!caddyfileResult.ok) return caddyfileResult;
  const dryRunResult: Result<Bool> = safeParse(BoolSchema, dryRun);
  if (!dryRunResult.ok) return dryRunResult;
  const isRestartResult: Result<Bool> = safeParse(BoolSchema, isRestart);
  if (!isRestartResult.ok) return isRestartResult;

  if (dryRun) {
    const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
    if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
    const dryRunSkipCaddyMsg: Result<Str> = strings.dryRunSkipCaddy();
    if (!dryRunSkipCaddyMsg.ok) return dryRunSkipCaddyMsg;
    log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${dryRunSkipCaddyMsg.data}`);
    return okUnchecked<NullableChildProcess>(null);
  }

  if (isRestart) {
    const restartingMsg: Result<Str> = strings.restarting();
    if (!restartingMsg.ok) return restartingMsg;
    log.info(restartingMsg.data);
  } else {
    const startingProxyMsg: Result<Str> = strings.startingProxy();
    if (!startingProxyMsg.ok) return startingProxyMsg;
    log.info(startingProxyMsg.data);
  }

  const caddyResult: Result<ChildProcess> = spawnProcess(
    'caddy',
    ['run', '--config', '-', '--adapter', 'caddyfile'],
    {
      stdio: ['pipe', 'inherit', 'inherit'],
      inherit: false,
    },
  );
  if (!caddyResult.ok) return caddyResult;

  const caddy: ChildProcess = caddyResult.data;

  caddy.stdin?.write(caddyfile);
  caddy.stdin?.end();

  // NOTE: Event handlers use fatalExit (process.exit) because they are
  // fire-and-forget callbacks — there is no caller to return a Result to.
  // Use fallback pattern since we cannot return Result from callbacks.
  caddy.on('error', (error: Error) => {
    const errorCaddyStartMsg = strings.errorCaddyStart();
    const errorMsg = errorCaddyStartMsg.ok ? errorCaddyStartMsg.data : 'Failed to start Caddy';
    const hintInstallMsg = strings.errorCaddyHintInstall();
    const hintPortMsg = strings.errorCaddyHintPort();
    const hintInstall = hintInstallMsg.ok ? hintInstallMsg.data : '';
    const hintPort = hintPortMsg.ok ? hintPortMsg.data : '';
    fatalExit({
      message: errorMsg,
      error,
      details: `${hintInstall}\n${hintPort}`,
    });
  });

  caddy.on('close', (code: NullableExitCode) => {
    if (currentCaddyProcess === caddy) {
      if (code !== 0 && code !== null) {
        const errorCaddyExitMsg = strings.errorCaddyExit();
        const errorMsg = errorCaddyExitMsg.ok
          ? errorCaddyExitMsg.data
          : 'Caddy exited unexpectedly';
        const exitCodeMsg = strings.errorCaddyExitCode({ code });
        const hintLogsMsg = strings.errorCaddyHintLogs();
        const hintCommonMsg = strings.errorCaddyHintCommon();
        const exitCode = exitCodeMsg.ok ? exitCodeMsg.data : `Exit code: ${code}`;
        const hintLogs = hintLogsMsg.ok ? hintLogsMsg.data : '';
        const hintCommon = hintCommonMsg.ok ? hintCommonMsg.data : '';
        fatalExit({
          message: errorMsg,
          details: `${exitCode}\n${hintLogs}\n${hintCommon}`,
        });
      }
      exit(code ?? DEFAULT_EXIT_CODE);
    }
  });

  currentCaddyProcess = caddy;
  return okUnchecked<NullableChildProcess>(caddy);
}

/**
 * Setup config file watcher for hot reload.
 *
 * @param strings - Locale strings for messages.
 * @param workspaceRoot - Path to workspace root directory.
 * @param restartCallback - Function to call when config changes.
 * @returns `Result<NullableFSWatcher>` — the FSWatcher instance (null if config file not found), or a structured error.
 */
function setupConfigWatcher(
  strings: BuiltDevProxyStrings,
  workspaceRoot: Path,
  restartCallback: () => void,
): Result<NullableFSWatcher> {
  const rootResult: Result<Path> = safeParse(PathSchema, workspaceRoot);
  if (!rootResult.ok) return rootResult;

  const configResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (!configResult.ok) return configResult;

  const configFilename: Filename = configResult.data.tooling.paths.configFilename;
  const configPathResult: Result<Path> = joinPath([workspaceRoot, configFilename]);
  if (!configPathResult.ok) return configPathResult;
  const configPath: Path = configPathResult.data;

  const configPathExistsResult: Result<Bool> = pathExists(configPath);
  if (!configPathExistsResult.ok) return configPathExistsResult;
  if (!configPathExistsResult.data) {
    return okUnchecked<NullableFSWatcher>(null);
  }

  const watchingConfigMsg: Result<Str> = strings.watchingConfig({ configFilename });
  if (!watchingConfigMsg.ok) return watchingConfigMsg;
  log.info(watchingConfigMsg.data);

  // Debounce to avoid multiple restarts from rapid file changes
  let debounceTimeout: NullableIntervalId = null;

  const watcher: FSWatcher = watch(configPath, (eventType: string) => {
    if (eventType === 'change') {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        log.print('');
        const configChangedMsg = strings.configChanged({ configFilename });
        const changedText = configChangedMsg.ok ? configChangedMsg.data : 'Config changed';
        log.warn(changedText);
        restartCallback();
      }, 500);
    }
  });

  return okUnchecked<NullableFSWatcher>(watcher);
}

/**
 * Stop the current Caddy process.
 *
 * @returns `Result<Void>` — success, or a structured error.
 */
function stopCaddy(): Result<Void> {
  if (currentCaddyProcess) {
    const oldProcess: ChildProcess = currentCaddyProcess;
    currentCaddyProcess = null;
    oldProcess.kill(isWindows ? 'SIGKILL' : 'SIGTERM');
  }
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Tunnel Management
// =============================================================================

/**
 * Start cloudflared quick tunnels for all services.
 * Each service gets its own tunnel pointing at localhost:PORT.
 *
 * @param strings - Locale strings for messages.
 * @param services - Array of services to create tunnels for.
 * @param dryRun - Whether to skip actual tunnel creation.
 * @returns `Promise<Result<Map<Port, Str>>>` — map of port to public tunnel URL, or a structured error.
 */
async function startTunnels(
  strings: BuiltDevProxyStrings,
  services: Service[],
  dryRun: Bool,
): Promise<Result<Map<Port, Str>>> {
  const servicesResult: Result<Service[]> = safeParse(v.array(ServiceSchema), services);
  if (!servicesResult.ok) return servicesResult;
  const dryRunResult: Result<Bool> = safeParse(BoolSchema, dryRun);
  if (!dryRunResult.ok) return dryRunResult;

  const tunnelUrls: Map<Port, Str> = new Map();

  if (dryRun) {
    const dryRunPrefixMsg: Result<Str> = strings.dryRunPrefix();
    if (!dryRunPrefixMsg.ok) return dryRunPrefixMsg;
    const tunnelDryRunMsg: Result<Str> = strings.tunnelDryRun({ count: services.length });
    if (!tunnelDryRunMsg.ok) return tunnelDryRunMsg;
    log.print(`  {yellow}${dryRunPrefixMsg.data}{/} ${tunnelDryRunMsg.data}`);
    return okUnchecked<Map<Port, Str>>(tunnelUrls);
  }

  // Check for named tunnel configuration (persistent URLs)
  const proxyConfigResult: Result<DeepReadonly<CoreConfig>> = getConfig();
  if (proxyConfigResult.ok) {
    const tunnelName: Str = proxyConfigResult.data.tooling.devProxy.tunnelName as Str;
    const tunnelHostname: Str = proxyConfigResult.data.tooling.devProxy.tunnelHostname as Str;

    if (tunnelName) {
      for (const service of services) {
        const namedMsg: Result<Str> = strings.tunnelNamed({
          name: tunnelName,
          url: tunnelHostname || tunnelName,
        });
        if (!namedMsg.ok) return namedMsg;
        log.info(namedMsg.data);

        const procResult: Result<ChildProcess> = spawnProcess(
          'cloudflared',
          ['tunnel', 'run', '--url', `https://localhost:${service.port}`, tunnelName as string],
          { stdio: ['ignore', 'pipe', 'pipe'], inherit: false },
        );
        if (procResult.ok) {
          const info: TunnelInfo = {
            process: procResult.data,
            url: tunnelHostname || null,
            port: service.port,
          };
          tunnelProcesses.push(info);
          if (tunnelHostname) {
            tunnelUrls.set(service.port, tunnelHostname);
          }
        }
      }
      return okUnchecked<Map<Port, Str>>(tunnelUrls);
    }
  }

  // Ephemeral quick tunnels (random *.trycloudflare.com URLs)
  const tunnelStartingMsg: Result<Str> = strings.tunnelStarting();
  if (!tunnelStartingMsg.ok) return tunnelStartingMsg;
  log.info(tunnelStartingMsg.data);

  const tunnelPromises: Promise<{ port: Port; url: NullableStr }>[] = services.map(
    (service: Service) =>
      new Promise<{ port: Port; url: NullableStr }>((resolve) => {
        const procResult: Result<ChildProcess> = spawnProcess(
          'cloudflared',
          ['tunnel', '--no-autoupdate', '--url', `http://localhost:${service.port}`],
          {
            stdio: ['ignore', 'pipe', 'pipe'],
            inherit: false,
          },
        );

        if (!procResult.ok) {
          resolve({ port: service.port, url: null });
          return;
        }

        const proc: ChildProcess = procResult.data;
        const info: TunnelInfo = { process: proc, url: null, port: service.port };
        tunnelProcesses.push(info);

        let stderr: Str = '';
        const urlRegex: RegExp = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

        const timeout: NodeJS.Timeout = setTimeout(() => {
          resolve({ port: service.port, url: null });
        }, 30000);

        proc.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
          const match: NullableRegExpMatchArray = stderr.match(urlRegex);
          if (match) {
            info.url = match[0];
            clearTimeout(timeout);
            resolve({ port: service.port, url: match[0] });
          }
        });

        proc.on('error', () => {
          clearTimeout(timeout);
          resolve({ port: service.port, url: null });
        });

        proc.on('close', () => {
          clearTimeout(timeout);
          if (!info.url) {
            resolve({ port: service.port, url: null });
          }
        });
      }),
  );

  const results: { port: Port; url: NullableStr }[] = await Promise.all(tunnelPromises);

  for (const { port, url } of results) {
    if (url) {
      tunnelUrls.set(port, url);
    } else {
      const service: OptionalService = services.find((s: Service) => s.port === port);
      const tunnelFailedMsg: Result<Str> = strings.tunnelFailed({
        service: service?.host ?? `port ${port}`,
      });
      if (!tunnelFailedMsg.ok) return tunnelFailedMsg;
      log.warn(tunnelFailedMsg.data);
    }
  }

  return okUnchecked<Map<Port, Str>>(tunnelUrls);
}

/**
 * Stop all running tunnel processes.
 *
 * @returns `Result<Void>` — success, or a structured error.
 */
function stopTunnels(): Result<Void> {
  for (const tunnel of tunnelProcesses) {
    if (!tunnel.process.killed) {
      tunnel.process.kill(isWindows ? 'SIGKILL' : 'SIGTERM');
    }
  }
  tunnelProcesses = [];
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Health Checks
// =============================================================================

/**
 * Check if a service is responding at its URL.
 *
 * @param host - Service hostname.
 * @param port - Service port.
 * @param timeoutMs - Connection timeout in milliseconds.
 * @returns `Result<Bool>` — `true` if service is responding.
 */
function checkServiceHealth(host: Str, port: Port, timeoutMs: NonNegativeInteger): Result<Bool> {
  const timeoutSec: NonNegativeInteger = Math.ceil(timeoutMs / 1000) as NonNegativeInteger;
  const curlResult: Result<Str> = runCommand(
    `curl -sk --max-time ${timeoutSec} -o /dev/null -w "%{http_code}" https://${host}:${port}/`,
    'pipe',
  );
  if (!curlResult.ok) return ok(BoolSchema, false);
  const statusCode: Str = curlResult.data.trim() as Str;
  // Any response (even 404) means the service is running
  const isHealthy: Bool = (statusCode !== '000') as Bool;
  return ok(BoolSchema, isHealthy);
}

// =============================================================================
// Display
// =============================================================================

/**
 * Display configuration summary.
 * When expose is true, shows network-accessible URLs alongside local ones.
 * When tunnelUrls is provided, shows public tunnel URLs.
 *
 * @param strings - Locale strings for messages.
 * @param config - Local dev configuration to display.
 * @param expose - Whether network URLs should be shown.
 * @param tunnelUrls - Optional map of port to tunnel URL.
 * @returns `Result<Void>` — success, or a structured error.
 */
function displayConfig(
  strings: BuiltDevProxyStrings,
  config: LocalDevConfig,
  expose: Bool,
  tunnelUrls?: ReadonlyMap<Port, Str>,
): Result<Void> {
  const configValidation: Result<LocalDevConfig> = safeParse(LocalDevConfigSchema, config);
  if (!configValidation.ok) return configValidation;
  const exposeResult: Result<Bool> = safeParse(BoolSchema, expose);
  if (!exposeResult.ok) return exposeResult;

  const productCount: NonNegativeInteger = Object.keys(config.products).length;
  let networkHost: NullableHostname = null;

  if (expose) {
    const hostnameResult: Result<Hostname> = getLocalHostname();
    if (hostnameResult.ok) {
      networkHost = hostnameResult.data;
    }
  }

  log.print('');
  const headerMsg: Result<Str> = strings.header();
  if (!headerMsg.ok) return headerMsg;
  log.print(`{bold}{yellow}${headerMsg.data}{/}{/}`);
  log.print('');

  if (expose) {
    const exposeWarningMsg: Result<Str> = strings.exposeWarning();
    if (!exposeWarningMsg.ok) return exposeWarningMsg;
    log.warn(exposeWarningMsg.data);
    const ipsResult: Result<Ipv4AddressArray> = getLocalIpAddresses();
    if (ipsResult.ok && ipsResult.data.length > 0) {
      const exposeIpsMsg: Result<Str> = strings.exposeIps({ ips: ipsResult.data.join(', ') });
      if (!exposeIpsMsg.ok) return exposeIpsMsg;
      log.info(exposeIpsMsg.data);
    } else {
      const exposeNoIpsMsg: Result<Str> = strings.exposeNoIps();
      if (!exposeNoIpsMsg.ok) return exposeNoIpsMsg;
      log.warn(exposeNoIpsMsg.data);
    }
    const exposeHostnameResult: Result<Hostname> = getLocalHostname();
    if (exposeHostnameResult.ok) {
      const exposeHostnameMsg: Result<Str> = strings.exposeHostname({
        hostname: exposeHostnameResult.data,
      });
      if (!exposeHostnameMsg.ok) return exposeHostnameMsg;
      log.info(exposeHostnameMsg.data);
    }
    log.print('');
  }

  if (productCount > 0) {
    const productsDiscoveredMsg: Result<Str> = strings.productsDiscovered({ count: productCount });
    if (!productsDiscoveredMsg.ok) return productsDiscoveredMsg;
    log.info(productsDiscoveredMsg.data);
    for (const [name, productServices] of Object.entries(config.products)) {
      log.print('');
      log.info(` {bold}${name}{/}`);

      for (const [serviceName, service] of Object.entries(productServices)) {
        const healthResult: Result<Bool> = checkServiceHealth(
          service.host,
          service.port,
          2000 as NonNegativeInteger,
        );
        const healthIndicator: Str = (
          healthResult.ok && healthResult.data ? ' {green}✓{/}' : ' {red}✗{/}'
        ) as Str;
        log.info(
          `    {dim}${serviceName.padEnd(10)}{/} {green}https://${service.host}{/} {dim}→{/} :${service.port}${healthIndicator}`,
        );

        if (networkHost) {
          log.info(
            `    {dim}${''.padEnd(10)}{/} {green}https://${networkHost}:${service.port}{/} {dim}(network){/}`,
          );
        }

        const tunnelUrl: OptionalUrlString = tunnelUrls?.get(service.port);
        if (tunnelUrl) {
          log.info(`    {dim}${''.padEnd(10)}{/} {green}${tunnelUrl}{/} {dim}(tunnel){/}`);
        }
      }
    }
    log.print('');
  }

  const globalServicesMsg: Result<Str> = strings.globalServices();
  if (!globalServicesMsg.ok) return globalServicesMsg;
  log.info(` {bold}${globalServicesMsg.data}{/}`);

  for (const [serviceName, service] of Object.entries(config.globalServices)) {
    const healthResult: Result<Bool> = checkServiceHealth(
      service.host,
      service.port,
      2000 as NonNegativeInteger,
    );
    const healthIndicator: Str = (
      healthResult.ok && healthResult.data ? ' {green}✓{/}' : ' {red}✗{/}'
    ) as Str;
    log.info(
      `    {dim}${serviceName.padEnd(10)}{/} {green}https://${service.host}{/} {dim}→{/} :${service.port}${healthIndicator}`,
    );

    if (networkHost) {
      log.info(
        `    {dim}${''.padEnd(10)}{/} {green}https://${networkHost}:${service.port}{/} {dim}(network){/}`,
      );
    }

    const tunnelUrl: OptionalUrlString = tunnelUrls?.get(service.port);
    if (tunnelUrl) {
      log.info(`    {dim}${''.padEnd(10)}{/} {green}${tunnelUrl}{/} {dim}(tunnel){/}`);
    }
  }

  log.print('');
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Proxy Lifecycle
// =============================================================================

/**
 * Start or restart the proxy with current configuration.
 *
 * @param ctx - Proxy operation context.
 * @param isRestart - Whether this is a restart (suppresses some output).
 * @returns `Result<StartProxyResult>` — Caddy process, services, and config, or a structured error.
 */
function startProxy(ctx: ProxyContext, isRestart: Bool = false): Result<StartProxyResult> {
  const ctxResult: Result<ProxyContext> = safeParse(ProxyContextSchema, ctx);
  if (!ctxResult.ok) return ctxResult;
  const isRestartResult: Result<Bool> = safeParse(BoolSchema, isRestart);
  if (!isRestartResult.ok) return isRestartResult;

  const configResult: Result<LocalDevConfig> = generateLocalDevConfig();
  if (!configResult.ok) return configResult;
  const config: LocalDevConfig = configResult.data;
  const productCount: NonNegativeInteger = Object.keys(config.products).length;

  if (productCount === 0 && !isRestart) {
    const proxyConfigResult: Result<DeepReadonly<CoreConfig>> = getConfig();
    if (!proxyConfigResult.ok) return proxyConfigResult;
    const noProductsFoundMsg: Result<Str> = ctx.strings.noProductsFound({
      productsDir: proxyConfigResult.data.tooling.paths.productsDir,
    });
    if (!noProductsFoundMsg.ok) return noProductsFoundMsg;
    log.warn(noProductsFoundMsg.data);
    const noProductsHintMsg: Result<Str> = ctx.strings.noProductsHint();
    if (!noProductsHintMsg.ok) return noProductsHintMsg;
    log.info(noProductsHintMsg.data);
    const createProductHintMsg: Result<Str> = ctx.strings.createProductHint();
    if (!createProductHintMsg.ok) return createProductHintMsg;
    log.info(createProductHintMsg.data);
  }

  const servicesResult: Result<Service[]> = getAllServices(config);
  if (!servicesResult.ok) return servicesResult;
  const services: Service[] = servicesResult.data;
  const domains: StrArray = services.map((s: Service) => s.host);
  const certsResult: Result<CertFiles> = setupCerts(
    ctx.strings,
    ctx.cwd,
    domains,
    ctx.dryRun,
    ctx.expose,
  );
  if (!certsResult.ok) return certsResult;
  const { certFile, keyFile }: CertFiles = certsResult.data;

  const caddyfileResult: Result<Str> = generateCaddyfile(services, certFile, keyFile, ctx.expose);
  if (!caddyfileResult.ok) return caddyfileResult;
  const caddyfile: Str = caddyfileResult.data;

  if (!isRestart) {
    const displayResult: Result<Void> = displayConfig(ctx.strings, config, ctx.expose);
    if (!displayResult.ok) return displayResult;
  }

  const caddyResult: Result<NullableChildProcess> = startCaddy(
    ctx.strings,
    caddyfile,
    ctx.dryRun,
    isRestart,
  );
  if (!caddyResult.ok) return caddyResult;

  return okUnchecked<StartProxyResult>({ caddyProcess: caddyResult.data, services, config });
}

/**
 * Restart the proxy (called when config changes).
 *
 * @param ctx - Proxy operation context.
 * @returns `Promise<Result<Void>>` — success, or a structured error.
 */
async function restartProxy(ctx: ProxyContext): Promise<Result<Void>> {
  const ctxResult: Result<ProxyContext> = safeParse(ProxyContextSchema, ctx);
  if (!ctxResult.ok) return ctxResult;

  stopTunnels();
  stopCaddy();
  const proxyResult: Result<StartProxyResult> = startProxy(ctx, true);
  if (!proxyResult.ok) return proxyResult;

  const { caddyProcess, services, config }: StartProxyResult = proxyResult.data;

  if (ctx.tunnel && caddyProcess) {
    const tunnelResult: Result<Map<Port, Str>> = await startTunnels(
      ctx.strings,
      services,
      ctx.dryRun,
    );
    if (!tunnelResult.ok) return tunnelResult;
    if (tunnelResult.data.size > 0) {
      const displayResult: Result<Void> = displayConfig(
        ctx.strings,
        config,
        ctx.expose,
        tunnelResult.data,
      );
      if (!displayResult.ok) return displayResult;
    }
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Command Definition
// =============================================================================

/** CLI command instance for the dev-proxy tool. */
const command = createCommand<BuiltDevProxyStrings>({
  id: 'dev-proxy',
  version: '1.0.0',
  runtimes: ['node-tty', 'node-pipe'],
  flagDefs: TOOL_FLAG_DEFS,

  handler: async (ctx: CommandContext<BuiltDevProxyStrings>): Promise<Result<Void>> => {
    const strings: BuiltDevProxyStrings = ctx.locale.command;

    const onboardResult: Result<Bool> = requireOnboarding();
    if (!onboardResult.ok) return onboardResult;
    if (!onboardResult.data) {
      return err(ERRORS.CONFIG.ONBOARDING_REQUIRED);
    }
    const dryRun: Bool = ctx.options.dryRun;
    const expose: Bool = ctx.options.expose;
    const tunnel: Bool = ctx.options.tunnel;

    // Ensure we are at workspace root
    const ensureResult: Result<EnsureWorkspaceRootResult> = ensureWorkspaceRoot();
    if (!ensureResult.ok) return ensureResult;
    if (ensureResult.data.status !== 'ok') {
      return err(ERRORS.WORKSPACE.ROOT_NOT_FOUND, {
        meta: { status: ensureResult.data.status, root: ensureResult.data.root },
      });
    }
    const workspaceRoot: Path = ensureResult.data.root;

    // Auto-install required tools (skip in dry-run)
    if (!dryRun) {
      const requiredTools: StrArray = ['mkcert', 'caddy'];
      if (tunnel) requiredTools.push('cloudflared');
      const missing: StrArray = requiredTools.filter((t: Str) => {
        const avail: Result<Bool> = isToolAvailable(t);
        return !avail.ok || !avail.data;
      });
      if (missing.length > 0) {
        const installingMsg: Result<Str> = strings.installingPrerequisites({
          tools: missing.join(', '),
        });
        if (!installingMsg.ok) return installingMsg;
        log.info(installingMsg.data);
        const brewResult: Result<Bool> = await waitForBrewLock();
        if (!brewResult.ok) return brewResult;
        for (const tool of missing) {
          const result: Result<Void> = await installToolAsync(tool, ctx.locale.cli);
          if (result.ok) {
            const installedMsg: Result<Str> = strings.prerequisiteInstalled({ tool });
            if (!installedMsg.ok) return installedMsg;
            log.print(`  {green}{symbol:success}{/} ${installedMsg.data}`);
          } else {
            return err(ERRORS.IO.EXEC_FAILED, {
              meta: { tool, reason: 'Prerequisite installation failed' },
            });
          }
        }
      }
    }

    // Build proxy context
    const proxyCtx: ProxyContext = { strings, cwd: ctx.cwd, dryRun, expose, tunnel };

    // Start the proxy
    const proxyResult: Result<StartProxyResult> = startProxy(proxyCtx, false);
    if (!proxyResult.ok) return proxyResult;

    const { caddyProcess, services, config }: StartProxyResult = proxyResult.data;

    // Start tunnels after Caddy is running
    if (tunnel && caddyProcess) {
      const tunnelResult: Result<Map<Port, Str>> = await startTunnels(strings, services, dryRun);
      if (tunnelResult.ok && tunnelResult.data.size > 0) {
        const displayResult: Result<Void> = displayConfig(
          strings,
          config,
          expose,
          tunnelResult.data,
        );
        if (!displayResult.ok) return displayResult;
      }
    } else if (tunnel && dryRun) {
      const tunnelResult: Result<Map<Port, Str>> = await startTunnels(strings, services, dryRun);
      if (!tunnelResult.ok) return tunnelResult;
    }

    // Setup config watcher for hot reload (only if Caddy was started)
    if (caddyProcess && !dryRun) {
      const watcherResult: Result<NullableFSWatcher> = setupConfigWatcher(
        strings,
        workspaceRoot,
        () => restartProxy(proxyCtx),
      );
      if (!watcherResult.ok) return watcherResult;
      configWatcher = watcherResult.data;

      // Cleanup on exit
      const cleanupResult: Result<Void> = registerCleanupHandler((): Void => {
        configWatcher?.close();
        stopTunnels();
        stopCaddy();
        exit(0);
      });
      if (!cleanupResult.ok) return cleanupResult;
    }

    // Keep the process running only if Caddy was actually started
    if (caddyProcess) {
      await new Promise(() => {});
    }

    return ok(VoidSchema, undefined);
  },
});

export { command };
export default command;
