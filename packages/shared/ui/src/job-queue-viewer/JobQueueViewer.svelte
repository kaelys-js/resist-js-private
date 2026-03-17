<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const JobQueueViewerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type JobQueueViewerProps = v.InferOutput<typeof JobQueueViewerPropsSchema>;
</script>

<script lang="ts">
  /**
   * JobQueueViewer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <JobQueueViewer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = JobQueueViewerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: JobQueueViewerProps = $derived.by(() => {
    const rawProps: JobQueueViewerProps = stripSvelteProps(allProps);
    const result = safeParse(JobQueueViewerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as JobQueueViewerProps;
  });
</script>

<div data-slot="job-queue-viewer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
