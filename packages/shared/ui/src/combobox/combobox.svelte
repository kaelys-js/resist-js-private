<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ComboboxPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Combobox. */
  export type ComboboxProps = v.InferOutput<typeof ComboboxPropsSchema>;
</script>

<script lang="ts">
  /**
   * Combobox — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Combobox />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ComboboxProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ComboboxProps = $derived.by(() => {
    const rawProps: ComboboxProps = stripSvelteProps(allProps);
    const result = safeParse(ComboboxPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ComboboxProps;
  });
</script>

<div data-slot="combobox" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
