<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DividerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DividerProps = v.InferOutput<typeof DividerPropsSchema>;
</script>

<script lang="ts">
  /**
   * Divider — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Divider />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DividerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DividerProps = $derived.by(() => {
    const rawProps: DividerProps = stripSvelteProps(allProps);
    const result = safeParse(DividerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DividerProps;
  });
</script>

<div data-slot="divider" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
