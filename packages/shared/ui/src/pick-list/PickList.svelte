<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PickListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PickListProps = v.InferOutput<typeof PickListPropsSchema>;
</script>

<script lang="ts">
  /**
   * PickList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PickList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PickListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PickListProps = $derived.by(() => {
    const rawProps: PickListProps = stripSvelteProps(allProps);
    const result = safeParse(PickListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PickListProps;
  });
</script>

<div data-slot="pick-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
