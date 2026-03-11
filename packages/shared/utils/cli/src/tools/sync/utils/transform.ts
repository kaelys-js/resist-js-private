/**
 * Sync Transform
 *
 * Transforms the nested CoreConfig into a flattened context
 * suitable for Handlebars templates.
 *
 * @module
 */

import * as v from 'valibot';

import type { Bool, Str, StrArray } from '@/schemas/common';
import type { CoreConfig } from '@/schemas/core-config/config';
import type { GitProviderType, PackageManagerType } from '@/schemas/core-config/tooling';
import { okUnchecked, type Result } from '@/schemas/result/result';
import type { DeepReadonly } from '@/utils/core/object';

// =============================================================================
// Schemas
// =============================================================================

/** Schema for indent style values used in format configuration. */
const IndentStyleSchema = v.picklist(['tab', 'space']);

/** Schema for parsed repository owner and name. */
const RepoInfoSchema = v.strictObject({
  /** Repository owner/org name. */
  owner: v.string(),
  /** Repository name. */
  name: v.string(),
});

/** Parsed repository owner and name. */
type RepoInfo = v.InferOutput<typeof RepoInfoSchema>;

/** Schema for package manager command configuration. */
const PmCommandsSchema = v.strictObject({
  /** Run command (e.g., 'pnpm', 'npm run'). */
  run: v.string(),
  /** Exec command (e.g., 'pnpm', 'npx'). */
  exec: v.string(),
  /** DLX command (e.g., 'pnpm dlx', 'npx'). */
  dlx: v.string(),
  /** Install command (e.g., 'pnpm install'). */
  install: v.string(),
  /** Frozen install command (e.g., 'pnpm install --frozen-lockfile'). */
  installFrozen: v.string(),
  /** Add dependency command (e.g., 'pnpm add'). */
  add: v.string(),
  /** Add dev dependency command (e.g., 'pnpm add -D'). */
  addDev: v.string(),
  /** Remove dependency command (e.g., 'pnpm remove'). */
  remove: v.string(),
  /** Filter/workspace command (e.g., 'pnpm --filter'). */
  filter: v.string(),
  /** Lockfile name (e.g., 'pnpm-lock.yaml'). */
  lockfile: v.string(),
  /** Workspace file name or null if not applicable. */
  workspaceFile: v.nullable(v.string()),
  /** Add root workspace dev dependency command (e.g., 'pnpm add -D -w'). */
  addDevRoot: v.string(),
});

/** Package manager command configuration. */
type PmCommands = v.InferOutput<typeof PmCommandsSchema>;

/**
 * Schema for the template context.
 * Contains all variables available in Handlebars templates.
 *
 * Uses `looseObject` because index.ts dynamically adds `_outputPath`
 * for helpers like `schemaPath` that need the output file location.
 */
export const TemplateContextSchema = v.looseObject({
  // -------------------------------------------------------------------------
  // Business Configuration (dot-notation for template access)
  // -------------------------------------------------------------------------

  /** Company name. */
  'business.company': v.string(),
  /** Company domain. */
  'business.domain': v.string(),
  /** Support email. */
  'business.supportEmail': v.string(),
  /** License type (e.g., "MIT"). */
  'business.license': v.string(),
  /** NPM author email. */
  'business.emails.npm': v.string(),
  /** Support email (from emails object). */
  'business.emails.support': v.string(),
  /** Security email. */
  'business.emails.security': v.string(),
  /** Marketing domain. */
  'business.domains.marketing': v.string(),
  /** Docs domain. */
  'business.domains.docs': v.string(),
  /** Status domain. */
  'business.domains.status': v.string(),

  // -------------------------------------------------------------------------
  // Repository Configuration
  // -------------------------------------------------------------------------

  /** Repository description. */
  'repo.description': v.string(),
  /** Repository URL. */
  'repo.urls.repo': v.string(),
  /** Bugs/Issues URL. */
  'repo.urls.bugs': v.string(),
  /** Funding URL. */
  'repo.urls.funding': v.string(),
  /** Repository keywords. */
  'repo.keywords': v.array(v.string()),
  /** GitHub owner/org (parsed from repo URL). */
  'repo.owner': v.string(),
  /** GitHub repo name (parsed from repo URL). */
  'repo.name': v.string(),

  // -------------------------------------------------------------------------
  // Version Configuration
  // -------------------------------------------------------------------------

  /** Node.js version. */
  'versions.node': v.string(),
  /** Package manager version. */
  'versions.packageManager': v.string(),
  /** Node tool versions record (package name → exact version). */
  'versions.nodeTools': v.record(v.string(), v.string()),
  /** System tool versions record (binary name → exact version). */
  'versions.systemTools': v.record(v.string(), v.string()),

  // -------------------------------------------------------------------------
  // Package Manager Configuration
  // -------------------------------------------------------------------------

  /** Package manager name ('pnpm', 'npm', 'yarn', 'bun'). */
  'pm.name': v.string(),
  /** Package manager version. */
  'pm.version': v.string(),
  /** Run command (e.g., 'pnpm', 'npm run', 'yarn', 'bun'). */
  'pm.run': v.string(),
  /** Exec command (e.g., 'pnpm', 'npx', 'yarn', 'bunx'). */
  'pm.exec': v.string(),
  /** DLX command (e.g., 'pnpm dlx', 'npx', 'yarn dlx', 'bunx'). */
  'pm.dlx': v.string(),
  /** Install command (e.g., 'pnpm install', 'npm install'). */
  'pm.install': v.string(),
  /** Install frozen command (e.g., 'pnpm install --frozen-lockfile', 'npm ci'). */
  'pm.installFrozen': v.string(),
  /** Add dependency command (e.g., 'pnpm add', 'npm install', 'yarn add', 'bun add'). */
  'pm.add': v.string(),
  /** Add dev dependency command (e.g., 'pnpm add -D', 'npm install -D'). */
  'pm.addDev': v.string(),
  /** Remove dependency command (e.g., 'pnpm remove', 'npm uninstall'). */
  'pm.remove': v.string(),
  /** Filter/workspace command (e.g., 'pnpm --filter', 'npm --workspace'). */
  'pm.filter': v.string(),
  /** Lockfile name (e.g., 'pnpm-lock.yaml', 'package-lock.json'). */
  'pm.lockfile': v.string(),
  /** Workspace file name (e.g., 'pnpm-workspace.yaml') or null. */
  'pm.workspaceFile': v.nullable(v.string()),
  /** Root workspace dev dep install command. */
  'pm.addDevRoot': v.string(),
  /** True if package manager is pnpm. */
  'pm.isPnpm': v.boolean(),
  /** True if package manager is npm. */
  'pm.isNpm': v.boolean(),
  /** True if package manager is yarn. */
  'pm.isYarn': v.boolean(),
  /** True if package manager is bun. */
  'pm.isBun': v.boolean(),

  // -------------------------------------------------------------------------
  // Format Configuration
  // -------------------------------------------------------------------------

  /** Global indent style (tab or space). */
  'format.global.indent_style': IndentStyleSchema,
  /** Global indent size. */
  'format.global.indent_size': v.number(),
  /** Global tab width (for display). */
  'format.global.tab_width': v.number(),
  /** Global line length limit. */
  'format.global.line_length': v.number(),
  /** Alternate indent style (for Go, Makefile, etc.). */
  'format.alternate.indent_style': IndentStyleSchema,
  /** Alternate indent size (for Python, Rust, etc.). */
  'format.alternate.indent_size': v.number(),

  // -------------------------------------------------------------------------
  // Git Configuration
  // -------------------------------------------------------------------------

  /** Default branch name. */
  'git.branch': v.string(),
  /** NPM publish branch. */
  'git.npm_publish_branch': v.string(),
  /** Git hosting provider ('github' or 'gitlab'). */
  'git.provider': v.string(),
  /** True if provider is GitHub. */
  'git.isGitHub': v.boolean(),
  /** True if provider is GitLab. */
  'git.isGitLab': v.boolean(),
  /** Provider base URL (e.g., 'https://github.com'). */
  'git.providerUrl': v.string(),
  /** Raw content URL with owner/repo/branch (for direct file access). */
  'git.rawContentUrl': v.string(),
  /** Container/package registry URL (e.g., 'ghcr.io/owner/repo'). */
  'git.registry': v.string(),
  /** OIDC issuer URL for CI authentication. */
  'git.oidcIssuerUrl': v.string(),
  /** Dev container feature for provider CLI. */
  'git.cliFeature': v.string(),
  /** Human-readable OAuth label (e.g., 'GitHub OAuth'). */
  'git.oauthLabel': v.string(),
  /** OAuth setup instructions for Coder. */
  'git.oauthSetupInstructions': v.string(),
  /** CI configuration directory (e.g., '.github'). */
  'git.ciConfigDir': v.string(),
  /** Workflow directory (e.g., '.github/workflows'). */
  'git.workflowDir': v.string(),

  // -------------------------------------------------------------------------
  // Tooling Configuration
  // -------------------------------------------------------------------------

  /** Dev proxy base port. */
  'tooling.devProxy.port': v.number(),
  /** Dev proxy HTTPS enabled. */
  'tooling.devProxy.https': v.boolean(),
  /** Local TLD suffix. */
  'tooling.devProxy.localTld': v.string(),
  /** Port increment between products. */
  'tooling.devProxy.portIncrement': v.number(),
  /** Admin dashboard port. */
  'tooling.devProxy.adminPort': v.number(),
  /** QA dashboard port. */
  'tooling.devProxy.qaPort': v.number(),
  /** Docs server port. */
  'tooling.devProxy.docsPort': v.number(),

  /** Formatting: use tabs. */
  'tooling.formatting.useTabs': v.boolean(),
  /** Formatting: tab width. */
  'tooling.formatting.tabWidth': v.number(),
  /** Formatting: print width. */
  'tooling.formatting.printWidth': v.number(),
  /** Formatting: single quotes. */
  'tooling.formatting.singleQuote': v.boolean(),
  /** Formatting: semicolons. */
  'tooling.formatting.semi': v.boolean(),

  /** Products directory. */
  'tooling.paths.productsDir': v.string(),
  /** Product template directory. */
  'tooling.paths.productTemplateDir': v.string(),
  /** Config filename. */
  'tooling.paths.configFilename': v.string(),
  /** Marker directory for CLI state. */
  'tooling.paths.markerDir': v.string(),

  // -------------------------------------------------------------------------
  // Paths (shorthand for template convenience)
  // -------------------------------------------------------------------------

  /** Products directory (shorthand). */
  'paths.productsDir': v.string(),
  /** Product template directory (shorthand). */
  'paths.productTemplateDir': v.string(),
  /** Config filename (shorthand). */
  'paths.configFilename': v.string(),
  /** Marker directory (shorthand). */
  'paths.markerDir': v.string(),

  // -------------------------------------------------------------------------
  // Dev Container Configuration
  // -------------------------------------------------------------------------

  /** Whether devcontainer generation is enabled. */
  'tooling.devContainer.enabled': v.boolean(),
  /** Base Docker image for the dev container. */
  'tooling.devContainer.baseImage': v.string(),
  /** Additional apt packages. */
  'tooling.devContainer.aptPackages': v.array(v.string()),
  /** Additional port forwards. */
  'tooling.devContainer.additionalPorts': v.array(v.number()),

  // -------------------------------------------------------------------------
  // Coder Configuration
  // -------------------------------------------------------------------------

  /** Whether Coder config generation is enabled. */
  'tooling.coder.enabled': v.boolean(),
  /** Coder deployment access URL. */
  'tooling.coder.accessUrl': v.string(),
  /** Git repo URL for workspace cloning. */
  'tooling.coder.repoUrl': v.string(),
  /** Default CPU cores per workspace. */
  'tooling.coder.resources.cpu': v.number(),
  /** Default memory in GB per workspace. */
  'tooling.coder.resources.memoryGb': v.number(),
  /** Default disk in GB per workspace. */
  'tooling.coder.resources.diskGb': v.number(),

  // -------------------------------------------------------------------------
  // CI Configuration
  // -------------------------------------------------------------------------

  /** Whether .actrc generation is enabled. */
  'tooling.ci.enabled': v.boolean(),
  /** Runner image size (micro, medium, large). */
  'tooling.ci.runnerSize': v.string(),

  // -------------------------------------------------------------------------
  // Infisical Configuration
  // -------------------------------------------------------------------------

  /** Self-hosted Infisical server URL. */
  'tooling.infisical.siteUrl': v.string(),
  /** Infisical server Docker image version. */
  'tooling.infisical.serverVersion': v.string(),

  // -------------------------------------------------------------------------
  // Computed: All Dev Proxy Ports
  // -------------------------------------------------------------------------

  /**
   * All ports that should be forwarded in the dev container / Coder workspace.
   * Computed from: admin/qa/docs ports + per-product service ports + additionalPorts.
   */
  'tooling.devProxy.allPorts': v.array(v.number()),

  // -------------------------------------------------------------------------
  // Raw Config & Collections (for complex helpers)
  // -------------------------------------------------------------------------

  /** Full config object for complex operations. */
  config: v.custom<CoreConfig>((val: unknown): Bool => val !== null && typeof val === 'object'),
  /** Products array. */
  products: v.custom<CoreConfig['products']>((val: unknown): Bool => Array.isArray(val)),
  /** Locales array. */
  locales: v.array(v.string()),
  /** Default locale. */
  defaultLocale: v.string(),
});

/** Template context containing all variables available in Handlebars templates. */
export type TemplateContext = v.InferOutput<typeof TemplateContextSchema>;

// =============================================================================
// Package Manager Command Mapping
// =============================================================================

/**
 * Command mapping for each package manager.
 */
const PM_COMMANDS: Record<PackageManagerType, PmCommands> = {
  pnpm: {
    run: 'pnpm',
    exec: 'pnpm',
    dlx: 'pnpm dlx',
    install: 'pnpm install',
    installFrozen: 'pnpm install --frozen-lockfile',
    add: 'pnpm add',
    addDev: 'pnpm add -D',
    remove: 'pnpm remove',
    filter: 'pnpm --filter',
    lockfile: 'pnpm-lock.yaml',
    workspaceFile: 'pnpm-workspace.yaml',
    addDevRoot: 'pnpm add -D -w',
  },
  npm: {
    run: 'npm run',
    exec: 'npx',
    dlx: 'npx',
    install: 'npm install',
    installFrozen: 'npm ci',
    add: 'npm install',
    addDev: 'npm install -D',
    remove: 'npm uninstall',
    filter: 'npm --workspace',
    lockfile: 'package-lock.json',
    workspaceFile: null,
    addDevRoot: 'npm install -D',
  },
  yarn: {
    run: 'yarn',
    exec: 'yarn',
    dlx: 'yarn dlx',
    install: 'yarn install',
    installFrozen: 'yarn install --frozen-lockfile',
    add: 'yarn add',
    addDev: 'yarn add -D',
    remove: 'yarn remove',
    filter: 'yarn workspace',
    lockfile: 'yarn.lock',
    workspaceFile: null,
    addDevRoot: 'yarn add -D -W',
  },
  bun: {
    run: 'bun',
    exec: 'bunx',
    dlx: 'bunx',
    install: 'bun install',
    installFrozen: 'bun install --frozen-lockfile',
    add: 'bun add',
    addDev: 'bun add -d',
    remove: 'bun remove',
    filter: 'bun --filter',
    lockfile: 'bun.lockb',
    workspaceFile: null,
    addDevRoot: 'bun add -d',
  },
};

/**
 * Get package manager commands for a given package manager type.
 *
 * @param manager - The package manager type to look up.
 * @returns `Result<PmCommands>` — command configuration for the given package manager.
 */
export function getPmCommands(manager: PackageManagerType): Result<PmCommands> {
  const commands: PmCommands = PM_COMMANDS[manager];
  return okUnchecked<PmCommands>(commands);
}

// =============================================================================
// Git Provider Config Mapping
// =============================================================================

/** Schema for git provider-specific configuration values. */
const GitProviderConfigSchema = v.strictObject({
  /** Provider base URL (e.g., 'https://github.com'). */
  providerUrl: v.string(),
  /** Raw content URL prefix (e.g., 'https://raw.githubusercontent.com'). */
  rawContentUrlPrefix: v.string(),
  /** URL pattern with {owner}, {repo}, {branch} placeholders. */
  rawContentUrlPattern: v.string(),
  /** Container/package registry domain (e.g., 'ghcr.io'). */
  registry: v.string(),
  /** OIDC issuer URL for CI identity tokens. */
  oidcIssuerUrl: v.string(),
  /** Dev container feature for provider CLI (e.g., github-cli feature). */
  cliFeature: v.string(),
  /** Human-readable OAuth label (e.g., 'GitHub OAuth'). */
  oauthLabel: v.string(),
  /** OAuth setup instructions for Coder configuration. */
  oauthSetupInstructions: v.string(),
  /** CI configuration directory (e.g., '.github'). */
  ciConfigDir: v.string(),
  /** Workflow directory (e.g., '.github/workflows'). Empty if no equivalent. */
  workflowDir: v.string(),
});

/** Git provider-specific configuration values. */
type GitProviderConfig = v.InferOutput<typeof GitProviderConfigSchema>;

/** Per-provider configuration mapping. */
const GIT_PROVIDER_CONFIG: Record<GitProviderType, GitProviderConfig> = {
  github: {
    providerUrl: 'https://github.com',
    rawContentUrlPrefix: 'https://raw.githubusercontent.com',
    rawContentUrlPattern: '{owner}/{repo}/{branch}',
    registry: 'ghcr.io',
    oidcIssuerUrl: 'https://github.com',
    cliFeature: 'ghcr.io/devcontainers/features/github-cli:1',
    oauthLabel: 'GitHub OAuth',
    oauthSetupInstructions: 'Go to GitHub → Settings → Developer settings → OAuth Apps → New',
    ciConfigDir: '.github',
    workflowDir: '.github/workflows',
  },
  gitlab: {
    providerUrl: 'https://gitlab.com',
    rawContentUrlPrefix: 'https://gitlab.com',
    rawContentUrlPattern: '{owner}/{repo}/-/raw/{branch}',
    registry: 'registry.gitlab.com',
    oidcIssuerUrl: 'https://gitlab.com',
    cliFeature: 'ghcr.io/devcontainers-contrib/features/gitlab-cli:1',
    oauthLabel: 'GitLab OAuth',
    oauthSetupInstructions: 'Go to GitLab → Settings → Applications → New application',
    ciConfigDir: '.gitlab',
    workflowDir: '',
  },
};

/**
 * Get git provider config for a given provider type.
 *
 * @param provider - The git provider type.
 * @returns `Result<GitProviderConfig>` — config for the provider.
 */
export function getGitProviderConfig(provider: GitProviderType): Result<GitProviderConfig> {
  const config: GitProviderConfig = GIT_PROVIDER_CONFIG[provider];
  return okUnchecked<GitProviderConfig>(config);
}

// =============================================================================
// URL Parsing
// =============================================================================

/**
 * Parse owner and repo name from a repository URL.
 * Supports https://github.com/owner/repo, https://gitlab.com/owner/repo.git, etc.
 *
 * @param url - The repository URL to parse.
 * @returns `Result<RepoInfo>` — parsed owner and name (empty strings if URL is missing or invalid).
 */
function parseRepoUrl(url?: Str): Result<RepoInfo> {
  if (!url) return okUnchecked<RepoInfo>({ owner: '', name: '' });
  try {
    const parsed: URL = new URL(url);
    const segments: StrArray = parsed.pathname.split('/').filter(Boolean);
    return okUnchecked<RepoInfo>({
      owner: segments[0] ?? '',
      name: (segments[1] ?? '').replace(/\.git$/, ''),
    });
  } catch {
    return okUnchecked<RepoInfo>({ owner: '', name: '' });
  }
}

// =============================================================================
// Template Context
// =============================================================================

/**
 * Transform CoreConfig into a flattened template context.
 *
 * This function flattens nested config into dot-notation keys that
 * Handlebars templates can access easily, while also providing
 * sensible defaults for optional values.
 *
 * @param config - The loaded and validated CoreConfig.
 * @returns `Result<TemplateContext>` — flattened template context for Handlebars rendering.
 */
export function transformConfigForTemplates(
  config: DeepReadonly<CoreConfig>,
): Result<TemplateContext> {
  // Extract with defaults
  const company: CoreConfig['company'] = config.company;
  const repo: CoreConfig['repo'] = config.repo;
  const versions: CoreConfig['versions'] = config.versions;
  const format: CoreConfig['format'] = config.format;
  const git: CoreConfig['git'] = config.git;
  const tooling: CoreConfig['tooling'] = config.tooling;
  const devProxy: CoreConfig['tooling']['devProxy'] = tooling.devProxy;
  const formatting: CoreConfig['tooling']['formatting'] = tooling.formatting;
  const paths: CoreConfig['tooling']['paths'] = tooling.paths;
  const packageManager: CoreConfig['tooling']['packageManager'] = tooling.packageManager;
  const devContainer: CoreConfig['tooling']['devContainer'] = tooling.devContainer;
  const coder: CoreConfig['tooling']['coder'] = tooling.coder;
  const ci: CoreConfig['tooling']['ci'] = tooling.ci;
  const infisical: CoreConfig['tooling']['infisical'] = tooling.infisical;
  const gitProvider: CoreConfig['tooling']['gitProvider'] = tooling.gitProvider;

  // Compute all forwarded ports:
  // 1. Tool ports (admin, qa, docs)
  // 2. Per-product service ports (base + offset for each service type)
  // 3. User-specified additional ports
  const serviceOffsets: CoreConfig['tooling']['devProxy']['serviceOffsets'] =
    devProxy.serviceOffsets;
  const allPortsSet: Set<number> = new Set<number>([
    devProxy.adminPort,
    devProxy.qaPort,
    devProxy.docsPort,
  ]);
  for (let i: number = 0; i < config.products.length; i++) {
    const basePort: number = devProxy.port + i * devProxy.portIncrement;
    for (const offset of Object.values(serviceOffsets)) {
      allPortsSet.add(basePort + offset);
    }
  }
  for (const port of devContainer.additionalPorts) {
    allPortsSet.add(port);
  }
  const allPorts: number[] = [...allPortsSet].sort((a: number, b: number) => a - b);

  // Get package manager info
  const pmName: PackageManagerType = packageManager.manager;
  const pmVersion: Str = versions.packageManager;
  const pmCommandsResult: Result<PmCommands> = getPmCommands(pmName);
  if (!pmCommandsResult.ok) return pmCommandsResult;
  const pmCommands: PmCommands = pmCommandsResult.data;

  // Parse repo URL for owner/name extraction
  const repoUrlResult: Result<RepoInfo> = parseRepoUrl(repo.urls.repo);
  if (!repoUrlResult.ok) return repoUrlResult;
  const repoInfo: RepoInfo = repoUrlResult.data;

  // Get git provider config
  const providerName: GitProviderType = gitProvider.provider;
  const providerConfigResult: Result<GitProviderConfig> = getGitProviderConfig(providerName);
  if (!providerConfigResult.ok) return providerConfigResult;
  const providerConfig: GitProviderConfig = providerConfigResult.data;

  // Compute raw content URL with pattern substitution
  const rawContentUrl: string = `${providerConfig.rawContentUrlPrefix}/${providerConfig.rawContentUrlPattern
    .replace('{owner}', repoInfo.owner)
    .replace('{repo}', repoInfo.name)
    .replace('{branch}', git.branch)}`;

  // Compute registry URL with owner/repo
  const registryUrl: string = `${providerConfig.registry}/${repoInfo.owner}/${repoInfo.name}`;

  return okUnchecked<TemplateContext>({
    // Business
    'business.company': company.name,
    'business.domain': company.domain,
    'business.supportEmail': company.supportEmail,
    'business.license': company.license,
    'business.emails.npm': company.emails.npm ?? company.supportEmail,
    'business.emails.support': company.emails.support ?? company.supportEmail,
    'business.emails.security': company.emails.security,
    'business.domains.marketing': company.domains.marketing,
    'business.domains.docs': company.domains.docs,
    'business.domains.status': company.domains.status,

    // Repo
    'repo.description': repo.description,
    'repo.urls.repo': repo.urls.repo,
    'repo.urls.bugs': repo.urls.bugs,
    'repo.urls.funding': repo.urls.funding,
    'repo.keywords': repo.keywords,
    'repo.owner': repoInfo.owner,
    'repo.name': repoInfo.name,

    // Versions
    'versions.node': versions.node,
    'versions.packageManager': pmVersion,
    'versions.nodeTools': { ...versions.nodeTools },
    'versions.systemTools': { ...versions.systemTools },

    // Package Manager
    'pm.name': pmName,
    'pm.version': pmVersion,
    'pm.run': pmCommands.run,
    'pm.exec': pmCommands.exec,
    'pm.dlx': pmCommands.dlx,
    'pm.install': pmCommands.install,
    'pm.installFrozen': pmCommands.installFrozen,
    'pm.add': pmCommands.add,
    'pm.addDev': pmCommands.addDev,
    'pm.remove': pmCommands.remove,
    'pm.filter': pmCommands.filter,
    'pm.lockfile': pmCommands.lockfile,
    'pm.workspaceFile': pmCommands.workspaceFile,
    'pm.addDevRoot': pmCommands.addDevRoot,
    'pm.isPnpm': pmName === 'pnpm',
    'pm.isNpm': pmName === 'npm',
    'pm.isYarn': pmName === 'yarn',
    'pm.isBun': pmName === 'bun',

    // Format
    'format.global.indent_style': format.global.indent_style,
    'format.global.indent_size': format.global.indent_size,
    'format.global.tab_width': format.global.tab_width,
    'format.global.line_length': format.global.line_length,
    'format.alternate.indent_style': format.alternate.indent_style,
    'format.alternate.indent_size': format.alternate.indent_size,

    // Git
    'git.branch': git.branch,
    'git.npm_publish_branch': git.npm_publish_branch,

    // Git Provider
    'git.provider': providerName,
    'git.isGitHub': providerName === 'github',
    'git.isGitLab': providerName === 'gitlab',
    'git.providerUrl': providerConfig.providerUrl,
    'git.rawContentUrl': rawContentUrl,
    'git.registry': registryUrl,
    'git.oidcIssuerUrl': providerConfig.oidcIssuerUrl,
    'git.cliFeature': providerConfig.cliFeature,
    'git.oauthLabel': providerConfig.oauthLabel,
    'git.oauthSetupInstructions': providerConfig.oauthSetupInstructions,
    'git.ciConfigDir': providerConfig.ciConfigDir,
    'git.workflowDir': providerConfig.workflowDir,

    // Tooling - Dev Proxy
    'tooling.devProxy.port': devProxy.port,
    'tooling.devProxy.https': devProxy.https,
    'tooling.devProxy.localTld': devProxy.localTld,
    'tooling.devProxy.portIncrement': devProxy.portIncrement,
    'tooling.devProxy.adminPort': devProxy.adminPort,
    'tooling.devProxy.qaPort': devProxy.qaPort,
    'tooling.devProxy.docsPort': devProxy.docsPort,

    // Tooling - Formatting
    'tooling.formatting.useTabs': formatting.useTabs,
    'tooling.formatting.tabWidth': formatting.tabWidth,
    'tooling.formatting.printWidth': formatting.printWidth,
    'tooling.formatting.singleQuote': formatting.singleQuote,
    'tooling.formatting.semi': formatting.semi,

    // Tooling - Paths
    'tooling.paths.productsDir': paths.productsDir,
    'tooling.paths.productTemplateDir': paths.productTemplateDir,
    'tooling.paths.configFilename': paths.configFilename,
    'tooling.paths.markerDir': paths.markerDir,

    // Paths (shorthand)
    'paths.productsDir': paths.productsDir,
    'paths.productTemplateDir': paths.productTemplateDir,
    'paths.configFilename': paths.configFilename,
    'paths.markerDir': paths.markerDir,

    // Dev Container
    'tooling.devContainer.enabled': devContainer.enabled,
    'tooling.devContainer.baseImage': devContainer.baseImage,
    'tooling.devContainer.aptPackages': [...devContainer.aptPackages],
    'tooling.devContainer.additionalPorts': [...devContainer.additionalPorts],

    // Coder
    'tooling.coder.enabled': coder.enabled,
    'tooling.coder.accessUrl': coder.accessUrl,
    'tooling.coder.repoUrl': coder.repoUrl || repo.urls.repo || '',
    'tooling.coder.resources.cpu': coder.resources.cpu,
    'tooling.coder.resources.memoryGb': coder.resources.memoryGb,
    'tooling.coder.resources.diskGb': coder.resources.diskGb,

    // CI
    'tooling.ci.enabled': ci.enabled,
    'tooling.ci.runnerSize': ci.runnerSize,

    // Infisical
    'tooling.infisical.siteUrl': infisical.siteUrl,
    'tooling.infisical.serverVersion': infisical.serverVersion,

    // Computed ports
    'tooling.devProxy.allPorts': allPorts,

    // Raw config & collections
    config,
    products: config.products,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
  });
}
