<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ListboxPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ListboxProps = v.InferOutput<typeof ListboxPropsSchema>;
</script>

<script lang="ts">
  /**
   * Listbox — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Listbox />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ListboxProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ListboxProps = $derived.by(() => {
    const rawProps: ListboxProps = stripSvelteProps(allProps);
    const result = safeParse(ListboxPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ListboxProps;
  });
</script>

<div data-slot="listbox" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
