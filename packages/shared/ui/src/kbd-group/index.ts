/**
 * Barrel re-export for the kbd-group component — exposes the
 * KbdGroup Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type KbdGroupProps, KbdGroupPropsSchema } from './KbdGroup.svelte';

export {
  Root,
  type KbdGroupProps,
  KbdGroupPropsSchema,
  //
  Root as KbdGroup,
};
