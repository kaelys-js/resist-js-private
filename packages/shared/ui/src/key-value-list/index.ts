/**
 * Barrel re-export for the key-value-list component — exposes
 * the KeyValueList Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type KeyValueListProps, KeyValueListPropsSchema } from './KeyValueList.svelte';

export {
  Root,
  type KeyValueListProps,
  KeyValueListPropsSchema,
  //
  Root as KeyValueList,
};
