/**
 * Tooling Schemas
 *
 * Valibot schemas for CLI tool and dev environment configuration.
 *
 * @module
 */

import * as v from 'valibot';

import { PortSchema } from '@/schemas/common';
import { StandardEnvironmentSchema } from '@/schemas/core-config/environment';
import { PinnedVersionSchema } from '@/schemas/core-config/versions';

// =============================================================================
// Primitive Schemas
// =============================================================================

/**
 * Port offset for service configuration (0-99).
 * Used to calculate service ports relative to a base port.
 */
export const PortOffsetSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(99));

/** Inferred output type of {@link PortOffsetSchema}. An integer from 0 to 99. */
export type PortOffset = v.InferOutput<typeof PortOffsetSchema>;

/**
 * Local TLD for development domains.
 * Must start with a dot and contain only lowercase letters, numbers, and hyphens.
 */
export const LocalTldSchema = v.pipe(
  v.string(),
  v.regex(/^\.[a-z][a-z0-9-]*$/, 'Must be valid local TLD (e.g., ".localhost")'),
);

/** Inferred output type of {@link LocalTldSchema}. A dot-prefixed TLD string. */
export type LocalTld = v.InferOutput<typeof LocalTldSchema>;

/**
 * Tab width for code formatting (1-8).
 */
export const TabWidthSchema = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8));

/** Inferred output type of {@link TabWidthSchema}. An integer from 1 to 8. */
export type TabWidth = v.InferOutput<typeof TabWidthSchema>;

/**
 * Print/line width for code formatting (40-200).
 */
export const PrintWidthSchema = v.pipe(v.number(), v.integer(), v.minValue(40), v.maxValue(200));

/** Inferred output type of {@link PrintWidthSchema}. An integer from 40 to 200. */
export type PrintWidth = v.InferOutput<typeof PrintWidthSchema>;

// =============================================================================
// Service Offsets
// =============================================================================

/**
 * Valibot schema for port offsets assigned to each service type within a product.
 * The dev proxy adds these offsets to the product's base port to derive per-service ports.
 *
 * For a product at base port 3000: app → 3000, api → 3001, status → 3002, etc.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(ServiceOffsetsSchema, {
 *   app: 0,
 *   api: 1,
 *   status: 2,
 * });
 * ```
 */
export const ServiceOffsetsSchema = v.strictObject({
  /** App service port offset */
  app: v.optional(PortOffsetSchema, 0),
  /** API service port offset */
  api: v.optional(PortOffsetSchema, 1),
  /** Status service port offset */
  status: v.optional(PortOffsetSchema, 2),
  /** Assets service port offset */
  assets: v.optional(PortOffsetSchema, 3),
  /** Marketing service port offset */
  marketing: v.optional(PortOffsetSchema, 4),
});

/** Inferred output type of {@link ServiceOffsetsSchema}. */
export type ServiceOffsets = v.InferOutput<typeof ServiceOffsetsSchema>;

/**
 * Valid product service layer names.
 * Derived from the keys of {@link ServiceOffsetsSchema}.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(ServiceNameSchema, 'api');
 * // { ok: true, data: 'api' }
 * ```
 */
export const ServiceNameSchema = v.picklist(['api', 'app', 'status', 'assets', 'marketing']);

/** @see {@link ServiceNameSchema} */
export type ServiceName = v.InferOutput<typeof ServiceNameSchema>;

// =============================================================================
// Dev Proxy
// =============================================================================

/**
 * Valibot schema for the local development proxy server configuration.
 * Controls ports, HTTPS, local TLD, and per-service port offsets.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(DevProxySchema, {
 *   port: 4000,
 *   https: true,
 *   localTld: '.localhost',
 * });
 * ```
 */
export const DevProxySchema = v.strictObject({
  /** Base port for the dev proxy server */
  port: v.optional(PortSchema, 3000),
  /** Enable HTTPS with mkcert */
  https: v.optional(v.boolean(), true),
  /** TLD suffix for local development domains (e.g., ".localhost") */
  localTld: v.optional(LocalTldSchema, '.localhost'),
  /** Port increment between products */
  portIncrement: v.optional(PortOffsetSchema, 100),
  /** Port for the admin dashboard */
  adminPort: v.optional(PortSchema, 9001),
  /** Port for the QA/testing service */
  qaPort: v.optional(PortSchema, 9002),
  /** Port for the documentation server */
  docsPort: v.optional(PortSchema, 9003),
  /** Port offsets for each service type within a product */
  serviceOffsets: v.optional(ServiceOffsetsSchema),
  /** Named tunnel for persistent URLs (requires `cloudflared tunnel create`). Leave empty for ephemeral quick tunnels. */
  tunnelName: v.optional(v.string(), ''),
  /** Custom hostname for named tunnel (requires DNS setup). */
  tunnelHostname: v.optional(v.string(), ''),
});

/** Inferred output type of {@link DevProxySchema}. */
export type DevProxy = v.InferOutput<typeof DevProxySchema>;

// =============================================================================
// Formatting
// =============================================================================

/**
 * Valibot schema for code formatting preferences.
 * These values drive Biome, EditorConfig, and other formatting tool configs
 * generated by `pnpm tool sync`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(FormattingSchema, {
 *   useTabs: true,
 *   tabWidth: 2,
 *   printWidth: 100,
 *   singleQuote: true,
 *   semi: true,
 * });
 * ```
 */
export const FormattingSchema = v.strictObject({
  /** Use tabs instead of spaces */
  useTabs: v.optional(v.boolean(), true),
  /** Tab width (for display purposes) */
  tabWidth: v.optional(TabWidthSchema, 2),
  /** Line width before wrapping */
  printWidth: v.optional(PrintWidthSchema, 100),
  /** Use single quotes */
  singleQuote: v.optional(v.boolean(), true),
  /** Add semicolons */
  semi: v.optional(v.boolean(), true),
});

/** Inferred output type of {@link FormattingSchema}. */
export type Formatting = v.InferOutput<typeof FormattingSchema>;

// =============================================================================
// Paths
// =============================================================================

/**
 * Valibot schema for workspace path conventions.
 * Defines where products, templates, CLI tools, and config files live
 * relative to the workspace root.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(PathsSchema, {
 *   productsDir: 'packages/products',
 *   configFilename: 'resist.config.ts',
 * });
 * ```
 */
export const PathsSchema = v.strictObject({
  /** Directory containing product packages */
  productsDir: v.optional(v.string(), 'packages/products'),
  /** Directory containing the product template */
  productTemplateDir: v.optional(v.string(), 'packages/products-template'),
  /** Directory containing CLI tools source */
  cliToolsDir: v.optional(v.string(), 'packages/shared/utils/cli/src/tools'),
  /** Directory for cached tooling schemas */
  schemasDir: v.optional(v.string(), 'packages/shared/schemas/tooling'),
  /** Root config filename (without path) */
  configFilename: v.optional(v.string(), 'resist.config.ts'),
  /** Marker directory for CLI state (relative to workspace root) */
  markerDir: v.optional(v.string(), '.resist'),
});

/** Inferred output type of {@link PathsSchema}. */
export type Paths = v.InferOutput<typeof PathsSchema>;

/**
 * Default config filename: `'resist.config.ts'`.
 *
 * The root configuration file name, matching the default in {@link PathsSchema}.
 *
 * @example
 * ```typescript
 * const filename: Str = DEFAULT_CONFIG_FILENAME; // 'resist.config.ts'
 * ```
 */
export const DEFAULT_CONFIG_FILENAME = 'resist.config.ts';

// =============================================================================
// Package Manager
// =============================================================================

/**
 * Supported package managers.
 */
export const PackageManagerTypeSchema = v.picklist(['pnpm', 'npm', 'yarn', 'bun']);

/** Inferred output type of {@link PackageManagerTypeSchema}. One of `'pnpm' | 'npm' | 'yarn' | 'bun'`. */
export type PackageManagerType = v.InferOutput<typeof PackageManagerTypeSchema>;

/**
 * Default package manager: `'pnpm'`.
 *
 * @example
 * ```typescript
 * const pm: PackageManagerType = DEFAULT_PACKAGE_MANAGER; // 'pnpm'
 * ```
 */
export const DEFAULT_PACKAGE_MANAGER: PackageManagerType = 'pnpm';

/**
 * Valibot schema for package manager configuration.
 * Specifies which package manager the monorepo uses.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(PackageManagerSchema, { manager: 'pnpm' });
 * ```
 */
export const PackageManagerSchema = v.strictObject({
  /** Package manager to use (default: `'pnpm'`). */
  manager: v.optional(PackageManagerTypeSchema, DEFAULT_PACKAGE_MANAGER),
});

/** Inferred output type of {@link PackageManagerSchema}. */
export type PackageManager = v.InferOutput<typeof PackageManagerSchema>;

// =============================================================================
// Onboarding
// =============================================================================

/**
 * Valibot schema for developer onboarding configuration.
 * Defines the ordered list of CLI scripts run during `pnpm onboard`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(OnboardingSchema, {
 *   steps: ['i', 'clean', 'ci:local'],
 * });
 * ```
 */
export const OnboardingSchema = v.strictObject({
  /** Ordered list of scripts to run during onboarding */
  steps: v.optional(v.array(v.pipe(v.string(), v.minLength(1))), [
    'i',
    'clean',
    'setup:vscode',
    'update:sync',
    'secrets:setup',
    'ci:local',
  ]),
});

/** Inferred output type of {@link OnboardingSchema}. */
export type Onboarding = v.InferOutput<typeof OnboardingSchema>;

// =============================================================================
// Dev Container
// =============================================================================

/**
 * Docker image reference.
 * Must be a valid Docker image name (lowercase, may include registry, tag, digest).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(DockerImageSchema, 'mcr.microsoft.com/devcontainers/base:ubuntu');
 * ```
 */
export const DockerImageSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.regex(/^[a-z0-9][a-z0-9._\-/:]+$/, 'Must be a valid Docker image reference'),
);

/** Inferred output type of {@link DockerImageSchema}. A valid Docker image reference string. */
export type DockerImage = v.InferOutput<typeof DockerImageSchema>;

/**
 * Apt package name.
 * Must be a valid Debian/Ubuntu package name.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(AptPackageSchema, 'build-essential');
 * ```
 */
export const AptPackageSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.regex(/^[a-z0-9][a-z0-9.+\-]+$/, 'Must be a valid apt package name'),
);

/** Inferred output type of {@link AptPackageSchema}. A valid apt package name string. */
export type AptPackage = v.InferOutput<typeof AptPackageSchema>;

/**
 * Valibot schema for Dev Container configuration.
 * Controls the generation of `.devcontainer/` files by the sync tool.
 *
 * When `enabled` is `true` (default), `pnpm tool sync` generates:
 * - `.devcontainer/devcontainer.json` — container spec, features, port forwards
 * - `.devcontainer/Dockerfile` — Ubuntu base + mise + Node + PM
 * - `.devcontainer/post-create.sh` — install tools, dependencies, run onboarding
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(DevContainerSchema, {
 *   enabled: true,
 *   baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
 *   aptPackages: ['postgresql-client'],
 *   additionalPorts: [5432],
 * });
 * ```
 */
export const DevContainerSchema = v.strictObject({
  /** Enable devcontainer file generation (default: true) */
  enabled: v.optional(v.boolean(), true),
  /** Base Docker image for the dev container */
  baseImage: v.optional(DockerImageSchema, 'mcr.microsoft.com/devcontainers/base:ubuntu'),
  /** Additional apt packages beyond defaults (curl, git, ca-certificates, build-essential) */
  aptPackages: v.optional(v.array(AptPackageSchema), []),
  /** Additional port forwards beyond the auto-detected devProxy ports */
  additionalPorts: v.optional(v.array(PortSchema), []),
  /** Environment variables to inject into the container. Values can reference Infisical paths. */
  envVars: v.optional(v.record(v.string(), v.string()), {}),
  /** Automatically open the container in VS Code after `devenv up`. */
  autoOpen: v.optional(v.boolean(), false),
});

/** Inferred output type of {@link DevContainerSchema}. */
export type DevContainer = v.InferOutput<typeof DevContainerSchema>;

// =============================================================================
// Coder
// =============================================================================

/**
 * CPU core count for container resource limits (1-32).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(CpuCoresSchema, 4);
 * ```
 */
export const CpuCoresSchema = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(32));

/** Inferred output type of {@link CpuCoresSchema}. An integer from 1 to 32. */
export type CpuCores = v.InferOutput<typeof CpuCoresSchema>;

/**
 * Memory in GB for container resource limits (1-128).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(MemoryGbSchema, 8);
 * ```
 */
export const MemoryGbSchema = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(128));

/** Inferred output type of {@link MemoryGbSchema}. An integer from 1 to 128. */
export type MemoryGb = v.InferOutput<typeof MemoryGbSchema>;

/**
 * Disk in GB for container resource limits (10-1000).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(DiskGbSchema, 50);
 * ```
 */
export const DiskGbSchema = v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(1000));

/** Inferred output type of {@link DiskGbSchema}. An integer from 10 to 1000. */
export type DiskGb = v.InferOutput<typeof DiskGbSchema>;

/**
 * Valibot schema for Coder workspace resource defaults.
 * These become the default parameter values in the Coder template —
 * developers can override them when creating a workspace.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(CoderResourcesSchema, { cpu: 4, memoryGb: 8, diskGb: 50 });
 * ```
 */
export const CoderResourcesSchema = v.strictObject({
  /** CPU cores per workspace (default: 4) */
  cpu: v.optional(CpuCoresSchema, 4),
  /** Memory in GB per workspace (default: 8) */
  memoryGb: v.optional(MemoryGbSchema, 8),
  /** Disk in GB per workspace (default: 50) */
  diskGb: v.optional(DiskGbSchema, 50),
});

/** Inferred output type of {@link CoderResourcesSchema}. */
export type CoderResources = v.InferOutput<typeof CoderResourcesSchema>;

// =============================================================================
// Container Registry
// =============================================================================

/**
 * Container registry authentication method.
 * - `docker-login`: Use `docker login` with credentials from env vars
 * - `ecr`: AWS ECR — use `aws ecr get-login-password`
 * - `gcloud`: GCR/AR — use `gcloud auth configure-docker`
 * - `none`: Registry allows anonymous push (e.g., local registry)
 */
export const RegistryAuthMethodSchema = v.picklist(['docker-login', 'ecr', 'gcloud', 'none']);

/** Inferred output type of {@link RegistryAuthMethodSchema}. */
export type RegistryAuthMethod = v.InferOutput<typeof RegistryAuthMethodSchema>;

/**
 * Valibot schema for container registry configuration.
 * Controls where workspace images are pushed for remote Coder workspaces.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(ContainerRegistrySchema, {
 *   url: 'ghcr.io',
 *   namespace: 'myorg',
 *   authMethod: 'docker-login',
 * });
 * ```
 */
export const ContainerRegistrySchema = v.strictObject({
  /** Registry URL (e.g., `ghcr.io`, `registry.example.com`, `<account>.dkr.ecr.<region>.amazonaws.com`). */
  url: v.optional(v.pipe(v.string(), v.minLength(1)), 'ghcr.io'),
  /** Namespace/organization for the image (e.g., GitHub org, AWS account). */
  namespace: v.optional(v.string(), ''),
  /** Authentication method for the registry. */
  authMethod: v.optional(RegistryAuthMethodSchema, 'docker-login'),
});

/** Inferred output type of {@link ContainerRegistrySchema}. */
export type ContainerRegistry = v.InferOutput<typeof ContainerRegistrySchema>;

// =============================================================================
// Hetzner Configuration
// =============================================================================

/**
 * Hetzner server type for VPS provisioning.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(HetznerServerTypeSchema, 'cx32');
 * ```
 */
export const HetznerServerTypeSchema = v.pipe(
  v.string(),
  v.minLength(2),
  v.regex(/^[a-z]+[0-9]+$/, 'Must be a valid Hetzner server type (e.g., cx32, cpx31)'),
);

/** Inferred output type of {@link HetznerServerTypeSchema}. */
export type HetznerServerType = v.InferOutput<typeof HetznerServerTypeSchema>;

/**
 * Hetzner datacenter location.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(HetznerLocationSchema, 'fsn1');
 * ```
 */
export const HetznerLocationSchema = v.picklist(['fsn1', 'nbg1', 'hel1', 'ash', 'hil']);

/** Inferred output type of {@link HetznerLocationSchema}. */
export type HetznerLocation = v.InferOutput<typeof HetznerLocationSchema>;

// =============================================================================
// Workspace Architecture & IDE
// =============================================================================

/**
 * Workspace CPU architecture for Coder workspace pods.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(WorkspaceArchSchema, 'amd64');
 * ```
 */
export const WorkspaceArchSchema = v.picklist(['amd64', 'arm64']);

/** Inferred output type of {@link WorkspaceArchSchema}. */
export type WorkspaceArch = v.InferOutput<typeof WorkspaceArchSchema>;

/**
 * IDE choice for Coder workspace.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(CoderIdeSchema, 'vscode-web');
 * ```
 */
export const CoderIdeSchema = v.picklist(['vscode-web', 'code-server', 'jetbrains']);

/** Inferred output type of {@link CoderIdeSchema}. */
export type CoderIde = v.InferOutput<typeof CoderIdeSchema>;

/**
 * Valibot schema for Coder remote development configuration.
 * Controls the generation of `.coder/` files by the sync tool.
 *
 * When `enabled` is `true` (default), `pnpm tool sync` generates:
 * - `.coder/main.tf` — Terraform template for Kubernetes-based Coder workspaces
 * - `.coder/README.md` — Quick-start usage guide
 * - `.coder/SETUP.md` — Full VPS provisioning + Coder installation guide
 *
 * The Coder template references `.devcontainer/Dockerfile` from Deliverable A,
 * ensuring the remote workspace and local dev container use identical environments.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(CoderSchema, {
 *   enabled: true,
 *   accessUrl: 'https://coder.example.com',
 *   resources: { cpu: 4, memoryGb: 8, diskGb: 50 },
 * });
 * ```
 */
export const CoderSchema = v.strictObject({
  /** Enable Coder configuration file generation (default: true) */
  enabled: v.optional(v.boolean(), true),
  /** Coder deployment access URL (e.g., https://coder.example.com) */
  accessUrl: v.optional(v.string(), ''),
  /** Git repo URL for workspace cloning (falls back to repo.urls.repo if empty) */
  repoUrl: v.optional(v.string(), ''),
  /** Default workspace resource limits (developers can override per-workspace) */
  resources: v.optional(CoderResourcesSchema, {}),
  /** Container registry for workspace images (required for remote deploy). */
  registry: v.optional(ContainerRegistrySchema, {}),
  /** Hetzner server type for VPS (default: cx32). */
  serverType: v.optional(HetznerServerTypeSchema, 'cx32'),
  /** Hetzner datacenter location (default: fsn1). */
  location: v.optional(HetznerLocationSchema, 'fsn1'),
  /** CPU architecture for workspace pods (default: amd64). */
  arch: v.optional(WorkspaceArchSchema, 'amd64'),
  /** IDE for Coder workspace (default: vscode-web). */
  ide: v.optional(CoderIdeSchema, 'vscode-web'),
  /** Git URL for user dotfiles repo (cloned into workspace on startup). */
  dotfilesRepo: v.optional(v.string(), ''),
});

/** Inferred output type of {@link CoderSchema}. */
export type Coder = v.InferOutput<typeof CoderSchema>;

// =============================================================================
// CI (act)
// =============================================================================

/**
 * Runner image size for act.
 * Controls which Docker images `.actrc` maps GitHub runner labels to.
 *
 * - `micro`: Node-only (~200MB) — `node:20-bookworm-slim`. Fastest pulls, limited tool availability.
 * - `medium`: Standard tools (~500MB) — `ghcr.io/catthehacker/ubuntu:act-*`. Good balance. (default)
 * - `large`: Full GitHub runner parity (~17GB) — `ghcr.io/catthehacker/ubuntu:full-*`. Slow first pull, complete toolset.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(ActRunnerSizeSchema, 'medium');
 * ```
 */
export const ActRunnerSizeSchema = v.picklist(['micro', 'medium', 'large']);

/** Inferred output type of {@link ActRunnerSizeSchema}. One of `'micro'`, `'medium'`, or `'large'`. */
export type ActRunnerSize = v.InferOutput<typeof ActRunnerSizeSchema>;

/**
 * Valibot schema for local CI configuration.
 * Controls generation of `.actrc` by the sync tool and behavior of `pnpm tool ci`.
 *
 * When `enabled` is `true` (default), `pnpm tool sync` generates `.actrc`
 * with runner image mappings based on `runnerSize`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(CiSchema, {
 *   enabled: true,
 *   runnerSize: 'medium',
 * });
 * ```
 */
export const CiSchema = v.strictObject({
  /** Enable .actrc file generation (default: true). */
  enabled: v.optional(v.boolean(), true),
  /** Runner image size: micro, medium, or large (default: medium). */
  runnerSize: v.optional(ActRunnerSizeSchema, 'medium'),
});

/** Inferred output type of {@link CiSchema}. */
export type Ci = v.InferOutput<typeof CiSchema>;

// =============================================================================
// Infisical
// =============================================================================

/**
 * Valibot schema for Infisical authentication method.
 *
 * - `token`: Uses INFISICAL_TOKEN env var (CI, non-interactive).
 * - `machine-identity`: Uses client ID + secret (service accounts).
 * - `interactive`: Uses `infisical login` (default, developer workflow).
 */
export const InfisicalAuthMethodSchema = v.picklist(['token', 'machine-identity', 'interactive']);

/** Inferred output type of {@link InfisicalAuthMethodSchema}. */
export type InfisicalAuthMethod = v.InferOutput<typeof InfisicalAuthMethodSchema>;

/** Valibot schema for Infisical authentication configuration. */
export const InfisicalAuthSchema = v.strictObject({
  /** Authentication method (default: 'interactive'). */
  method: v.optional(InfisicalAuthMethodSchema, 'interactive'),
  /** Cache TTL in seconds for fetched secrets (default: 300 = 5 min). */
  cacheTtlSeconds: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(86400)),
    300,
  ),
});

/** Inferred output type of {@link InfisicalAuthSchema}. */
export type InfisicalAuth = v.InferOutput<typeof InfisicalAuthSchema>;

/** Valibot schema for Infisical Docker Compose configuration. */
export const InfisicalDockerSchema = v.strictObject({
  /** Docker Compose file path (default: 'docker-compose.infisical.yml'). */
  composeFile: v.optional(v.pipe(v.string(), v.minLength(1)), 'docker-compose.infisical.yml'),
  /** Docker Compose service name (default: 'infisical'). */
  service: v.optional(v.pipe(v.string(), v.minLength(1)), 'infisical'),
});

/** Inferred output type of {@link InfisicalDockerSchema}. */
export type InfisicalDocker = v.InferOutput<typeof InfisicalDockerSchema>;

/** Valibot schema for Infisical environment mapping. */
export const InfisicalEnvironmentsSchema = v.strictObject({
  /** Default environment when no --env flag is passed (default: 'development'). */
  default: v.optional(StandardEnvironmentSchema, 'development'),
  /** Git branch → environment mapping for auto-detection. */
  branchMapping: v.optional(
    v.strictObject({
      main: v.optional(StandardEnvironmentSchema, 'production'),
      staging: v.optional(StandardEnvironmentSchema, 'staging'),
    }),
    {},
  ),
});

/** Inferred output type of {@link InfisicalEnvironmentsSchema}. */
export type InfisicalEnvironments = v.InferOutput<typeof InfisicalEnvironmentsSchema>;

/** Valibot schema for a machine identity to create during provisioning. */
export const InfisicalMachineIdentitySchema = v.strictObject({
  /**
   * Identity name. Supports `${provider}` placeholder (replaced with git provider name).
   * @example 'coder-vps' or '${provider}-ci'
   */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Infisical role (default: 'member'). */
  role: v.optional(v.pipe(v.string(), v.minLength(1)), 'member'),
});

/** Inferred output type of {@link InfisicalMachineIdentitySchema}. */
export type InfisicalMachineIdentity = v.InferOutput<typeof InfisicalMachineIdentitySchema>;

/** Valibot schema for Infisical provisioning configuration. */
export const InfisicalProvisionSchema = v.strictObject({
  /**
   * Infisical folder paths to create in the global project.
   * `/${provider}` is always appended automatically from gitProvider config.
   * Default: ['/cloudflare', '/turbo', '/devenv']
   */
  globalFolders: v.optional(v.array(v.pipe(v.string(), v.startsWith('/'))), [
    '/cloudflare',
    '/turbo',
    '/devenv',
  ]),
  /**
   * Infisical folder paths to create in each product project.
   * Default: ['/api', '/app', '/marketing', '/status']
   */
  productFolders: v.optional(v.array(v.pipe(v.string(), v.startsWith('/'))), [
    '/api',
    '/app',
    '/marketing',
    '/status',
  ]),
  /**
   * Expected secret keys per folder path (for setup prompting).
   * Maps folder path → array of secret key names.
   * Provider-specific keys (e.g. GITHUB_PAT) are auto-derived from gitProvider
   * and do NOT need to be listed here.
   *
   * @example
   * ```typescript
   * expectedSecrets: {
   *   '/cloudflare': ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
   *   '/turbo': ['TURBO_TOKEN', 'TURBO_TEAM'],
   *   '/api': ['D1_DATABASE_ID', 'KV_NAMESPACE_ID', 'API_SECRET_KEY'],
   * }
   * ```
   */
  expectedSecrets: v.optional(v.record(v.string(), v.array(v.pipe(v.string(), v.minLength(1)))), {
    '/cloudflare': ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    '/turbo': ['TURBO_TOKEN', 'TURBO_TEAM'],
    '/devenv': ['HETZNER_TOKEN'],
    '/api': ['D1_DATABASE_ID', 'KV_NAMESPACE_ID', 'API_SECRET_KEY'],
    '/app': ['POSTHOG_API_KEY', 'LEMON_SQUEEZY_API_KEY', 'REVENUECAT_API_KEY'],
    '/marketing': ['RESEND_API_KEY', 'GA_MEASUREMENT_ID'],
    '/status': ['STATUS_PAGE_TOKEN'],
  }),
  /**
   * Machine identities to create during provisioning.
   * Default: [{ name: 'coder-vps' }, { name: '${provider}-ci' }]
   */
  machineIdentities: v.optional(v.array(InfisicalMachineIdentitySchema), [
    { name: 'coder-vps', role: 'member' },
    { name: '${provider}-ci', role: 'member' },
  ]),
});

/** Inferred output type of {@link InfisicalProvisionSchema}. */
export type InfisicalProvision = v.InferOutput<typeof InfisicalProvisionSchema>;

/**
 * Valibot schema for self-hosted Infisical configuration.
 * Controls the Infisical server URL, Docker image version,
 * authentication, environment mapping, and provisioning structure.
 *
 * All fields have defaults — existing configs remain valid.
 * Provisioning fields drive `secrets-setup` auto-provisioning,
 * enabling full setup from config alone.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(InfisicalSchema, {
 *   siteUrl: 'https://secrets.example.com',
 *   serverVersion: '0.151.0',
 *   auth: { method: 'interactive', cacheTtlSeconds: 300 },
 *   provision: {
 *     globalFolders: ['/cloudflare', '/turbo'],
 *     productFolders: ['/api', '/app'],
 *     machineIdentities: [{ name: 'deploy-bot' }],
 *   },
 * });
 * ```
 */
export const InfisicalSchema = v.strictObject({
  /** Self-hosted Infisical server URL (default: 'http://localhost:8080'). */
  siteUrl: v.optional(v.pipe(v.string(), v.url()), 'http://localhost:8080'),
  /** Infisical server Docker image version (default: '0.151.0'). */
  serverVersion: v.optional(PinnedVersionSchema, '0.151.0'),
  /** Infisical "global" project slug (default: 'global'). */
  globalProjectSlug: v.optional(v.pipe(v.string(), v.minLength(1)), 'global'),
  /** Authentication configuration. */
  auth: v.optional(InfisicalAuthSchema, {}),
  /** Docker Compose configuration (bootstrap mode). */
  docker: v.optional(InfisicalDockerSchema, {}),
  /** Environment mapping. */
  environments: v.optional(InfisicalEnvironmentsSchema, {}),
  /** Provisioning structure for `secrets-setup` auto-provisioning. */
  provision: v.optional(InfisicalProvisionSchema, {}),
});

/** Inferred output type of {@link InfisicalSchema}. */
export type Infisical = v.InferOutput<typeof InfisicalSchema>;

// =============================================================================
// Git Provider
// =============================================================================

/** Supported git hosting providers. */
export const GitProviderTypeSchema = v.picklist(['github', 'gitlab']);

/** Inferred output type of {@link GitProviderTypeSchema}. */
export type GitProviderType = v.InferOutput<typeof GitProviderTypeSchema>;

/** Default git provider. */
export const DEFAULT_GIT_PROVIDER: GitProviderType = 'github';

/**
 * Valibot schema for git provider configuration.
 * Determines provider-specific URLs, registry, CLI features, and template conditionals.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(GitProviderSchema, { provider: 'gitlab' });
 * ```
 */
export const GitProviderSchema = v.strictObject({
  /** Git hosting provider (default: `'github'`). */
  provider: v.optional(GitProviderTypeSchema, DEFAULT_GIT_PROVIDER),
});

/** Inferred output type of {@link GitProviderSchema}. */
export type GitProvider = v.InferOutput<typeof GitProviderSchema>;

// =============================================================================
// Tooling Config (composed)
// =============================================================================

/**
 * Valibot schema for the top-level `tooling` section of the root config.
 * Combines dev proxy, formatting, paths, onboarding, package manager,
 * dev container, Coder, and CI settings.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(ToolingSchema, {
 *   devProxy: { port: 3000 },
 *   formatting: { useTabs: true, printWidth: 100 },
 *   packageManager: { manager: 'pnpm' },
 *   devContainer: { enabled: true },
 *   coder: { enabled: true },
 *   ci: { enabled: true, runnerSize: 'medium' },
 *   gitProvider: { provider: 'github' },
 * });
 * ```
 */
export const ToolingSchema = v.strictObject({
  /** Dev proxy configuration */
  devProxy: v.optional(DevProxySchema, {}),
  /** Formatting configuration */
  formatting: v.optional(FormattingSchema, {}),
  /** Path configuration */
  paths: v.optional(PathsSchema, {}),
  /** Onboarding configuration */
  onboarding: v.optional(OnboardingSchema, {}),
  /** Package manager configuration */
  packageManager: v.optional(PackageManagerSchema, {}),
  /** Dev Container configuration for local containerized development */
  devContainer: v.optional(DevContainerSchema, {}),
  /** Coder remote development configuration */
  coder: v.optional(CoderSchema, {}),
  /** Local CI configuration (act — GitHub Actions local runner) */
  ci: v.optional(CiSchema, {}),
  /** Self-hosted Infisical secrets management configuration */
  infisical: v.optional(InfisicalSchema, {}),
  /** Git hosting provider configuration */
  gitProvider: v.optional(GitProviderSchema, {}),
});

/** Inferred output type of {@link ToolingSchema}. */
export type Tooling = v.InferOutput<typeof ToolingSchema>;
