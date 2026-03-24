<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DiffPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DiffProps = v.InferOutput<typeof DiffPropsSchema>;
</script>

<script lang="ts">
  /**
   * Diff — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Diff />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DiffProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DiffProps = $derived.by(() => {
    const rawProps: DiffProps = stripSvelteProps(allProps);
    const result = safeParse(DiffPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DiffProps;
  });
</script>

<div data-slot="diff" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
