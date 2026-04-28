/**
 * Barrel re-export for the kbd component — exposes the Kbd
 * Svelte component, its props type / schema, the TV variants
 * helper, and the key-symbol map under stable public names.
 *
 * @module
 */

import Root, { type KbdProps, KbdPropsSchema, kbdVariants, KEY_SYMBOLS } from './Kbd.svelte';

export {
  Root,
  type KbdProps,
  KbdPropsSchema,
  kbdVariants,
  KEY_SYMBOLS,
  //
  Root as Kbd,
};
