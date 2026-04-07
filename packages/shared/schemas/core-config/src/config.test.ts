/**
 * Tests for CoreConfigSchema and sub-schemas.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

import { BusinessSchema } from '@/schemas/core-config/business';
import { CoreConfigObjectSchema, CoreConfigSchema } from '@/schemas/core-config/config';
import { StandardEnvironmentSchema } from '@/schemas/core-config/environment';
import {
  ProductLayersSchema,
  ProductToolingOverridesSchema,
  ProductConfigSchema,
} from '@/schemas/core-config/product';
import {
  CloudflareSecretsSchema,
  GitHubSecretsSchema,
  GitLabSecretsSchema,
  TurboSecretsSchema,
  DevEnvSecretsSchema,
  DatabaseSecretsSchema,
  AuthSecretsSchema,
  PaymentSecretsSchema,
  RevenueCatSecretsSchema,
  AnalyticsSecretsSchema,
  EmailSecretsSchema,
  StatusSecretsSchema,
  StorageSecretsSchema,
  GlobalSecretsSchema,
  ProductSecretsSchema,
  AllSecretsSchema,
  GLOBAL_SECRET_SCHEMAS,
  PRODUCT_SECRET_SCHEMAS,
} from '@/schemas/core-config/secret-schemas';
import {
  PortOffsetSchema,
  PortIncrementSchema,
  LocalTldSchema,
  TabWidthSchema,
  PrintWidthSchema,
  ServiceNameSchema,
  PackageManagerTypeSchema,
} from '@/schemas/core-config/tooling';
import { PinnedVersionSchema } from '@/schemas/core-config/versions';

// =============================================================================
// Environment Schemas
// =============================================================================

describe('StandardEnvironmentSchema', () => {
  it('accepts development', () => {
    const result = v.safeParse(StandardEnvironmentSchema, 'development');

    expect(result.success).toBe(true);
  });

  it('accepts staging', () => {
    const result = v.safeParse(StandardEnvironmentSchema, 'staging');

    expect(result.success).toBe(true);
  });

  it('accepts production', () => {
    const result = v.safeParse(StandardEnvironmentSchema, 'production');

    expect(result.success).toBe(true);
  });

  it('rejects invalid environment', () => {
    const result = v.safeParse(StandardEnvironmentSchema, 'test');

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Tooling Primitive Schemas
// =============================================================================

describe('PortOffsetSchema', () => {
  it('accepts 0', () => {
    expect(v.safeParse(PortOffsetSchema, 0).success).toBe(true);
  });

  it('accepts 99', () => {
    expect(v.safeParse(PortOffsetSchema, 99).success).toBe(true);
  });

  it('rejects 100', () => {
    expect(v.safeParse(PortOffsetSchema, 100).success).toBe(false);
  });

  it('rejects -1', () => {
    expect(v.safeParse(PortOffsetSchema, -1).success).toBe(false);
  });

  it('rejects float', () => {
    expect(v.safeParse(PortOffsetSchema, 1.5).success).toBe(false);
  });
});

describe('PortIncrementSchema', () => {
  it('accepts 0', () => {
    expect(v.safeParse(PortIncrementSchema, 0).success).toBe(true);
  });

  it('accepts 100', () => {
    expect(v.safeParse(PortIncrementSchema, 100).success).toBe(true);
  });

  it('accepts 1000', () => {
    expect(v.safeParse(PortIncrementSchema, 1000).success).toBe(true);
  });

  it('rejects 1001', () => {
    expect(v.safeParse(PortIncrementSchema, 1001).success).toBe(false);
  });
});

describe('LocalTldSchema', () => {
  it('accepts .localhost', () => {
    expect(v.safeParse(LocalTldSchema, '.localhost').success).toBe(true);
  });

  it('accepts .test', () => {
    expect(v.safeParse(LocalTldSchema, '.test').success).toBe(true);
  });

  it('rejects without leading dot', () => {
    expect(v.safeParse(LocalTldSchema, 'localhost').success).toBe(false);
  });
});

describe('TabWidthSchema', () => {
  it('accepts 2', () => {
    expect(v.safeParse(TabWidthSchema, 2).success).toBe(true);
  });

  it('rejects 0', () => {
    expect(v.safeParse(TabWidthSchema, 0).success).toBe(false);
  });

  it('rejects 9', () => {
    expect(v.safeParse(TabWidthSchema, 9).success).toBe(false);
  });
});

describe('PrintWidthSchema', () => {
  it('accepts 80', () => {
    expect(v.safeParse(PrintWidthSchema, 80).success).toBe(true);
  });

  it('accepts 100', () => {
    expect(v.safeParse(PrintWidthSchema, 100).success).toBe(true);
  });

  it('rejects 39', () => {
    expect(v.safeParse(PrintWidthSchema, 39).success).toBe(false);
  });

  it('rejects 201', () => {
    expect(v.safeParse(PrintWidthSchema, 201).success).toBe(false);
  });
});

describe('ServiceNameSchema', () => {
  it.each(['api', 'app', 'status', 'assets', 'marketing'])('accepts %s', (name) => {
    expect(v.safeParse(ServiceNameSchema, name).success).toBe(true);
  });

  it('rejects unknown service', () => {
    expect(v.safeParse(ServiceNameSchema, 'database').success).toBe(false);
  });
});

describe('PackageManagerTypeSchema', () => {
  it.each(['pnpm', 'npm', 'yarn', 'bun'])('accepts %s', (pm) => {
    expect(v.safeParse(PackageManagerTypeSchema, pm).success).toBe(true);
  });

  it('rejects unknown manager', () => {
    expect(v.safeParse(PackageManagerTypeSchema, 'cargo').success).toBe(false);
  });
});

describe('PinnedVersionSchema', () => {
  it('accepts semver', () => {
    expect(v.safeParse(PinnedVersionSchema, '1.2.3').success).toBe(true);
  });

  it('accepts major.minor.patch', () => {
    expect(v.safeParse(PinnedVersionSchema, '24.13.0').success).toBe(true);
  });

  it('rejects major.minor without patch', () => {
    expect(v.safeParse(PinnedVersionSchema, '24.13').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(v.safeParse(PinnedVersionSchema, '').success).toBe(false);
  });
});

// =============================================================================
// CoreConfigObjectSchema
// =============================================================================

describe('CoreConfigObjectSchema', () => {
  it('accepts minimal valid config', () => {
    const result = v.safeParse(CoreConfigObjectSchema, {
      company: {
        name: 'Test Co',
        domain: 'test.com',
        supportEmail: 'support@test.com',
        license: 'MIT',
      },
      products: [],
      locales: ['en'],
      defaultLocale: 'en',
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing company', () => {
    const result = v.safeParse(CoreConfigObjectSchema, {
      products: [],
      locales: ['en'],
      defaultLocale: 'en',
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing locales', () => {
    const result = v.safeParse(CoreConfigObjectSchema, {
      company: {
        name: 'Test Co',
        domain: 'test.com',
        supportEmail: 'support@test.com',
        license: 'MIT',
      },
      products: [],
      defaultLocale: 'en',
    });

    expect(result.success).toBe(false);
  });

  it('fills defaults for optional tooling fields', () => {
    const result = v.safeParse(CoreConfigObjectSchema, {
      company: {
        name: 'Test Co',
        domain: 'test.com',
        supportEmail: 'support@test.com',
        license: 'MIT',
      },
      products: [],
      locales: ['en'],
      defaultLocale: 'en',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.output.tooling.devProxy.port).toBe(3000);
      expect(result.output.tooling.formatting.tabWidth).toBe(2);
      expect(result.output.tooling.paths.productsDir).toBeDefined();
      expect(result.output.environment).toBe('development');
    }
  });

  it('rejects invalid port value', () => {
    const result = v.safeParse(CoreConfigObjectSchema, {
      company: {
        name: 'Test Co',
        domain: 'test.com',
        supportEmail: 'support@test.com',
        license: 'MIT',
      },
      products: [],
      locales: ['en'],
      defaultLocale: 'en',
      tooling: {
        devProxy: {
          port: 99_999,
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it('accepts full config with all optional fields', () => {
    const result = v.safeParse(CoreConfigObjectSchema, {
      company: {
        name: 'Acme Corp',
        domain: 'acme.com',
        supportEmail: 'help@acme.com',
        license: 'AGPL-3.0-only',
        emails: { npm: 'npm@acme.com' },
        domains: {},
      },
      products: [
        {
          id: 'my-product',
          name: 'My Product',
        },
      ],
      locales: ['en', 'ja'],
      defaultLocale: 'en',
      tooling: {
        devProxy: {
          port: 4000,
          https: false,
        },
        formatting: {
          useTabs: false,
          tabWidth: 4,
          printWidth: 120,
          singleQuote: false,
          semi: false,
        },
      },
      repo: {
        description: 'Test repo',
        keywords: ['test'],
      },
      versions: {
        node: '25.0.0',
        packageManager: '10.0.0',
      },
      environment: 'staging',
      git: {
        branch: 'develop',
      },
    });

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Secret Schemas (TASK 1)
// =============================================================================

describe('CloudflareSecretsSchema', () => {
  it('accepts valid cloudflare secrets', () => {
    const result = v.safeParse(CloudflareSecretsSchema, {
      CLOUDFLARE_API_TOKEN: 'cf-token-12345678',
      CLOUDFLARE_ACCOUNT_ID: 'abc123',
    });

    expect(result.success).toBe(true);
  });

  it('accepts with optional CLOUDFLARE_ZONE_ID', () => {
    const result = v.safeParse(CloudflareSecretsSchema, {
      CLOUDFLARE_API_TOKEN: 'cf-token-12345678',
      CLOUDFLARE_ACCOUNT_ID: 'abc123',
      CLOUDFLARE_ZONE_ID: 'zone-xyz',
    });

    expect(result.success).toBe(true);
  });

  it('rejects short API token (<8 chars)', () => {
    const result = v.safeParse(CloudflareSecretsSchema, {
      CLOUDFLARE_API_TOKEN: 'short',
      CLOUDFLARE_ACCOUNT_ID: 'abc123',
    });

    expect(result.success).toBe(false);
  });
});

describe('GitHubSecretsSchema', () => {
  it('accepts valid github secrets', () => {
    const result = v.safeParse(GitHubSecretsSchema, {
      GITHUB_PAT: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      GITHUB_OAUTH_CLIENT_ID: 'client-id',
      GITHUB_OAUTH_CLIENT_SECRET: 'client-secret',
    });

    expect(result.success).toBe(true);
  });
});

describe('GitLabSecretsSchema', () => {
  it('accepts valid gitlab secrets', () => {
    const result = v.safeParse(GitLabSecretsSchema, {
      GITLAB_TOKEN: 'glpat-xxxxxxxxxxxx',
      GITLAB_OAUTH_APP_ID: 'app-id',
      GITLAB_OAUTH_APP_SECRET: 'app-secret',
    });

    expect(result.success).toBe(true);
  });
});

describe('TurboSecretsSchema', () => {
  it('accepts valid turbo secrets', () => {
    const result = v.safeParse(TurboSecretsSchema, {
      TURBO_TOKEN: 'turbo-token-12345678',
      TURBO_TEAM: 'my-team',
    });

    expect(result.success).toBe(true);
  });
});

describe('DevEnvSecretsSchema', () => {
  it('accepts valid devenv secrets', () => {
    const result = v.safeParse(DevEnvSecretsSchema, {
      HETZNER_TOKEN: 'hetzner-token-12345678',
    });

    expect(result.success).toBe(true);
  });
});

describe('DatabaseSecretsSchema', () => {
  it('accepts valid database secrets', () => {
    const result = v.safeParse(DatabaseSecretsSchema, {
      D1_DATABASE_ID: 'db-id-123',
      KV_NAMESPACE_ID: 'kv-ns-456',
    });

    expect(result.success).toBe(true);
  });

  it('accepts with optional DATABASE_URL', () => {
    const result = v.safeParse(DatabaseSecretsSchema, {
      D1_DATABASE_ID: 'db-id-123',
      KV_NAMESPACE_ID: 'kv-ns-456',
      DATABASE_URL: 'postgres://user:pass@host:5432/db',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid DATABASE_URL protocol', () => {
    const result = v.safeParse(DatabaseSecretsSchema, {
      D1_DATABASE_ID: 'db-id-123',
      KV_NAMESPACE_ID: 'kv-ns-456',
      DATABASE_URL: 'http://not-a-database-url',
    });

    expect(result.success).toBe(false);
  });
});

describe('AuthSecretsSchema', () => {
  it('accepts valid auth secrets with 32+ char key', () => {
    const result = v.safeParse(AuthSecretsSchema, {
      API_SECRET_KEY: 'a'.repeat(32),
    });

    expect(result.success).toBe(true);
  });

  it('rejects short API_SECRET_KEY (<32 chars)', () => {
    const result = v.safeParse(AuthSecretsSchema, {
      API_SECRET_KEY: 'too-short',
    });

    expect(result.success).toBe(false);
  });

  it('accepts with optional JWT fields and duration strings', () => {
    const result = v.safeParse(AuthSecretsSchema, {
      API_SECRET_KEY: 'a'.repeat(32),
      JWT_SECRET: 'b'.repeat(32),
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid duration string format', () => {
    const result = v.safeParse(AuthSecretsSchema, {
      API_SECRET_KEY: 'a'.repeat(32),
      JWT_ACCESS_EXPIRY: 'invalid',
    });

    expect(result.success).toBe(false);
  });
});

describe('PaymentSecretsSchema', () => {
  it('accepts valid payment secrets', () => {
    const result = v.safeParse(PaymentSecretsSchema, {
      LEMON_SQUEEZY_API_KEY: 'ls-key-12345678',
    });

    expect(result.success).toBe(true);
  });
});

describe('RevenueCatSecretsSchema', () => {
  it('accepts valid revenuecat secrets', () => {
    const result = v.safeParse(RevenueCatSecretsSchema, {
      REVENUECAT_API_KEY: 'rc-key-12345678',
    });

    expect(result.success).toBe(true);
  });
});

describe('AnalyticsSecretsSchema', () => {
  it('accepts valid analytics secrets', () => {
    const result = v.safeParse(AnalyticsSecretsSchema, {
      POSTHOG_API_KEY: 'phc_xxxxxxxxxxxx',
    });

    expect(result.success).toBe(true);
  });
});

describe('EmailSecretsSchema', () => {
  it('accepts valid email secrets', () => {
    const result = v.safeParse(EmailSecretsSchema, {
      RESEND_API_KEY: 're_xxxxxxxxxxxx',
      GA_MEASUREMENT_ID: 'G-XXXXXXXXXX',
    });

    expect(result.success).toBe(true);
  });

  it('rejects RESEND_API_KEY without re_ prefix', () => {
    const result = v.safeParse(EmailSecretsSchema, {
      RESEND_API_KEY: 'no-prefix-key',
      GA_MEASUREMENT_ID: 'G-XXXXXXXXXX',
    });

    expect(result.success).toBe(false);
  });
});

describe('StatusSecretsSchema', () => {
  it('accepts valid status secrets', () => {
    const result = v.safeParse(StatusSecretsSchema, {
      STATUS_PAGE_TOKEN: 'sp-token-12345678',
    });

    expect(result.success).toBe(true);
  });
});

describe('StorageSecretsSchema', () => {
  it('accepts empty optional fields', () => {
    const result = v.safeParse(StorageSecretsSchema, {});

    expect(result.success).toBe(true);
  });

  it('accepts with all optional S3 fields', () => {
    const result = v.safeParse(StorageSecretsSchema, {
      S3_ACCESS_KEY_ID: 'AKIA...',
      S3_SECRET_ACCESS_KEY: 'secret-key-12345678',
      S3_BUCKET: 'my-bucket',
      S3_ENDPOINT: 'https://s3.example.com',
      S3_REGION: 'us-east-1',
    });

    expect(result.success).toBe(true);
  });
});

describe('GlobalSecretsSchema', () => {
  it('accepts valid combined global secrets', () => {
    const result = v.safeParse(GlobalSecretsSchema, {
      CLOUDFLARE_API_TOKEN: 'cf-token-12345678',
      CLOUDFLARE_ACCOUNT_ID: 'abc123',
      GITHUB_PAT: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      GITHUB_OAUTH_CLIENT_ID: 'client-id',
      GITHUB_OAUTH_CLIENT_SECRET: 'client-secret',
      TURBO_TOKEN: 'turbo-token-12345678',
      TURBO_TEAM: 'my-team',
      HETZNER_TOKEN: 'hetzner-token-12345678',
    });

    expect(result.success).toBe(true);
  });
});

describe('ProductSecretsSchema', () => {
  it('accepts valid combined product secrets', () => {
    const result = v.safeParse(ProductSecretsSchema, {
      D1_DATABASE_ID: 'db-id-123',
      KV_NAMESPACE_ID: 'kv-ns-456',
      API_SECRET_KEY: 'a'.repeat(32),
      LEMON_SQUEEZY_API_KEY: 'ls-key-12345678',
      REVENUECAT_API_KEY: 'rc-key-12345678',
      POSTHOG_API_KEY: 'phc_xxxxxxxxxxxx',
      RESEND_API_KEY: 're_xxxxxxxxxxxx',
      GA_MEASUREMENT_ID: 'G-XXXXXXXXXX',
      STATUS_PAGE_TOKEN: 'sp-token-12345678',
    });

    expect(result.success).toBe(true);
  });
});

describe('AllSecretsSchema', () => {
  it('accepts valid combined global + product secrets', () => {
    const result = v.safeParse(AllSecretsSchema, {
      CLOUDFLARE_API_TOKEN: 'cf-token-12345678',
      CLOUDFLARE_ACCOUNT_ID: 'abc123',
      GITHUB_PAT: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      GITHUB_OAUTH_CLIENT_ID: 'client-id',
      GITHUB_OAUTH_CLIENT_SECRET: 'client-secret',
      TURBO_TOKEN: 'turbo-token-12345678',
      TURBO_TEAM: 'my-team',
      HETZNER_TOKEN: 'hetzner-token-12345678',
      D1_DATABASE_ID: 'db-id-123',
      KV_NAMESPACE_ID: 'kv-ns-456',
      API_SECRET_KEY: 'a'.repeat(32),
      LEMON_SQUEEZY_API_KEY: 'ls-key-12345678',
      REVENUECAT_API_KEY: 'rc-key-12345678',
      POSTHOG_API_KEY: 'phc_xxxxxxxxxxxx',
      RESEND_API_KEY: 're_xxxxxxxxxxxx',
      GA_MEASUREMENT_ID: 'G-XXXXXXXXXX',
      STATUS_PAGE_TOKEN: 'sp-token-12345678',
    });

    expect(result.success).toBe(true);
  });
});

describe('Secret Schema Registries', () => {
  it('GLOBAL_SECRET_SCHEMAS has correct keys', () => {
    expect(Object.keys(GLOBAL_SECRET_SCHEMAS)).toEqual(
      expect.arrayContaining(['/cloudflare', '/turbo', '/devenv']),
    );
  });

  it('PRODUCT_SECRET_SCHEMAS has correct keys', () => {
    expect(Object.keys(PRODUCT_SECRET_SCHEMAS)).toEqual(
      expect.arrayContaining(['/api', '/auth', '/app', '/marketing', '/status', '/storage']),
    );
  });
});

// =============================================================================
// Product Schemas (TASK 2)
// =============================================================================

describe('ProductLayersSchema', () => {
  it('accepts valid layers with all 5 booleans', () => {
    const result = v.safeParse(ProductLayersSchema, {
      api: true,
      app: true,
      marketing: false,
      status: true,
      assets: false,
    });

    expect(result.success).toBe(true);
  });

  it('rejects with missing field', () => {
    const result = v.safeParse(ProductLayersSchema, {
      api: true,
      app: true,
      marketing: false,
      status: true,
    });

    expect(result.success).toBe(false);
  });
});

describe('ProductToolingOverridesSchema', () => {
  it('accepts empty object', () => {
    const result = v.safeParse(ProductToolingOverridesSchema, {});

    expect(result.success).toBe(true);
  });

  it('accepts with ci override', () => {
    const result = v.safeParse(ProductToolingOverridesSchema, {
      ci: { enabled: true },
    });

    expect(result.success).toBe(true);
  });
});

describe('ProductConfigSchema', () => {
  it('accepts valid product config', () => {
    const result = v.safeParse(ProductConfigSchema, {
      id: 'my-app',
      name: 'My App',
      layers: {
        api: true,
        app: true,
        marketing: true,
        status: true,
        assets: true,
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid id (uppercase)', () => {
    const result = v.safeParse(ProductConfigSchema, {
      id: 'MyApp',
      name: 'My App',
      layers: {
        api: true,
        app: true,
        marketing: true,
        status: true,
        assets: true,
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects id too short', () => {
    const result = v.safeParse(ProductConfigSchema, {
      id: 'a',
      name: 'My App',
      layers: {
        api: true,
        app: true,
        marketing: true,
        status: true,
        assets: true,
      },
    });

    expect(result.success).toBe(false);
  });

  it('fills defaults for optional fields', () => {
    const result = v.safeParse(ProductConfigSchema, {
      id: 'my-app',
      name: 'My App',
      layers: {
        api: true,
        app: true,
        marketing: true,
        status: true,
        assets: true,
      },
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.output.description).toBe('');
      expect(result.output.tooling).toEqual({});
      expect(result.output.features).toEqual({});
    }
  });
});

// =============================================================================
// Cross-field Validation (TASK 3)
// =============================================================================

describe('CoreConfigSchema (with v.check)', () => {
  it('accepts config where defaultLocale is in locales', () => {
    const result = v.safeParse(CoreConfigSchema, {
      company: {
        name: 'Test Co',
        domain: 'test.com',
        supportEmail: 'support@test.com',
      },
      products: [],
      locales: ['en', 'es'],
      defaultLocale: 'en',
    });

    expect(result.success).toBe(true);
  });

  it('rejects config where defaultLocale is not in locales', () => {
    const result = v.safeParse(CoreConfigSchema, {
      company: {
        name: 'Test Co',
        domain: 'test.com',
        supportEmail: 'support@test.com',
      },
      products: [],
      locales: ['en'],
      defaultLocale: 'fr',
    });

    expect(result.success).toBe(false);
  });
});

describe('BusinessSchema (with v.check)', () => {
  it('accepts business config where defaultLocale is in locales', () => {
    const result = v.safeParse(BusinessSchema, {
      company: {
        name: 'Test Co',
        domain: 'test.com',
        supportEmail: 'support@test.com',
      },
      products: [],
      locales: ['en', 'es'],
      defaultLocale: 'en',
    });

    expect(result.success).toBe(true);
  });

  it('rejects business config where defaultLocale is not in locales', () => {
    const result = v.safeParse(BusinessSchema, {
      company: {
        name: 'Test Co',
        domain: 'test.com',
        supportEmail: 'support@test.com',
      },
      products: [],
      locales: ['en'],
      defaultLocale: 'fr',
    });

    expect(result.success).toBe(false);
  });
});
