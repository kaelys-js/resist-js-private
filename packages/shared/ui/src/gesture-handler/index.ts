/**
 * Barrel re-export for the gesture-handler component —
 * exposes the GestureHandler Svelte component, its props type,
 * and the props schema under stable public names.
 *
 * @module
 */

import Root, { type GestureHandlerProps, GestureHandlerPropsSchema } from './GestureHandler.svelte';

export {
  Root,
  type GestureHandlerProps,
  GestureHandlerPropsSchema,
  //
  Root as GestureHandler,
};
