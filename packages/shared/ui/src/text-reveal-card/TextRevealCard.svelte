<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TextRevealCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TextRevealCardProps = v.InferOutput<typeof TextRevealCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * TextRevealCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TextRevealCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TextRevealCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TextRevealCardProps = $derived.by(() => {
    const rawProps: TextRevealCardProps = stripSvelteProps(allProps);
    const result = safeParse(TextRevealCardPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TextRevealCardProps;
  });
</script>

<div data-slot="text-reveal-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
