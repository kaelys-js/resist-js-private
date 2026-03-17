<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ConfettiPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ConfettiProps = v.InferOutput<typeof ConfettiPropsSchema>;
</script>

<script lang="ts">
  /**
   * Confetti — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Confetti />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ConfettiProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ConfettiProps = $derived.by(() => {
    const rawProps: ConfettiProps = stripSvelteProps(allProps);
    const result = safeParse(ConfettiPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ConfettiProps;
  });
</script>

<div data-slot="confetti" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
