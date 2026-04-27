/**
 * Barrel re-export for the container component — exposes the
 * `Container` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ContainerProps, ContainerPropsSchema } from './Container.svelte';

export {
  Root,
  type ContainerProps,
  ContainerPropsSchema,
  //
  Root as Container,
};
