<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PullToRefresh Svelte component — mobile gesture wrapper
   * that triggers a refresh when the user pulls past a
   * threshold. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PullToRefreshPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PullToRefresh. */
  export type PullToRefreshProps = v.InferOutput<typeof PullToRefreshPropsSchema>;
</script>

<script lang="ts">
  /**
   * PullToRefresh — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PullToRefresh />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PullToRefreshProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PullToRefreshProps = $derived.by(() => {
    const rawProps: PullToRefreshProps = stripSvelteProps(allProps);
    const result = safeParse(PullToRefreshPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PullToRefreshProps;
  });
</script>

<div data-slot="pull-to-refresh" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
