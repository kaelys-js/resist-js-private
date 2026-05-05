/**
 * Versions Schema
 *
 * Schema for runtime version configuration.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Primitive Schemas
// =============================================================================

/**
 * Pinned version string — `major.minor.patch` only, no pre-release or build metadata.
 * Intentionally stricter than `SemverSchema` from `@/schemas/common` which allows
 * full semver including pre-release suffixes.
 *
 * Used for pinned runtime versions (Node.js, package manager) where
 * pre-release suffixes are inappropriate.
 */
export const PinnedVersionSchema = v.pipe(
  v.string(),
  v.regex(/^\d+\.\d+\.\d+$/, 'Must be a pinned version (major.minor.patch, no pre-release)'),
);

/** Inferred output type of {@link PinnedVersionSchema}. A `major.minor.patch` version string. */
export type PinnedVersion = v.InferOutput<typeof PinnedVersionSchema>;

// =============================================================================
// Node Tool Versions
// =============================================================================

/**
 * Valibot schema for pinned Node.js tool versions.
 * Keys are npm package names (matching `package.json` devDependencies).
 * All use exact `major.minor.patch` versions via {@link PinnedVersionSchema}.
 *
 * Used by `pnpm tool sync` to generate `devDependencies` in root `package.json`
 * and by the installer to add tools as root workspace devDeps.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(NodeToolVersionsSchema, {
 *   turbo: '2.8.9',
 *   vitest: '4.0.18',
 * });
 * ```
 */
export const NodeToolVersionsSchema = v.strictObject({
  /** Biome formatter/linter */
  '@biomejs/biome': v.optional(PinnedVersionSchema, '2.4.2'),
  /** Prettier formatter */
  prettier: v.optional(PinnedVersionSchema, '3.8.1'),
  /** Turborepo build system */
  turbo: v.optional(PinnedVersionSchema, '2.8.9'),
  /** Commitlint CLI */
  '@commitlint/cli': v.optional(PinnedVersionSchema, '20.4.1'),
  /** Commitlint conventional config */
  '@commitlint/config-conventional': v.optional(PinnedVersionSchema, '20.4.1'),
  /** Commitlint config validator (ships commitlint JSON schema) */
  '@commitlint/config-validator': v.optional(PinnedVersionSchema, '20.4.0'),
  /** All-contributors CLI */
  'all-contributors-cli': v.optional(PinnedVersionSchema, '6.26.1'),
  /** Lefthook git hooks manager */
  lefthook: v.optional(PinnedVersionSchema, '2.1.0'),
  /** Syncpack dependency checker */
  syncpack: v.optional(PinnedVersionSchema, '14.0.0'),
  /** TSX TypeScript executor */
  tsx: v.optional(PinnedVersionSchema, '4.21.0'),
  /** Valibot schema validation */
  valibot: v.optional(PinnedVersionSchema, '1.2.0'),
  /** Vite build tool */
  vite: v.optional(PinnedVersionSchema, '7.3.1'),
  /** Vitest coverage with V8 */
  '@vitest/coverage-v8': v.optional(PinnedVersionSchema, '4.0.18'),
  /** Vitest test runner */
  vitest: v.optional(PinnedVersionSchema, '4.0.18'),
  /** SQL formatter */
  'sql-formatter': v.optional(PinnedVersionSchema, '15.7.2'),
  /** Pug beautifier */
  'pug-beautifier': v.optional(PinnedVersionSchema, '0.0.1'),
  /** Prettier XML plugin */
  '@prettier/plugin-xml': v.optional(PinnedVersionSchema, '3.4.2'),
  /** Prettier Svelte plugin */
  'prettier-plugin-svelte': v.optional(PinnedVersionSchema, '3.4.1'),
  /** Prettier Astro plugin */
  'prettier-plugin-astro': v.optional(PinnedVersionSchema, '0.14.1'),
  /** Prettier Pug plugin */
  '@prettier/plugin-pug': v.optional(PinnedVersionSchema, '3.4.2'),
  /** Prettier Twig plugin */
  '@zackad/prettier-plugin-twig': v.optional(PinnedVersionSchema, '0.16.0'),
  /** Blade template formatter */
  'blade-formatter': v.optional(PinnedVersionSchema, '1.44.2'),
  /** Prisma ORM CLI */
  prisma: v.optional(PinnedVersionSchema, '7.4.0'),
  /** Cloudflare Wrangler CLI */
  wrangler: v.optional(PinnedVersionSchema, '4.66.0'),
  /** Oxlint linter */
  oxlint: v.optional(PinnedVersionSchema, '1.48.0'),
  /** Knip unused dependency finder */
  knip: v.optional(PinnedVersionSchema, '5.84.1'),
});

/** Inferred output type of {@link NodeToolVersionsSchema}. */
export type NodeToolVersions = v.InferOutput<typeof NodeToolVersionsSchema>;

// =============================================================================
// System Tool Versions
// =============================================================================

/**
 * Valibot schema for pinned system tool versions.
 * Keys are binary names (matching `isToolAvailable()` lookups).
 * All managed by `mise` (replaces brew/apt/choco).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(SystemToolVersionsSchema, {
 *   caddy: '2.10.2',
 *   mkcert: '1.4.4',
 * });
 * ```
 */
export const SystemToolVersionsSchema = v.strictObject({
  /** Caddy web server (dev proxy) */
  caddy: v.optional(PinnedVersionSchema, '2.10.2'),
  /** mkcert local CA (HTTPS) */
  mkcert: v.optional(PinnedVersionSchema, '1.4.4'),
  /** Cloudflare Tunnel client */
  cloudflared: v.optional(PinnedVersionSchema, '2026.2.0'),
  /** Ruff Python linter/formatter */
  ruff: v.optional(PinnedVersionSchema, '0.15.1'),
  /** Black Python formatter */
  black: v.optional(PinnedVersionSchema, '26.1.0'),
  /** autopep8 Python formatter */
  autopep8: v.optional(PinnedVersionSchema, '2.3.2'),
  /** YAPF Python formatter */
  yapf: v.optional(PinnedVersionSchema, '0.43.0'),
  /** isort Python import sorter */
  isort: v.optional(PinnedVersionSchema, '7.0.0'),
  /** SQLFluff SQL linter */
  sqlfluff: v.optional(PinnedVersionSchema, '4.0.4'),
  /** djLint HTML template linter */
  djlint: v.optional(PinnedVersionSchema, '1.36.4'),
  /** cmake-format CMake formatter */
  'cmake-format': v.optional(PinnedVersionSchema, '0.6.13'),
  /** gdformat GDScript formatter */
  gdformat: v.optional(PinnedVersionSchema, '4.2.2'),
  /** Taplo TOML formatter */
  taplo: v.optional(PinnedVersionSchema, '0.9.3'),
  /** StyLua Lua formatter */
  stylua: v.optional(PinnedVersionSchema, '2.3.1'),
  /** Air R formatter */
  air: v.optional(PinnedVersionSchema, '0.1.1'),
  /** gofumpt Go formatter (stricter gofmt) */
  gofumpt: v.optional(PinnedVersionSchema, '0.9.0'),
  /** shfmt shell formatter */
  shfmt: v.optional(PinnedVersionSchema, '3.12.0'),
  /** jsonnetfmt Jsonnet formatter */
  jsonnetfmt: v.optional(PinnedVersionSchema, '0.20.0'),
  /** Buildifier BUILD file formatter */
  buildifier: v.optional(PinnedVersionSchema, '8.5.1'),
  /** Terraform IaC CLI (includes `terraform fmt` for HCL) */
  terraform: v.optional(PinnedVersionSchema, '1.14.5'),
  /** OpenTofu IaC CLI */
  tofu: v.optional(PinnedVersionSchema, '1.11.5'),
  /** Zig language */
  zig: v.optional(PinnedVersionSchema, '0.15.2'),
  /** Crystal language */
  crystal: v.optional(PinnedVersionSchema, '1.19.1'),
  /** Dart language */
  dart: v.optional(PinnedVersionSchema, '3.11.0'),
  /** ktlint Kotlin linter */
  ktlint: v.optional(PinnedVersionSchema, '1.7.0'),
  /** Gleam language */
  gleam: v.optional(PinnedVersionSchema, '1.13.0'),
  /** RuboCop Ruby linter */
  rubocop: v.optional(PinnedVersionSchema, '1.84.2'),
  /** Rufo Ruby formatter */
  rufo: v.optional(PinnedVersionSchema, '0.15.1'),
  /** google-java-format Java formatter */
  'google-java-format': v.optional(PinnedVersionSchema, '1.32.0'),
  /** clang-format C/C++ formatter */
  'clang-format': v.optional(PinnedVersionSchema, '21.1.8'),
  /** swift-format Swift formatter */
  'swift-format': v.optional(PinnedVersionSchema, '602.0.0'),
  /** Elixir Mix build tool */
  mix: v.optional(PinnedVersionSchema, '1.19.5'),
  /** Buf protobuf tool */
  buf: v.optional(PinnedVersionSchema, '1.65.0'),
  /** CUE language */
  cue: v.optional(PinnedVersionSchema, '0.13.0'),
  /** Scalafmt Scala formatter */
  scalafmt: v.optional(PinnedVersionSchema, '3.10.7'),
  /** Dhall language */
  dhall: v.optional(PinnedVersionSchema, '1.42.3'),
  /** Hadolint Dockerfile linter */
  hadolint: v.optional(PinnedVersionSchema, '2.12.0'),
  /** Actionlint GitHub Actions linter */
  actionlint: v.optional(PinnedVersionSchema, '1.7.11'),
  /** nektos/act — run GitHub Actions locally via Docker */
  act: v.optional(PinnedVersionSchema, '0.2.74'),
  /** gitlab-ci-local — run GitLab CI pipelines locally via Docker */
  'gitlab-ci-local': v.optional(PinnedVersionSchema, '4.64.1'),
  /** Infisical secrets management CLI */
  infisical: v.optional(PinnedVersionSchema, '0.43.47'),
  /** Hetzner Cloud CLI */
  hcloud: v.optional(PinnedVersionSchema, '1.61.0'),
  /** Kubernetes CLI */
  kubectl: v.optional(PinnedVersionSchema, '1.35.1'),
  /** Helm Kubernetes package manager */
  helm: v.optional(PinnedVersionSchema, '4.1.1'),
  /** mise tool version manager (self-reference for version tracking) */
  mise: v.optional(PinnedVersionSchema, '2026.2.16'),
  /** uv Python package manager (provides `uvx` for Serena and `uv tool install` for cocoindex-code) */
  uv: v.optional(PinnedVersionSchema, '0.11.9'),
  /** rustfmt Rust formatter (version tracks Rust stable) */
  rustfmt: v.optional(PinnedVersionSchema, '1.93.1'),
  /** gofmt Go formatter (version tracks Go stable) */
  gofmt: v.optional(PinnedVersionSchema, '1.26.0'),
  /** OCaml formatter */
  ocamlformat: v.optional(PinnedVersionSchema, '0.28.1'),
  /** Erlang formatter */
  erlfmt: v.optional(PinnedVersionSchema, '1.7.0'),
  /** Fish shell indenter (version tracks fish shell) */
  fish_indent: v.optional(PinnedVersionSchema, '4.5.0'),
  /** Nix formatter */
  nixfmt: v.optional(PinnedVersionSchema, '1.0.0'),
  /** Nix formatter (alternative) */
  alejandra: v.optional(PinnedVersionSchema, '4.0.0'),
  /** Haskell formatter (ormolu) */
  ormolu: v.optional(PinnedVersionSchema, '0.8.0'),
  /** F# formatter */
  fantomas: v.optional(PinnedVersionSchema, '7.0.3'),
  /** C# formatter */
  csharpier: v.optional(PinnedVersionSchema, '1.2.6'),
  /** PHP formatter (php-cs-fixer) */
  'php-cs-fixer': v.optional(PinnedVersionSchema, '3.94.1'),
  /** PHP formatter (Laravel Pint) */
  pint: v.optional(PinnedVersionSchema, '1.27.1'),
  /** Perl formatter */
  perltidy: v.optional(PinnedVersionSchema, '20260109.0.0'),
  /** Clojure formatter */
  cljfmt: v.optional(PinnedVersionSchema, '0.15.6'),
  /** Nim pretty printer (version tracks Nim stable) */
  nimpretty: v.optional(PinnedVersionSchema, '2.2.6'),
  /** V language formatter */
  v: v.optional(PinnedVersionSchema, '0.5.0'),
  /** R language (version tracks R stable) */
  Rscript: v.optional(PinnedVersionSchema, '4.5.2'),
  /** Bicep IaC CLI */
  bicep: v.optional(PinnedVersionSchema, '0.40.2'),
  /** Nix package formatter (variant) */
  'nixpkgs-fmt': v.optional(PinnedVersionSchema, '1.2.0'),
  /** Haskell formatter (stylish-haskell) */
  'stylish-haskell': v.optional(PinnedVersionSchema, '0.14.6'),
  /** Haskell formatter (fourmolu) */
  fourmolu: v.optional(PinnedVersionSchema, '0.19.0'),
});

/** Inferred output type of {@link SystemToolVersionsSchema}. */
export type SystemToolVersions = v.InferOutput<typeof SystemToolVersionsSchema>;

// =============================================================================
// Versions
// =============================================================================

/**
 * Valibot schema for pinned runtime version strings.
 * Used by `pnpm tool sync` to generate `.nvmrc`, `packageManager` field, etc.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(VersionsSchema, {
 *   node: '24.13.0',
 *   packageManager: '10.28.2',
 *   nodeTools: { turbo: '2.8.9' },
 *   systemTools: { caddy: '2.10.2' },
 * });
 * ```
 */
export const VersionsSchema = v.strictObject({
  /** Node.js version */
  node: v.optional(PinnedVersionSchema, '24.13.0'),
  /** Package manager version */
  packageManager: v.optional(PinnedVersionSchema, '10.28.2'),
  /** Pinned Node.js tool versions (npm packages installed as root devDependencies) */
  nodeTools: v.optional(NodeToolVersionsSchema, {}),
  /** Pinned system tool versions (managed by mise) */
  systemTools: v.optional(SystemToolVersionsSchema, {}),
});

/** Inferred output type of {@link VersionsSchema}. */
export type Versions = v.InferOutput<typeof VersionsSchema>;
