/**
 * Barrel re-export for the quiz component — exposes the Quiz
 * Svelte component, its props type, and the props schema
 * under stable public names.
 *
 * @module
 */

import Root, { type QuizProps, QuizPropsSchema } from './Quiz.svelte';

export {
  Root,
  type QuizProps,
  QuizPropsSchema,
  //
  Root as Quiz,
};
