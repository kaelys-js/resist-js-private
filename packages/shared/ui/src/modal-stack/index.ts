/**
 * Barrel re-export for the modal-stack component — exposes
 * the ModalStack Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ModalStackProps, ModalStackPropsSchema } from './ModalStack.svelte';

export {
  Root,
  type ModalStackProps,
  ModalStackPropsSchema,
  //
  Root as ModalStack,
};
