/**
 * Barrel re-export for the intersection-observer component —
 * exposes the IntersectionObserver Svelte component, its
 * props type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type IntersectionObserverProps,
  IntersectionObserverPropsSchema,
} from './IntersectionObserver.svelte';

export {
  Root,
  type IntersectionObserverProps,
  IntersectionObserverPropsSchema,
  //
  Root as IntersectionObserver,
};
