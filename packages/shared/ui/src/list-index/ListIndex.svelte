<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ListIndexPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ListIndexProps = v.InferOutput<typeof ListIndexPropsSchema>;
</script>

<script lang="ts">
  /**
   * ListIndex — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ListIndex />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ListIndexProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ListIndexProps = $derived.by(() => {
    const rawProps: ListIndexProps = stripSvelteProps(allProps);
    const result = safeParse(ListIndexPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ListIndexProps;
  });
</script>

<div data-slot="list-index" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
