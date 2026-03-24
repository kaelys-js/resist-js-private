<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LiveIndicatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LiveIndicatorProps = v.InferOutput<typeof LiveIndicatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * LiveIndicator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LiveIndicator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LiveIndicatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LiveIndicatorProps = $derived.by(() => {
    const rawProps: LiveIndicatorProps = stripSvelteProps(allProps);
    const result = safeParse(LiveIndicatorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LiveIndicatorProps;
  });
</script>

<div data-slot="live-indicator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
