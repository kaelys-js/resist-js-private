<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ListProps = v.InferOutput<typeof ListPropsSchema>;
</script>

<script lang="ts">
  /**
   * List — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <List />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ListProps = $derived.by(() => {
    const rawProps: ListProps = stripSvelteProps(allProps);
    const result = safeParse(ListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ListProps;
  });
</script>

<div data-slot="list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
