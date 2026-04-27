/**
 * Barrel re-export for the console-output component — exposes
 * the `ConsoleOutput` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ConsoleOutputProps, ConsoleOutputPropsSchema } from './ConsoleOutput.svelte';

export {
  Root,
  type ConsoleOutputProps,
  ConsoleOutputPropsSchema,
  //
  Root as ConsoleOutput,
};
