/**
 * Valibot schemas and types for the Lens automated component documentation system.
 *
 * These schemas define the metadata structures extracted from component source
 * files at runtime — props, TV variants, and example definitions.
 */
import * as v from 'valibot';

/**
 * A single field within a resolved type definition, for display in tooltips.
 *
 * Used when a prop type resolves to an object schema — each field gets its own
 * row in a mini-table inside the type tooltip.
 */
export const TypeFieldSchema = v.strictObject({
	/** The field name (e.g., `category`, `tags`). */
	field: v.string(),
	/** Human-readable description of accepted values (e.g., "text", "display, form, layout, ..."). */
	accepts: v.string(),
	/** JSDoc description from the schema field comment. */
	description: v.string(),
});
export type TypeField = v.InferOutput<typeof TypeFieldSchema>;

/**
 * Metadata for a single component prop, extracted from a `$props()` block.
 *
 * @example
 * ```typescript
 * const meta: PropMeta = {
 *   name: 'variant',
 *   type: "'default' | 'secondary' | 'destructive'",
 *   default: "'default'",
 *   description: 'The visual style variant.',
 *   bindable: false,
 * };
 * ```
 */
export const PropMetaSchema = v.strictObject({
	/** The prop name as it appears in the destructuring (e.g., `variant`, `size`). */
	name: v.string(),
	/** The TypeScript type annotation or inferred type (e.g., `Str`, `boolean`). */
	type: v.string(),
	/** The default value as a source string, or empty if no default. */
	default: v.string(),
	/** JSDoc description from the comment above the prop, or empty. */
	description: v.string(),
	/** Whether the prop uses `$bindable()`. */
	bindable: v.boolean(),
	/** Full resolved type definition body, if available (e.g. the actual union values). */
	typeDefinition: v.optional(v.string()),
	/** Structured type fields for tooltip display, if the type resolves to an object schema. */
	typeFields: v.optional(v.array(TypeFieldSchema)),
	/** Explicit mock values from `@values` JSDoc tag for variant generation. */
	mockValues: v.optional(v.array(v.string())),
});
export type PropMeta = v.InferOutput<typeof PropMetaSchema>;

/**
 * Metadata for a single TV (tailwind-variants) variant key.
 *
 * @example
 * ```typescript
 * const meta: VariantKeyMeta = {
 *   key: 'variant',
 *   options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
 *   default: 'default',
 * };
 * ```
 */
export const VariantKeyMetaSchema = v.strictObject({
	/** The variant key name (e.g., `variant`, `size`). */
	key: v.string(),
	/** All available option values for this variant key. */
	options: v.array(v.string()),
	/** The default value from `defaultVariants`, or empty. */
	default: v.string(),
});
export type VariantKeyMeta = v.InferOutput<typeof VariantKeyMetaSchema>;

/**
 * Complete TV variant metadata extracted from a `tv()` call.
 */
export const VariantMetaSchema = v.strictObject({
	/** All variant keys and their options. */
	variants: v.array(VariantKeyMetaSchema),
});
export type VariantMeta = v.InferOutput<typeof VariantMetaSchema>;

/**
 * Metadata for a single example in a compound component's `lens.ts`.
 *
 * @example
 * ```typescript
 * const example: LensExample = {
 *   name: 'basic',
 *   title: 'Basic Dialog',
 *   description: 'A simple dialog with title and close button.',
 * };
 * ```
 */
export const LensExampleSchema = v.strictObject({
	/** Filename stem matching `examples/<name>.svelte` (e.g., `basic`, `with-form`). */
	name: v.string(),
	/** Human-readable title for the example section. */
	title: v.string(),
	/** Optional description shown below the title. */
	description: v.optional(v.string(), ''),
});
export type LensExample = v.InferOutput<typeof LensExampleSchema>;

/**
 * Component category for sidebar grouping and filtering.
 */
export const LensCategorySchema = v.picklist([
	'display',
	'form',
	'layout',
	'lens',
	'navigation',
	'overlay',
	'utility',
]);
export type LensCategory = v.InferOutput<typeof LensCategorySchema>;

/**
 * Per-component metadata exported from each component's `lens.ts`.
 *
 * Provides category, tags, and description for the Lens documentation
 * sidebar grouping, search, and component page badges.
 *
 * @example
 * ```typescript
 * const meta: LensMeta = {
 *   category: 'form',
 *   tags: ['shadcn', 'tv-variant'],
 *   description: 'Clickable button with multiple style variants and sizes.',
 * };
 * ```
 */
export const LensMetaSchema = v.strictObject({
	/** Sidebar grouping category. */
	category: LensCategorySchema,
	/** Freeform tags for search and badge display (at least one required). */
	tags: v.pipe(v.array(v.string()), v.minLength(1)),
	/** Short component description for search and page header. */
	description: v.string(),
});
export type LensMeta = v.InferOutput<typeof LensMetaSchema>;

/**
 * Sidebar category group — a named category with its component list.
 *
 * Used by the Lens layout sidebar to render collapsible category sections.
 *
 * @example
 * ```typescript
 * const group: CategoryGroup = {
 *   name: 'form',
 *   label: 'Form',
 *   components: ['button', 'input', 'select'],
 * };
 * ```
 */
export const CategoryGroupSchema = v.strictObject({
	/** Category key matching LensCategory values. */
	name: v.string(),
	/** Title-cased display label. */
	label: v.string(),
	/** Sorted list of component directory names in this category. */
	components: v.array(v.string()),
});
export type CategoryGroup = v.InferOutput<typeof CategoryGroupSchema>;
