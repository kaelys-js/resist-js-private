<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TransitionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TransitionProps = v.InferOutput<typeof TransitionPropsSchema>;
</script>

<script lang="ts">
  /**
   * Transition — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Transition />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TransitionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TransitionProps = $derived.by(() => {
    const rawProps: TransitionProps = stripSvelteProps(allProps);
    const result = safeParse(TransitionPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TransitionProps;
  });
</script>

<div data-slot="transition" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
