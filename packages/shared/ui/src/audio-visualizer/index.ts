/**
 * Barrel re-export for the audio-visualizer component — exposes
 * the `AudioVisualizer` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AudioVisualizerProps,
  AudioVisualizerPropsSchema,
} from './AudioVisualizer.svelte';

export {
  Root,
  type AudioVisualizerProps,
  AudioVisualizerPropsSchema,
  //
  Root as AudioVisualizer,
};
