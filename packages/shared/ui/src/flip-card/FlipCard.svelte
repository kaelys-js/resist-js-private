<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FlipCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type FlipCardProps = v.InferOutput<typeof FlipCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * FlipCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FlipCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FlipCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FlipCardProps = $derived.by(() => {
    const rawProps: FlipCardProps = stripSvelteProps(allProps);
    const result = safeParse(FlipCardPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FlipCardProps;
  });
</script>

<div data-slot="flip-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
