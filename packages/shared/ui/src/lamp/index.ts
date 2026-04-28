/**
 * Barrel re-export for the lamp component — exposes the Lamp
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type LampProps, LampPropsSchema } from './Lamp.svelte';

export {
  Root,
  type LampProps,
  LampPropsSchema,
  //
  Root as Lamp,
};
