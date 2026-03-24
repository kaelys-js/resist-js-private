# @/schemas/core-config

Valibot schemas for the WebForge monorepo configuration system.

## Overview

Defines the complete type-safe schema for `resist.config.ts` — the root configuration file that controls all tooling, products, environments, and infrastructure settings.

## Source Files

| File | Description |
|------|-------------|
| `business.ts` | Company info, products, locales, SPDX licenses, emails, domains |
| `config.ts` | Top-level `CoreConfigSchema` combining all modules |
| `environment.ts` | Standard environments, feature branches, deployment config |
| `format.ts` | Code formatting settings (indent, tab width, print width) |
| `git.ts` | Git branch and npm publish branch configuration |
| `product.ts` | Per-product config: layers, tooling overrides |
| `repo.ts` | Repository metadata: description, keywords, URLs |
| `secret-schemas.ts` | Infisical-managed secret validation (API keys, DB URLs, JWT) |
| `tooling.ts` | Dev proxy, formatting, paths, Coder, CI, Infisical, git provider |
| `versions.ts` | Pinned versions for Node, package manager, system tools |

## Usage

```typescript
import { CoreConfigObjectSchema } from '@/schemas/core-config/config';
import { safeParse } from '@/utils/result/safe';

const result = safeParse(CoreConfigObjectSchema, rawConfig);

if (result.ok) {
  const config = result.data;
}
```

## API Reference

### config.ts

| Export | Kind | Description |
|--------|------|-------------|
| `CoreConfigObjectSchema` | schema | Top-level strict object schema for the full config |
| `CoreConfigSchema` | schema | CoreConfigObjectSchema + cross-field validation (defaultLocale in locales) |
| `CoreConfig` | type | Inferred output of CoreConfigSchema |
| `CoreConfigInput` | type | Inferred input of CoreConfigObjectSchema |

### business.ts

| Export | Kind | Description |
|--------|------|-------------|
| `DomainSchema` | schema | Valid domain name (hostname without protocol) |
| `Domain` | type | Inferred domain string |
| `SpdxLicenseSchema` | schema | SPDX license identifier picklist (MIT, Apache-2.0, etc.) |
| `SpdxLicense` | type | Inferred license string |
| `CompanyEmailsSchema` | schema | Email addresses for npm, support, security |
| `CompanyEmails` | type | Inferred email config |
| `CompanyDomainsSchema` | schema | Domain names for API, app, docs, etc. |
| `CompanyDomains` | type | Inferred domain config |
| `CompanySchema` | schema | Company info: name, domain, supportEmail, license, emails, domains |
| `Company` | type | Inferred company config |
| `ProductSchema` | schema | Product entry: id, name, description |
| `Product` | type | Inferred product entry |
| `LocaleSchema` | schema | BCP 47 locale tag (e.g., `en`, `ja`, `pt-BR`) |
| `Locale` | type | Inferred locale string |
| `BusinessObjectSchema` | schema | Company + products + locales + defaultLocale |
| `BusinessSchema` | schema | BusinessObjectSchema + defaultLocale-in-locales validation |
| `Business` | type | Inferred business config |

### environment.ts

| Export | Kind | Description |
|--------|------|-------------|
| `StandardEnvironmentSchema` | schema | Picklist: development, staging, production |
| `StandardEnvironment` | type | Inferred environment name |
| `FeatureBranchSchema` | schema | Feature branch environment name (kebab-case) |
| `FeatureBranch` | type | Inferred feature branch name |
| `EnvironmentNameSchema` | schema | Union of standard + feature branch environments |
| `EnvironmentName` | type | Inferred environment name |
| `EnvironmentSchema` | schema | Environment config: name, baseUrl, features |
| `Environment` | type | Inferred environment config |

### format.ts

| Export | Kind | Description |
|--------|------|-------------|
| `FormatGlobalSchema` | schema | Global formatting: indent_style, indent_size, tab_width, line_length |
| `FormatGlobal` | type | Inferred global format |
| `FormatAlternateSchema` | schema | Alternate formatting for specific languages |
| `FormatAlternate` | type | Inferred alternate format |
| `FormatSchema` | schema | Combined global + alternate formatting |
| `Format` | type | Inferred format config |

### git.ts

| Export | Kind | Description |
|--------|------|-------------|
| `GitSchema` | schema | Git config: branch, npm_publish_branch |
| `Git` | type | Inferred git config |

### product.ts

| Export | Kind | Description |
|--------|------|-------------|
| `ProductLayersSchema` | schema | Product layers: api, app, status, assets, marketing |
| `ProductLayers` | type | Inferred layers config |
| `ProductToolingOverridesSchema` | schema | Per-product tooling overrides |
| `ProductToolingOverrides` | type | Inferred tooling overrides |
| `ProductConfigSchema` | schema | Full product config: id, name, description, layers, tooling |
| `ProductConfig` | type | Inferred product config |

### repo.ts

| Export | Kind | Description |
|--------|------|-------------|
| `RepoUrlsSchema` | schema | Repository URLs: repo, homepage, docs, issues |
| `RepoUrls` | type | Inferred repo URLs |
| `RepoSchema` | schema | Repo metadata: description, keywords, urls |
| `Repo` | type | Inferred repo config |

### tooling.ts

| Export | Kind | Description |
|--------|------|-------------|
| `PortOffsetSchema` | schema | Port offset 0-99 |
| `PortOffset` | type | Inferred port offset |
| `PortIncrementSchema` | schema | Port increment 0-1000 |
| `PortIncrement` | type | Inferred port increment |
| `LocalTldSchema` | schema | Local TLD (e.g., `.localhost`, `.test`) |
| `LocalTld` | type | Inferred local TLD |
| `TabWidthSchema` | schema | Tab width 1-8 |
| `TabWidth` | type | Inferred tab width |
| `PrintWidthSchema` | schema | Print width 40-200 |
| `PrintWidth` | type | Inferred print width |
| `ServiceOffsetsSchema` | schema | Port offsets per service type |
| `ServiceOffsets` | type | Inferred service offsets |
| `ServiceNameSchema` | schema | Picklist: api, app, status, assets, marketing |
| `ServiceName` | type | Inferred service name |
| `DevProxySchema` | schema | Dev proxy: port, https, localTld, tunnel config |
| `DevProxy` | type | Inferred dev proxy config |
| `FormattingSchema` | schema | Code formatting: useTabs, tabWidth, printWidth, etc. |
| `Formatting` | type | Inferred formatting config |
| `PathsSchema` | schema | Workspace paths: productsDir, configFilename, etc. |
| `Paths` | type | Inferred paths config |
| `DEFAULT_CONFIG_FILENAME` | const | Default config filename: `resist.config.ts` |
| `PackageManagerTypeSchema` | schema | Picklist: pnpm, npm, yarn, bun |
| `PackageManagerType` | type | Inferred package manager type |
| `DEFAULT_PACKAGE_MANAGER` | const | Default package manager: `pnpm` |
| `PackageManagerSchema` | schema | Package manager config |
| `PackageManager` | type | Inferred package manager config |
| `OnboardingSchema` | schema | Onboarding steps configuration |
| `Onboarding` | type | Inferred onboarding config |
| `DockerImageSchema` | schema | Docker image name validation |
| `DockerImage` | type | Inferred docker image |
| `AptPackageSchema` | schema | APT package name validation |
| `AptPackage` | type | Inferred APT package |
| `DevContainerSchema` | schema | Dev container: image, packages, ports, env vars |
| `DevContainer` | type | Inferred dev container config |
| `CpuCoresSchema` | schema | CPU cores 1-32 |
| `CpuCores` | type | Inferred CPU cores |
| `MemoryGbSchema` | schema | Memory 1-128 GB |
| `MemoryGb` | type | Inferred memory |
| `DiskGbSchema` | schema | Disk 10-1000 GB |
| `DiskGb` | type | Inferred disk size |
| `CoderResourcesSchema` | schema | Coder workspace resources: cpu, memory, disk |
| `CoderResources` | type | Inferred resources |
| `RegistryAuthMethodSchema` | schema | Picklist: docker-login, ecr, gcloud, none |
| `RegistryAuthMethod` | type | Inferred auth method |
| `ContainerRegistrySchema` | schema | Container registry: url, namespace, auth |
| `ContainerRegistry` | type | Inferred registry config |
| `HetznerServerTypeSchema` | schema | Hetzner server type (cx/cpx/cax series) |
| `HetznerServerType` | type | Inferred server type |
| `HetznerLocationSchema` | schema | Picklist: fsn1, nbg1, hel1, ash, hil |
| `HetznerLocation` | type | Inferred location |
| `WorkspaceArchSchema` | schema | Picklist: amd64, arm64 |
| `WorkspaceArch` | type | Inferred architecture |
| `CoderIdeSchema` | schema | Picklist: vscode-web, code-server, jetbrains |
| `CoderIde` | type | Inferred IDE |
| `CoderSchema` | schema | Full Coder config: resources, registry, server, IDE |
| `Coder` | type | Inferred Coder config |
| `ActRunnerSizeSchema` | schema | Picklist: micro, medium, large |
| `ActRunnerSize` | type | Inferred runner size |
| `CiSchema` | schema | CI config: enabled, runner size |
| `Ci` | type | Inferred CI config |
| `InfisicalAuthMethodSchema` | schema | Picklist: token, machine-identity, interactive |
| `InfisicalAuthMethod` | type | Inferred auth method |
| `InfisicalAuthSchema` | schema | Infisical auth: method, cacheTtlSeconds |
| `InfisicalAuth` | type | Inferred auth config |
| `InfisicalDockerSchema` | schema | Infisical Docker Compose: composeFile, service |
| `InfisicalDocker` | type | Inferred docker config |
| `InfisicalEnvironmentsSchema` | schema | Environment mapping: default, branchMapping |
| `InfisicalEnvironments` | type | Inferred environments |
| `InfisicalMachineIdentitySchema` | schema | Machine identity: name, role |
| `InfisicalMachineIdentity` | type | Inferred identity |
| `InfisicalProvisionSchema` | schema | Provisioning: folders, secrets, identities |
| `InfisicalProvision` | type | Inferred provision config |
| `InfisicalSchema` | schema | Full Infisical config |
| `Infisical` | type | Inferred Infisical config |
| `GitProviderTypeSchema` | schema | Picklist: github, gitlab |
| `GitProviderType` | type | Inferred git provider |
| `DEFAULT_GIT_PROVIDER` | const | Default git provider: `github` |
| `GitProviderSchema` | schema | Git provider config |
| `GitProvider` | type | Inferred git provider config |
| `ToolingSchema` | schema | All tooling combined |
| `Tooling` | type | Inferred tooling config |

### versions.ts

| Export | Kind | Description |
|--------|------|-------------|
| `PinnedVersionSchema` | schema | Pinned version string (major.minor.patch) |
| `PinnedVersion` | type | Inferred version string |
| `NodeToolVersionsSchema` | schema | Node ecosystem tool versions (biome, turbo, etc.) |
| `NodeToolVersions` | type | Inferred node tool versions |
| `SystemToolVersionsSchema` | schema | System tool versions (caddy, mkcert, ruff, etc.) |
| `SystemToolVersions` | type | Inferred system tool versions |
| `VersionsSchema` | schema | Combined node + packageManager + tool versions |
| `Versions` | type | Inferred versions config |

### secret-schemas.ts

| Export | Kind | Description |
|--------|------|-------------|
| `CloudflareSecretsSchema` | schema | Cloudflare API token + account/zone IDs |
| `CloudflareSecrets` | type | Inferred Cloudflare secrets |
| `GitHubSecretsSchema` | schema | GitHub PAT, OAuth, App credentials |
| `GitHubSecrets` | type | Inferred GitHub secrets |
| `GitLabSecretsSchema` | schema | GitLab token + OAuth credentials |
| `GitLabSecrets` | type | Inferred GitLab secrets |
| `TurboSecretsSchema` | schema | Turborepo remote cache token + team |
| `TurboSecrets` | type | Inferred Turbo secrets |
| `DevEnvSecretsSchema` | schema | Hetzner token for dev environments |
| `DevEnvSecrets` | type | Inferred dev env secrets |
| `DatabaseSecretsSchema` | schema | D1, KV, database URLs + auth tokens |
| `DatabaseSecrets` | type | Inferred database secrets |
| `AuthSecretsSchema` | schema | API secret key, JWT secrets + config |
| `AuthSecrets` | type | Inferred auth secrets |
| `PaymentSecretsSchema` | schema | LemonSqueezy API key + webhook secret |
| `PaymentSecrets` | type | Inferred payment secrets |
| `RevenueCatSecretsSchema` | schema | RevenueCat API key + webhook secret |
| `RevenueCatSecrets` | type | Inferred RevenueCat secrets |
| `AnalyticsSecretsSchema` | schema | PostHog + GA measurement IDs |
| `AnalyticsSecrets` | type | Inferred analytics secrets |
| `EmailSecretsSchema` | schema | Resend API key + config |
| `EmailSecrets` | type | Inferred email secrets |
| `StatusSecretsSchema` | schema | Status page token |
| `StatusSecrets` | type | Inferred status secrets |
| `StorageSecretsSchema` | schema | R2/S3 bucket credentials |
| `StorageSecrets` | type | Inferred storage secrets |
| `GlobalSecretsSchema` | schema | All global secrets combined |
| `GlobalSecrets` | type | Inferred global secrets |
| `ProductSecretsSchema` | schema | All per-product secrets combined |
| `ProductSecrets` | type | Inferred product secrets |
| `AllSecretsSchema` | schema | Global + product secrets |
| `AllSecrets` | type | Inferred all secrets |
| `GLOBAL_SECRET_SCHEMAS` | const | Registry of global secret schemas by folder path |
| `PRODUCT_SECRET_SCHEMAS` | const | Registry of product secret schemas by folder path |

## Dependencies

- `valibot` — Schema validation
- `@/schemas/common` — Shared primitive schemas (PortSchema, PathSchema, UrlStringSchema, NameSchema, HostnameSchema)
