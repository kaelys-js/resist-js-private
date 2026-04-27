/**
 * Barrel re-export for the chord-diagram component — exposes
 * the `ChordDiagram` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ChordDiagramProps, ChordDiagramPropsSchema } from './ChordDiagram.svelte';

export {
  Root,
  type ChordDiagramProps,
  ChordDiagramPropsSchema,
  //
  Root as ChordDiagram,
};
