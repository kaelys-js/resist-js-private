<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ActivityBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ActivityBarProps = v.InferOutput<typeof ActivityBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * ActivityBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ActivityBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ActivityBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ActivityBarProps = $derived.by(() => {
    const rawProps: ActivityBarProps = stripSvelteProps(allProps);
    const result = safeParse(ActivityBarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ActivityBarProps;
  });
</script>

<div data-slot="activity-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
