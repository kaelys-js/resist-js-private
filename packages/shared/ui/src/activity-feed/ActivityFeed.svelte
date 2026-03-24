<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ActivityFeedPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ActivityFeedProps = v.InferOutput<typeof ActivityFeedPropsSchema>;
</script>

<script lang="ts">
  /**
   * ActivityFeed — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ActivityFeed />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ActivityFeedProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ActivityFeedProps = $derived.by(() => {
    const rawProps: ActivityFeedProps = stripSvelteProps(allProps);
    const result = safeParse(ActivityFeedPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ActivityFeedProps;
  });
</script>

<div data-slot="activity-feed" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
