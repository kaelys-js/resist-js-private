/**
 * Barrel re-export for the cursor-presence component — exposes
 * the `CursorPresence` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type CursorPresenceProps, CursorPresencePropsSchema } from './CursorPresence.svelte';

export {
  Root,
  type CursorPresenceProps,
  CursorPresencePropsSchema,
  //
  Root as CursorPresence,
};
