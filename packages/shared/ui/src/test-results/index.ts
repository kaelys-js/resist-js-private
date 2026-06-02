/**
 * `@/ui` test-results — public barrel re-exporting the TestResults component,
 * its props type, and props schema.
 *
 * @module
 */
import Root, {
  type TestResultsProps,
  TestResultsPropsSchema,
} from './TestResults.svelte';

export {
  Root,
  type TestResultsProps,
  TestResultsPropsSchema,
  //
  Root as TestResults,
};
