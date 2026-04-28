/**
 * Barrel re-export for the job-queue-viewer component —
 * exposes the JobQueueViewer Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type JobQueueViewerProps, JobQueueViewerPropsSchema } from './JobQueueViewer.svelte';

export {
  Root,
  type JobQueueViewerProps,
  JobQueueViewerPropsSchema,
  //
  Root as JobQueueViewer,
};
