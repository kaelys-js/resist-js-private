/**
 * Tests for CoreConfigSchema and sub-schemas.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

import { CoreConfigObjectSchema } from '@/schemas/core-config/config';
import { StandardEnvironmentSchema } from '@/schemas/core-config/environment';
import { PortOffsetSchema, PortIncrementSchema, LocalTldSchema, TabWidthSchema, PrintWidthSchema, ServiceNameSchema, PackageManagerTypeSchema } from '@/schemas/core-config/tooling';
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
