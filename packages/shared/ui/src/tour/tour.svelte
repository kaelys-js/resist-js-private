<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TourPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TourProps = v.InferOutput<typeof TourPropsSchema>;
</script>

<script lang="ts">
  /**
   * Tour — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Tour />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TourProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TourProps = $derived.by(() => {
    const rawProps: TourProps = stripSvelteProps(allProps);
    const result = safeParse(TourPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TourProps;
  });
</script>

<div data-slot="tour" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
