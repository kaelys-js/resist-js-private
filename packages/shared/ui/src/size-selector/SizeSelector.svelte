<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SizeSelectorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SizeSelector. */
  export type SizeSelectorProps = v.InferOutput<typeof SizeSelectorPropsSchema>;
</script>

<script lang="ts">
  /**
   * SizeSelector — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SizeSelector />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SizeSelectorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SizeSelectorProps = $derived.by(() => {
    const rawProps: SizeSelectorProps = stripSvelteProps(allProps);
    const result = safeParse(SizeSelectorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SizeSelectorProps;
  });
</script>

<div data-slot="size-selector" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
