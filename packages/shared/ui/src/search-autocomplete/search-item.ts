/**
 * Schema and type for search autocomplete items.
 *
 * @module
 */
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';

/**
 * Schema for a single autocomplete search item.
 *
 * Each item can optionally navigate via `href` or be grouped under a heading.
 */
export const SearchItemSchema = v.strictObject({
  /** Unique identifier for the item, also used as the filter key. */
  value: StrSchema,
  /** Display label shown in the dropdown. */
  label: StrSchema,
  /** Optional navigation URL — selects the item and follows the link. */
  href: v.optional(StrSchema),
  /** Optional group heading for categorization. */
  group: v.optional(StrSchema),
  /** Optional search keywords for filtering (not displayed). */
  keywords: v.optional(v.array(StrSchema)),
});

/** A single autocomplete search item. */
export type SearchItem = v.InferOutput<typeof SearchItemSchema>;
