/**
 * Public types/values for the PropsTable component.
 *
 * Defined in a regular `.ts` file so consumers can re-export them via
 * standard TS module resolution, sidestepping the wildcard `*.svelte`
 * ambient declaration in `src/svelte.d.ts`.
 *
 * @module
 */

import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';
import { PropMetaSchema } from '../lens/types.js';

/** Sort column identifier for PropsTable header sorting. */
export type PropsTableSortColumn =
  | 'name'
  | 'required'
  | 'type'
  | 'accepts'
  | 'default'
  | 'description';

/** Sort direction for PropsTable header sorting. */
export type PropsTableSortDirection = 'asc' | 'desc' | 'none';

export const PropsTablePropsSchema = v.strictObject({
  /** Array of prop metadata to render. @values [{name: "variant", type: "Str", default: "default", description: "Visual style", bindable: false}] */
  props: v.array(PropMetaSchema),
  /** Variant key names — props matching these get a "See variants" action. @values variant, size, disabled */
  variantKeys: v.optional(v.array(StrSchema)),
  /** Additional CSS classes for the root element. @values mt-4, space-y-2 */
  class: v.optional(StrSchema),
  /** Callback when a sortable column header is clicked. @values (column, direction) => void */
  onsort: v.optional(
    v.custom<(column: PropsTableSortColumn, direction: PropsTableSortDirection) => void>(
      () => true,
    ),
  ),
  /** Currently sorted column for header indicator display. @values name, required, type, accepts, default, description */
  sortColumn: v.optional(
    v.nullable(v.picklist(['name', 'required', 'type', 'accepts', 'default', 'description'])),
  ),
  /** Current sort direction for header indicator display. @values asc, desc, none */
  sortDirection: v.optional(v.picklist(['asc', 'desc', 'none'])),
});
/** Props for the PropsTable component. */
export type PropsTableProps = v.InferOutput<typeof PropsTablePropsSchema>;
