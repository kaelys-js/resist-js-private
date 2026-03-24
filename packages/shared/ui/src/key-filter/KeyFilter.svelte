<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const KeyFilterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type KeyFilterProps = v.InferOutput<typeof KeyFilterPropsSchema>;
</script>

<script lang="ts">
  /**
   * KeyFilter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <KeyFilter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = KeyFilterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: KeyFilterProps = $derived.by(() => {
    const rawProps: KeyFilterProps = stripSvelteProps(allProps);
    const result = safeParse(KeyFilterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as KeyFilterProps;
  });
</script>

<div data-slot="key-filter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
