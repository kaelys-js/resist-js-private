<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SplitButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SplitButton. */
  export type SplitButtonProps = v.InferOutput<typeof SplitButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * SplitButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SplitButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SplitButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SplitButtonProps = $derived.by(() => {
    const rawProps: SplitButtonProps = stripSvelteProps(allProps);
    const result = safeParse(SplitButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SplitButtonProps;
  });
</script>

<div data-slot="split-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
