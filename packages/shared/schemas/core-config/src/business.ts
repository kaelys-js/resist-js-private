/**
 * Business Schemas
 *
 * Valibot schemas for business configuration: company, products, billing, locales.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Primitive Schemas
// =============================================================================

/**
 * Valid domain name (hostname without protocol).
 * Examples: "example.com", "sub.example.co.uk"
 */
export const DomainSchema = v.pipe(
  v.string(),
  v.maxLength(253),
  v.regex(/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i, 'Must be valid domain (e.g., "example.com")'),
);

/** Inferred output type of {@link DomainSchema}. A valid domain name string. */
export type Domain = v.InferOutput<typeof DomainSchema>;

/**
 * Common SPDX license identifiers.
 *
 * This is a curated subset of the most commonly used licenses, not the full
 * SPDX list (~500+ identifiers). Covers permissive, copyleft, creative commons,
 * and proprietary options.
 *
 * @see https://spdx.org/licenses/
 */
export const SpdxLicenseSchema = v.picklist([
  // Permissive
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'BSL-1.0',
  'Zlib',
  'Artistic-2.0',

  // Copyleft — GPL
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL-3.0-only',

  // Copyleft — LGPL
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',

  // Weak copyleft
  'MPL-2.0',
  'EUPL-1.2',

  // Creative Commons
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',

  // Public domain / no restrictions
  'Unlicense',
  'WTFPL',

  // Proprietary (not an SPDX identifier — project-specific)
  'PROPRIETARY',
]);

/** Inferred output type of {@link SpdxLicenseSchema}. One of the supported SPDX identifiers. */
export type SpdxLicense = v.InferOutput<typeof SpdxLicenseSchema>;

// =============================================================================
// Company Emails
// =============================================================================

/**
 * Valibot schema for company email addresses used across tooling.
 * All fields are optional — only set the ones you need.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(CompanyEmailsSchema, {
 *   npm: 'dev@example.com',
 *   security: 'security@example.com',
 * });
 * ```
 */
export const CompanyEmailsSchema = v.strictObject({
  /** Email for package author */
  npm: v.optional(v.pipe(v.string(), v.email())),
  /** Support email (defaults to supportEmail if not set) */
  support: v.optional(v.pipe(v.string(), v.email())),
  /** Security disclosure email */
  security: v.optional(v.pipe(v.string(), v.email())),
});

/** Inferred output type of {@link CompanyEmailsSchema}. */
export type CompanyEmails = v.InferOutput<typeof CompanyEmailsSchema>;

// =============================================================================
// Company Domains
// =============================================================================

/**
 * Valibot schema for company-wide service domains.
 * These override the default subdomain convention for specific services.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(CompanyDomainsSchema, {
 *   marketing: 'acme.com',
 *   docs: 'docs.acme.com',
 *   status: 'status.acme.com',
 * });
 * ```
 */
export const CompanyDomainsSchema = v.strictObject({
  /** Marketing/homepage domain */
  marketing: v.optional(DomainSchema),
  /** Documentation domain */
  docs: v.optional(DomainSchema),
  /** Status page domain */
  status: v.optional(DomainSchema),
});

/** Inferred output type of {@link CompanyDomainsSchema}. */
export type CompanyDomains = v.InferOutput<typeof CompanyDomainsSchema>;

// =============================================================================
// Company
// =============================================================================

/**
 * Valibot schema for company/business identity.
 * Validates name, primary domain, support email, license, and optional
 * email/domain overrides.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(CompanySchema, {
 *   name: 'Acme Inc',
 *   domain: 'acme.com',
 *   supportEmail: 'support@acme.com',
 *   license: 'MIT',
 * });
 * ```
 */
export const CompanySchema = v.strictObject({
  /** Company/business name */
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  /** Primary domain (e.g., "example.com") */
  domain: DomainSchema,
  /** Support email address */
  supportEmail: v.pipe(v.string(), v.email()),
  /** License type (e.g., "MIT", "Apache-2.0") */
  license: v.optional(SpdxLicenseSchema, 'MIT'),
  /** Company emails for various purposes */
  emails: v.optional(CompanyEmailsSchema, {}),
  /** Company domains for various services */
  domains: v.optional(CompanyDomainsSchema, {}),
});

/** Inferred output type of {@link CompanySchema}. */
export type Company = v.InferOutput<typeof CompanySchema>;

// =============================================================================
// Products
// =============================================================================

/**
 * Valibot schema for a single product in the monorepo.
 * Each product has a unique kebab-case `id`, a display `name`,
 * and an optional custom `domain`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(ProductSchema, {
 *   id: 'my-app',
 *   name: 'My App',
 *   domain: 'myapp.com',
 * });
 * ```
 */
export const ProductSchema = v.strictObject({
  /** Unique product identifier (kebab-case) */
  id: v.pipe(v.string(), v.minLength(2), v.maxLength(50), v.regex(/^[a-z][a-z0-9-]*$/)),
  /** Display name */
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  /** Product-specific domain (optional, defaults to subdomain of company domain) */
  domain: v.optional(DomainSchema),
});

/** Inferred output type of {@link ProductSchema}. */
export type Product = v.InferOutput<typeof ProductSchema>;

// =============================================================================
// Locales
// =============================================================================

/**
 * BCP-47 locale tag in short form (`ll` or `ll-CC`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * safeParse(LocaleSchema, 'en');    // ok: true
 * safeParse(LocaleSchema, 'es-MX'); // ok: true
 * safeParse(LocaleSchema, 'EN');    // ok: false — must be lowercase language code
 * ```
 */
export const LocaleSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z]{2}(-[A-Z]{2})?$/), // e.g., "en", "en-US", "es", "es-MX"
);

/** Inferred output type of {@link LocaleSchema}. A BCP-47 locale string. */
export type Locale = v.InferOutput<typeof LocaleSchema>;

// =============================================================================
// Business Config (composed)
// =============================================================================

/**
 * Raw strict object for the business section (used by {@link CoreConfigSchema}
 * to access individual `.entries` for field spreading).
 *
 * @internal
 */
export const BusinessObjectSchema = v.strictObject({
  /** Company information */
  company: CompanySchema,
  /** List of products */
  products: v.array(ProductSchema),
  /** Supported locales */
  locales: v.pipe(v.array(LocaleSchema), v.minLength(1)),
  /** Default locale (must be in locales array) */
  defaultLocale: LocaleSchema,
});

/**
 * Valibot schema for the business section of the root config.
 * Combines company identity, product catalog, and i18n locale settings.
 *
 * Wraps {@link BusinessObjectSchema} with a cross-field check ensuring
 * `defaultLocale` is included in the `locales` array.
 *
 * The fields from this schema are spread directly into {@link CoreConfigSchema}
 * (they are not nested under a `business` key).
 *
 * Note: The `defaultLocale ∈ locales` check is also present in {@link CoreConfigSchema}
 * (which spreads entries from {@link BusinessObjectSchema}, not this schema).
 * This check exists here for standalone validation of business config.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(BusinessSchema, {
 *   company: { name: 'Acme', domain: 'acme.com', supportEmail: 'hi@acme.com' },
 *   products: [{ id: 'app', name: 'Acme App' }],
 *   locales: ['en', 'es'],
 *   defaultLocale: 'en',
 * });
 * ```
 */
export const BusinessSchema = v.pipe(
  BusinessObjectSchema,
  v.check(
    (input: v.InferOutput<typeof BusinessObjectSchema>) =>
      input.locales.includes(input.defaultLocale),
    'defaultLocale must be included in the locales array',
  ),
);

/** Inferred output type of {@link BusinessSchema}. */
export type Business = v.InferOutput<typeof BusinessSchema>;
