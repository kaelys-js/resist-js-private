/**
 * Product Config Schema
 *
 * Valibot schema for per-product configuration files.
 * Products use thin metadata (identity, layers) plus selective
 * overrides of global config sections.
 *
 * @module
 */

import * as v from 'valibot';

import { CiSchema } from '@/schemas/core-config/tooling';

// =============================================================================
// Product Layers
// =============================================================================

/**
 * Valibot schema for product layers (services).
 *
 * Every product must declare which layers/services it uses.
 * All fields are required — explicitly enable or disable each.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 *
 * const result = safeParse(ProductLayersSchema, {
 *   api: true,
 *   app: true,
 *   marketing: true,
 *   status: true,
 *   assets: true,
 * });
 * ```
 */
export const ProductLayersSchema = v.strictObject({
  /** API layer (Cloudflare Workers). */
  api: v.boolean(),
  /** Product application (SvelteKit + Capacitor). */
  app: v.boolean(),
  /** Public-facing marketing site. */
  marketing: v.boolean(),
  /** Status page service. */
  status: v.boolean(),
  /** Static assets layer. */
  assets: v.boolean(),
});

/** Inferred output type of {@link ProductLayersSchema}. */
export type ProductLayers = v.InferOutput<typeof ProductLayersSchema>;

// =============================================================================
// Product Tooling Overrides
// =============================================================================

/**
 * Valibot schema for product-specific tooling overrides.
 *
 * Only a subset of global tooling settings can be overridden per-product.
 * All fields are optional — omitted fields inherit from global config.
 */
export const ProductToolingOverridesSchema = v.strictObject({
  /** Override CI runner size per-product. */
  ci: v.optional(CiSchema),
});

/** Inferred output type of {@link ProductToolingOverridesSchema}. */
export type ProductToolingOverrides = v.InferOutput<typeof ProductToolingOverridesSchema>;

// =============================================================================
// Product Config
// =============================================================================

/**
 * Valibot schema for a product's configuration file.
 *
 * Each product's `config/src/index.ts` exports a config matching this schema.
 * The product config provides identity (id, name), declares which layers
 * are enabled, and optionally overrides specific global tooling settings.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 *
 * const result = safeParse(ProductConfigSchema, {
 *   id: 'my-app',
 *   name: 'My App',
 *   description: 'Consumer-facing application',
 *   layers: {
 *     api: true,
 *     app: true,
 *     marketing: true,
 *     status: true,
 *     assets: true,
 *   },
 * });
 * ```
 */
export const ProductConfigSchema = v.strictObject({
  /** Unique product identifier (kebab-case, matches directory name). */
  id: v.pipe(v.string(), v.minLength(2), v.maxLength(50), v.regex(/^[a-z][a-z0-9-]*$/)),
  /** Human-readable product display name. */
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  /** Product description. */
  description: v.optional(v.pipe(v.string(), v.maxLength(500)), ''),
  /** Product-specific domain (optional, defaults to subdomain of company domain). */
  domain: v.optional(
    v.pipe(v.string(), v.maxLength(253), v.regex(/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i)),
  ),
  /** Which layers/services this product uses (all required). */
  layers: ProductLayersSchema,
  /** Selective overrides of global tooling settings. */
  tooling: v.optional(ProductToolingOverridesSchema, {}),
  /** Product-specific feature flags and settings (open schema). */
  features: v.optional(v.looseObject({}), {}),
});

/** Inferred output type of {@link ProductConfigSchema}. */
export type ProductConfig = v.InferOutput<typeof ProductConfigSchema>;
