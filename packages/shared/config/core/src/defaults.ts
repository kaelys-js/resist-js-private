/**
 * Core Config Defaults
 *
 * Default values for {root}.config.ts. These are used when the config file
 * doesn't exist or when specific values are not provided.
 *
 * @module
 */

import type { CoreConfig } from '@/schemas/core-config/config';

/**
 * Default configuration values for the entire monorepo.
 *
 * `loadConfig()` deep-merges user config over these defaults (user values win).
 * Objects are recursively merged; arrays are replaced, not concatenated.
 * If the config file is missing on disk, `loadConfig()` uses these defaults
 * as-is (frozen) and logs a warning.
 *
 * Sections:
 * - **company** — Business identity (name, domain, support email, license)
 * - **products** — Empty by default; user defines their product catalog
 * - **locales / defaultLocale** — i18n locale list and fallback
 * - **tooling** — Dev proxy, formatting, paths, onboarding steps, package manager
 * - **repo** — Repository metadata (description, keywords, URLs)
 * - **versions** — Pinned runtime versions (Node.js, package manager)
 * - **format** — EditorConfig-style formatting (global + alternate overrides)
 * - **git** — Default branch and npm publish branch
 * - **environment** — Current environment name (defaults to `'development'`)
 *
 * @example
 * ```typescript
 * import { defaults } from '@/config/core/defaults';
 *
 * // Inspect the default dev proxy port:
 * defaults.tooling.devProxy.port; // => 3000
 *
 * // Inspect the default Node.js version:
 * defaults.versions.node; // => '24.13.0'
 * ```
 */
export const defaults: CoreConfig = {
  // -------------------------------------------------------------------------
  // Business Configuration
  // -------------------------------------------------------------------------

  company: {
    name: 'My Company',
    domain: 'example.com',
    supportEmail: 'support@example.com',
    license: 'MIT',
    emails: {},
    domains: {},
  },
  products: [],
  locales: ['en'],
  defaultLocale: 'en',

  // -------------------------------------------------------------------------
  // Tooling Configuration
  // -------------------------------------------------------------------------

  tooling: {
    devProxy: {
      port: 3000,
      https: true,
      localTld: '.localhost',
      portIncrement: 100,
      adminPort: 9001,
      qaPort: 9002,
      docsPort: 9003,
      serviceOffsets: {
        app: 0,
        api: 1,
        status: 2,
        assets: 3,
        marketing: 4,
      },
    },
    formatting: {
      useTabs: true,
      tabWidth: 2,
      printWidth: 100,
      singleQuote: true,
      semi: true,
    },
    paths: {
      productsDir: 'packages/products',
      productTemplateDir: 'packages/products-template',
      configFilename: 'resist.config.ts',
      markerDir: '.resist',
    },
    onboarding: {
      steps: ['i', 'clean', 'setup:vscode', 'update:sync', 'secrets:setup', 'ci:local'],
    },
    packageManager: {
      manager: 'pnpm',
    },
    devContainer: {
      enabled: true,
      baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
      aptPackages: [],
      additionalPorts: [],
    },
    coder: {
      enabled: true,
      accessUrl: '',
      repoUrl: '',
      resources: {
        cpu: 4,
        memoryGb: 8,
        diskGb: 50,
      },
    },
    ci: {
      enabled: true,
      runnerSize: 'medium',
    },
    infisical: {
      siteUrl: 'http://localhost:8080',
      serverVersion: '0.151.0',
    },
    gitProvider: {
      provider: 'github',
    },
  },

  // -------------------------------------------------------------------------
  // Repository Configuration
  // -------------------------------------------------------------------------

  repo: {
    description: '',
    keywords: [],
    urls: {},
  },

  // -------------------------------------------------------------------------
  // Version Configuration
  // -------------------------------------------------------------------------

  versions: {
    node: '24.13.0',
    packageManager: '10.28.2',
    nodeTools: {},
    systemTools: {},
  },

  // -------------------------------------------------------------------------
  // Format Configuration
  // -------------------------------------------------------------------------

  format: {
    global: {
      indent_style: 'tab',
      indent_size: 2,
      tab_width: 2,
      line_length: 100,
    },
    alternate: {
      indent_style: 'tab',
      indent_size: 4,
    },
  },

  // -------------------------------------------------------------------------
  // Git Configuration
  // -------------------------------------------------------------------------

  git: {
    branch: 'main',
    npm_publish_branch: 'main',
  },

  // -------------------------------------------------------------------------
  // Environment Configuration
  // -------------------------------------------------------------------------

  environment: 'development',
};
