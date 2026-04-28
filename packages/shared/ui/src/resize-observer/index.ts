/**
 * Barrel re-export for the resize-observer component —
 * exposes the ResizeObserver Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ResizeObserverProps, ResizeObserverPropsSchema } from './ResizeObserver.svelte';

export {
  Root,
  type ResizeObserverProps,
  ResizeObserverPropsSchema,
  //
  Root as ResizeObserver,
};
