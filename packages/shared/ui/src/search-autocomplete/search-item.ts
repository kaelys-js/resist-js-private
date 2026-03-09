/**
 * Schema and type for search autocomplete items.
 *
 * @module
 */
import * as v from 'valibot';

/**
 * Schema for a single autocomplete search item.
 *
 * Each item can optionally navigate via `href` or be grouped under a heading.
 */
export const SearchItemSchema = v.strictObject({
	/** Unique identifier for the item, also used as the filter key. */
	value: v.string(),
	/** Display label shown in the dropdown. */
	label: v.string(),
	/** Optional navigation URL — selects the item and follows the link. */
	href: v.optional(v.string()),
	/** Optional group heading for categorization. */
	group: v.optional(v.string()),
});

/** A single autocomplete search item. */
export type SearchItem = v.InferOutput<typeof SearchItemSchema>;
