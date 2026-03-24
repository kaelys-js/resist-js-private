<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SlideOverPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SlideOverProps = v.InferOutput<typeof SlideOverPropsSchema>;
</script>

<script lang="ts">
  /**
   * SlideOver — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SlideOver />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SlideOverProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SlideOverProps = $derived.by(() => {
    const rawProps: SlideOverProps = stripSvelteProps(allProps);
    const result = safeParse(SlideOverPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SlideOverProps;
  });
</script>

<div data-slot="slide-over" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
