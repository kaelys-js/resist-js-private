# `@/schemas/core-config` — packages/shared/schemas/core-config

Workspace + product config schemas. Defines the SHAPE of everything `@/config` (the loader) reads from disk.

## Package
- **Name**: `@/schemas/core-config` (private)
- **Vitest project**: `schemas-core-config`
- **Has `qa:checks` script** (runs `pnpm --filter @/cli tool checks --cwd .`)
- **Depends on**: `@/schemas/common`

## File structure (`src/`)
```
config.ts              ← root composition: CoreConfig + CoreConfigInput
config.test.ts
business.ts            ← Business / Company / Locale / Product / SpdxLicense
environment.ts         ← Environment / FeatureBranch / StandardEnvironment
product.ts             ← ProductConfig + layers + tooling overrides
git.ts                 ← Git + GitBranch (config side, distinct from common's GitBranch primitive)
format.ts              ← Format / FormatAlternate / FormatGlobal
repo.ts                ← Repo + RepoUrls
tooling.ts             ← Big file: every tool config (CI, Coder, Docker, Infisical, Hetzner, etc.)
secret-schemas.ts      ← Secret schemas split into GLOBAL_SECRET_SCHEMAS + PRODUCT_SECRET_SCHEMAS
versions.ts            ← Versions / NodeToolVersions / SystemToolVersions / PinnedVersion
```

No `index.ts` barrel — consumers import paths directly.

## Major schemas by file

### `config.ts`
- `CoreConfig`, `CoreConfigInput` — the top-level workspace config

### `business.ts`
- `Business`, `Company`, `CompanyDomains`, `CompanyEmails`
- `Domain`, `Locale`, `Product`, `SpdxLicense`

### `environment.ts`
- `Environment`, `EnvironmentName`, `FeatureBranch`, `StandardEnvironment`

### `product.ts`
- `ProductConfig`, `ProductLayers`, `ProductToolingOverrides`

### `git.ts`
- `Git`, `GitBranch`

### `format.ts`
- `Format`, `FormatAlternate`, `FormatGlobal`

### `repo.ts`
- `Repo`, `RepoUrls`

### `tooling.ts` (the big file)
- `Tooling` (root), `Ci`, `Formatting`
- Coder.com IDE: `Coder`, `CoderIde`, `CoderResources`, `Cpu`, `Memory`, `DiskGb`
- Containers: `ContainerRegistry`, `DockerImage`, `DevContainer`, `RegistryAuthMethod`
- Dev: `DevProxy`, `LocalTld`, `Onboarding`, `Paths`
- Git providers: `GitProvider`, `GitProviderType`
- Hetzner: `HetznerLocation`, `HetznerServerType`
- Infisical: `Infisical`, `InfisicalAuth`, `InfisicalAuthMethod`, `InfisicalDocker`, `InfisicalEnvironments`, `InfisicalMachineIdentity`, `InfisicalProvision`
- Package mgmt: `PackageManager`, `PackageManagerType`
- Service mesh: `ServiceName`, `ServiceOffsets`, `PortIncrement`, `PortOffset`, `WorkspaceArch`
- Constants: `DEFAULT_CONFIG_FILENAME`, `DEFAULT_GIT_PROVIDER`, `DEFAULT_PACKAGE_MANAGER`, `PROVIDER_CI_IDENTITY`

### `secret-schemas.ts`
- `GLOBAL_SECRET_SCHEMAS` — workspace-level secrets
- `PRODUCT_SECRET_SCHEMAS` — per-product secrets
- Subgroups: All, Analytics, Auth, Cloudflare, Database, DevEnv, Email, GitHub, GitLab, Global, Payment, Product, RevenueCat, Status, Storage, Turbo
- Building blocks: `ApiKeySchema`, `DatabaseUrlSchema`, `DurationStringSchema`, `NonEmptyStringSchema`, `SecretKeySchema`, `UrlStringSchema`

### `versions.ts`
- `Versions`, `NodeToolVersions`, `SystemToolVersions`, `PinnedVersion`

## Patterns
- One file per concern (unlike `@/schemas/common` which is monolithic)
- All schemas built on `@/schemas/common` primitives
- Config files on disk are validated against `CoreConfig` via `@/config` loader
- Secret schemas are EXPORTED OBJECTS (`GLOBAL_SECRET_SCHEMAS`) not single Valibot schemas — consumed by Infisical setup tooling

## Consumed by
- `@/config` (runtime loader)
- `@/secrets/infisical` (uses `secret-schemas.ts`)
- `@/cli` `secrets`/`secrets-setup`/`onboard` tools
