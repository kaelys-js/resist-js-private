/**
 * Barrel re-export for the waveform component — exposes
 * the Waveform Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type WaveformProps, WaveformPropsSchema } from './Waveform.svelte';

export {
  Root,
  type WaveformProps,
  WaveformPropsSchema,
  //
  Root as Waveform,
};
