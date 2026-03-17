<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ScrollVelocityPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ScrollVelocityProps = v.InferOutput<typeof ScrollVelocityPropsSchema>;
</script>

<script lang="ts">
  /**
   * ScrollVelocity — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ScrollVelocity />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ScrollVelocityProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ScrollVelocityProps = $derived.by(() => {
    const rawProps: ScrollVelocityProps = stripSvelteProps(allProps);
    const result = safeParse(ScrollVelocityPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ScrollVelocityProps;
  });
</script>

<div data-slot="scroll-velocity" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
