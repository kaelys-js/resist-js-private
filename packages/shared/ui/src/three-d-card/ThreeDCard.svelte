<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ThreeDCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ThreeDCardProps = v.InferOutput<typeof ThreeDCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * ThreeDCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ThreeDCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ThreeDCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ThreeDCardProps = $derived.by(() => {
    const rawProps: ThreeDCardProps = stripSvelteProps(allProps);
    const result = safeParse(ThreeDCardPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ThreeDCardProps;
  });
</script>

<div data-slot="three-d-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
