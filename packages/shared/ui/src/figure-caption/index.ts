/**
 * Barrel re-export for the figure-caption component — exposes
 * the FigureCaption Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FigureCaptionProps, FigureCaptionPropsSchema } from './FigureCaption.svelte';

export {
  Root,
  type FigureCaptionProps,
  FigureCaptionPropsSchema,
  //
  Root as FigureCaption,
};
