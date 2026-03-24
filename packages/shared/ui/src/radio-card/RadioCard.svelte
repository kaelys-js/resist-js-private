<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RadioCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type RadioCardProps = v.InferOutput<typeof RadioCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * RadioCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RadioCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RadioCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RadioCardProps = $derived.by(() => {
    const rawProps: RadioCardProps = stripSvelteProps(allProps);
    const result = safeParse(RadioCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RadioCardProps;
  });
</script>

<div data-slot="radio-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
