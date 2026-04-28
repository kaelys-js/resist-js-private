/**
 * Barrel re-export for the sparkles component — exposes the
 * Sparkles Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SparklesProps, SparklesPropsSchema } from './Sparkles.svelte';

export {
  Root,
  type SparklesProps,
  SparklesPropsSchema,
  //
  Root as Sparkles,
};
