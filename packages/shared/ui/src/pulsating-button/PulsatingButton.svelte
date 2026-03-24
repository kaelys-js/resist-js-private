<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PulsatingButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PulsatingButtonProps = v.InferOutput<typeof PulsatingButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * PulsatingButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PulsatingButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PulsatingButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PulsatingButtonProps = $derived.by(() => {
    const rawProps: PulsatingButtonProps = stripSvelteProps(allProps);
    const result = safeParse(PulsatingButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PulsatingButtonProps;
  });
</script>

<div data-slot="pulsating-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
