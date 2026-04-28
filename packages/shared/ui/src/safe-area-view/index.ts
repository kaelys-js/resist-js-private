/**
 * Barrel re-export for the safe-area-view component —
 * exposes the SafeAreaView Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SafeAreaViewProps, SafeAreaViewPropsSchema } from './SafeAreaView.svelte';

export {
  Root,
  type SafeAreaViewProps,
  SafeAreaViewPropsSchema,
  //
  Root as SafeAreaView,
};
