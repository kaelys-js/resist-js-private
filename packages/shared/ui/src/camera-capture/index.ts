/**
 * Barrel re-export for the camera-capture component — exposes
 * the `CameraCapture` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CameraCaptureProps, CameraCapturePropsSchema } from './CameraCapture.svelte';

export {
  Root,
  type CameraCaptureProps,
  CameraCapturePropsSchema,
  //
  Root as CameraCapture,
};
