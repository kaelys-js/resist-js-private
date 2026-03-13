/**
 * Valibot schemas and types for the Lens automated component documentation system.
 *
 * These schemas define the metadata structures extracted from component source
 * files at runtime — props, TV variants, and example definitions.
 */
import * as v from 'valibot';
import { StrSchema, BoolSchema } from '@/schemas/common';

/**
 * A single field within a resolved type definition, for display in tooltips.
 *
 * Used when a prop type resolves to an object schema — each field gets its own
 * row in a mini-table inside the type tooltip.
 */
export const TypeFieldSchema: v.GenericSchema<TypeField> = v.strictObject({
  /** The field name (e.g., `category`, `tags`). */
  field: StrSchema,
  /** Resolved type string for the field (e.g., `Str`, `Bool`, `'a' | 'b'`). */
  type: StrSchema,
  /** Whether the field is required (not wrapped in `v.optional()`). */
  required: BoolSchema,
  /** Human-readable description of accepted values (e.g., "text", "display, form, layout, ..."). */
  accepts: StrSchema,
  /** JSDoc description from the schema field comment. */
  description: StrSchema,
  /** Explicit mock values from `@values` JSDoc tag for variant generation. */
  mockValues: v.optional(v.array(StrSchema)),
  /** Nested type fields for recursive expansion (e.g., array-of-object sub-fields). */
  typeFields: v.optional(v.lazy((): v.GenericSchema<TypeField[]> => v.array(TypeFieldSchema))),
});
/** A single field within a resolved type definition. */
export type TypeField = {
  /** The field name. */
  field: string;
  /** Resolved type string. */
  type: string;
  /** Whether required. */
  required: boolean;
  /** Human-readable accepted values. */
  accepts: string;
  /** JSDoc description. */
  description: string;
  /** Explicit mock values from `@values` JSDoc tag. */
  mockValues?: string[];
  /** Nested type fields for recursive expansion. */
  typeFields?: TypeField[];
};

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
  name: StrSchema,
  /** The TypeScript type annotation or inferred type (e.g., `Str`, `boolean`). */
  type: StrSchema,
  /** The default value as a source string, or empty if no default. */
  default: StrSchema,
  /** JSDoc description from the comment above the prop, or empty. */
  description: StrSchema,
  /** Whether the prop uses `$bindable()`. */
  bindable: BoolSchema,
  /** Full resolved type definition body, if available (e.g. the actual union values). */
  typeDefinition: v.optional(StrSchema),
  /** Structured type fields for tooltip display, if the type resolves to an object schema. */
  typeFields: v.optional(v.array(TypeFieldSchema)),
  /** Explicit mock values from `@values` JSDoc tag for variant generation. */
  mockValues: v.optional(v.array(StrSchema)),
  /** Whether the prop is optional (from `v.optional()` or `?:` in type). */
  optional: v.optional(BoolSchema),
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
  key: StrSchema,
  /** All available option values for this variant key. */
  options: v.array(StrSchema),
  /** The default value from `defaultVariants`, or empty. */
  default: StrSchema,
  /** Coercion hint for the renderer — how to convert string options to the expected type. */
  coerce: v.optional(v.picklist(['array', 'record-value'])),
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
  name: StrSchema,
  /** Human-readable title for the example section. */
  title: StrSchema,
  /** Optional description shown below the title. */
  description: v.optional(StrSchema, ''),
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
/**
 * Component lifecycle status for sidebar badges.
 *
 * - 'new' — recently added
 * - 'updated' — recently changed
 * - 'deprecated' — scheduled for removal
 */
export const LensStatusSchema = v.picklist(['new', 'updated', 'deprecated']);
export type LensStatus = v.InferOutput<typeof LensStatusSchema>;

/**
 * A single breaking change entry for a component.
 *
 * Records a specific breaking API change with optional migration guidance
 * and a "since" marker (version, date, or commit) for traceability.
 */
export const BreakingChangeSchema = v.strictObject({
  /** What changed (e.g. "Removed `size` prop"). */
  change: StrSchema,
  /** Migration guidance (e.g. "Use `dimensions` prop instead"). */
  migration: v.optional(StrSchema),
  /** Version, date, or commit when the change was introduced. */
  since: v.optional(StrSchema),
});
/** A single breaking change entry. */
export type BreakingChange = v.InferOutput<typeof BreakingChangeSchema>;

export const LensMetaSchema = v.strictObject({
  /** Sidebar grouping category. */
  category: LensCategorySchema,
  /** Freeform tags for search and badge display (at least one required). */
  tags: v.pipe(v.array(StrSchema), v.minLength(1)),
  /** Short component description for search and page header. */
  description: StrSchema,
  /** Optional lifecycle status badge shown in sidebar. @values 'new', 'updated', 'deprecated' */
  status: v.optional(LensStatusSchema),
  /** Optional list of breaking changes with migration notes. */
  breakingChanges: v.optional(v.array(BreakingChangeSchema)),
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
  name: StrSchema,
  /** Title-cased display label. */
  label: StrSchema,
  /** Sorted list of component directory names in this category. */
  components: v.array(StrSchema),
});
export type CategoryGroup = v.InferOutput<typeof CategoryGroupSchema>;
