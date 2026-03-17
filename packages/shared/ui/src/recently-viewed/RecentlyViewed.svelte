<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RecentlyViewedPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type RecentlyViewedProps = v.InferOutput<typeof RecentlyViewedPropsSchema>;
</script>

<script lang="ts">
  /**
   * RecentlyViewed — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RecentlyViewed />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RecentlyViewedProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RecentlyViewedProps = $derived.by(() => {
    const rawProps: RecentlyViewedProps = stripSvelteProps(allProps);
    const result = safeParse(RecentlyViewedPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RecentlyViewedProps;
  });
</script>

<div data-slot="recently-viewed" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
