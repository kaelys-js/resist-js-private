/**
 * Barrel re-export for the svg-icon component — exposes the
 * SvgIcon Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SvgIconProps, SvgIconPropsSchema } from './SvgIcon.svelte';

export {
  Root,
  type SvgIconProps,
  SvgIconPropsSchema,
  //
  Root as SvgIcon,
};
